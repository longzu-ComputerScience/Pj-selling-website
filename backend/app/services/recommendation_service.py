"""
Recommendation Service
======================

Provides personalised product recommendations for a given customer_id.

Algorithm (Personalised):
    1. Retrieve the customer's purchase history (list of item_ids).
    2. For each purchased item, look up co-occurring items from the
       precomputed co-occurrence table (built from pseudo-sessions).
    3. Aggregate co-occurrence scores across all purchased items.
    4. Remove items the customer already bought.
    5. Rank by aggregated score and return top N with full product details.

Cold-start fallback (customer not found or no co-occurrence data):
    Return the globally most popular products (by purchase count).
"""

import polars as pl
from .data_loader import get_data_store


def get_recommendations(customer_id: int, n: int = 20) -> dict:
    """
    Return product recommendations for a customer.

    Response keys:
        customer_id  – the input customer id
        recommendations – list of product dicts
        strategy – "personalized" | "popular"
    """
    store = get_data_store()
    purchased_items = store.get_customer_items(customer_id)

    if not purchased_items:
        # Cold-start: customer unknown → popular products
        return _popular_recommendations(customer_id, n)

    return _personalized_recommendations(customer_id, purchased_items, n)


# ── private helpers ──────────────────────────────────────────────────


def _personalized_recommendations(
    customer_id: int, purchased_items: list[str], n: int
) -> dict:
    """Co-occurrence based recommendations, excluding already-purchased items."""
    store = get_data_store()
    purchased_set = set(purchased_items)

    # Find items co-occurring with any of the customer's purchases,
    # excluding items the customer already owns.
    candidates = (
        store.cooccurrence
        .filter(pl.col("item_a").is_in(purchased_items))
        .filter(~pl.col("item_b").is_in(list(purchased_set)))
        .group_by("item_b")
        .agg(pl.col("co_count").sum().alias("score"))
        .sort("score", descending=True)
        .head(n)
    )

    if candidates.height == 0:
        return _popular_recommendations(customer_id, n, exclude=purchased_set)

    # Join with product details
    recommendations = (
        candidates
        .join(store.products, left_on="item_b", right_on="item_id", how="inner")
        .drop("item_b")
        .sort("score", descending=True)
        .head(n)
    )

    # Pad with popular items if not enough results
    if recommendations.height < n:
        remaining = n - recommendations.height
        existing_ids = set(recommendations["item_id"].to_list()) | purchased_set
        popular_pad = _get_popular_products(remaining, exclude=existing_ids)
        if popular_pad.height > 0:
            popular_pad = popular_pad.with_columns(pl.lit(0).alias("score"))
            recommendations = pl.concat(
                [recommendations, popular_pad], how="diagonal"
            )

    result_products = recommendations.drop("score", strict=False).to_dicts()

    return {
        "customer_id": customer_id,
        "recommendations": result_products,
        "strategy": "personalized",
    }


def _popular_recommendations(
    customer_id: int, n: int, exclude: set[str] | None = None
) -> dict:
    """Fallback: recommend globally popular products."""
    products = _get_popular_products(n, exclude=exclude)
    return {
        "customer_id": customer_id,
        "recommendations": products.to_dicts(),
        "strategy": "popular",
    }


def _get_popular_products(
    n: int, exclude: set[str] | None = None
) -> pl.DataFrame:
    """Return top-N popular products as a DataFrame with full details."""
    store = get_data_store()
    popular = store.popularity

    if exclude:
        popular = popular.filter(~pl.col("item_id").is_in(list(exclude)))

    top_ids = popular.head(n).select("item_id")
    return top_ids.join(store.products, on="item_id", how="inner")
