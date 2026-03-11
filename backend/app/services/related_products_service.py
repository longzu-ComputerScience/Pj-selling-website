"""
Related Products Service
========================

Returns related products for a given item_id, combining:

1. **Behavioral signals** (weight = 0.6):
   Normalised co-occurrence count from the precomputed co-purchase table.
   This captures *complementary* products — items frequently bought
   together by the same customers (e.g. coffee ↔ coffee machine).

2. **Metadata similarity** (weight = 0.4):
   Category and brand matching from the product catalog.
   Scoring breakdown (max 1.0):
     • Same category_l1  → 0.25
     • Same category_l2  → +0.25
     • Same category_l3  → +0.25
     • Same brand         → +0.25
   This captures *similar* products within the same product hierarchy.

The weighted combination surfaces both similar AND complementary products.
When no behavioral data exists for an item, only metadata similarity is used.
"""

import polars as pl
from .data_loader import get_data_store

BEHAVIORAL_WEIGHT = 0.6
METADATA_WEIGHT = 0.4


def get_related_products(item_id: str, n: int = 20) -> dict:
    """
    Return related products for an item.

    Response keys:
        item_id  – the input item id
        related  – list of product dicts (includes relation_score)
        strategy – "behavioral+metadata" | "metadata_only" | "not_found"
    """
    store = get_data_store()
    product = store.get_product(item_id)

    if product is None:
        return {"item_id": item_id, "related": [], "strategy": "not_found"}

    # ── 1. Behavioral candidates (co-occurrence) ────────────────────
    behavioral = (
        store.cooccurrence
        .filter(pl.col("item_a") == item_id)
        .select(
            pl.col("item_b").alias("item_id"),
            pl.col("co_count"),
        )
    )
    has_behavioral = behavioral.height > 0

    if has_behavioral:
        max_count = behavioral["co_count"].max()
        behavioral = behavioral.with_columns(
            (pl.col("co_count").cast(pl.Float64) / max_count).alias("behavioral_score")
        ).select("item_id", "behavioral_score")

    # ── 2. Metadata candidates (same category or brand) ─────────────
    metadata_candidates = store.products.filter(
        (pl.col("item_id") != item_id)
        & (
            (pl.col("category_l1") == product["category_l1"])
            | (pl.col("brand") == product["brand"])
        )
    )

    metadata_scored = metadata_candidates.select(
        "item_id",
        (
            (pl.col("category_l1") == product["category_l1"]).cast(pl.Float64) * 0.25
            + (pl.col("category_l2") == product["category_l2"]).cast(pl.Float64) * 0.25
            + (pl.col("category_l3") == product["category_l3"]).cast(pl.Float64) * 0.25
            + (pl.col("brand") == product["brand"]).cast(pl.Float64) * 0.25
        ).alias("metadata_score"),
    )

    # ── 3. Combine scores ───────────────────────────────────────────
    if has_behavioral:
        # Collect all unique candidate item_ids from both sources
        all_ids = pl.concat([
            metadata_scored.select("item_id"),
            behavioral.select("item_id"),
        ]).unique()

        combined = (
            all_ids
            .join(metadata_scored, on="item_id", how="left")
            .join(behavioral, on="item_id", how="left")
            .with_columns(
                pl.col("behavioral_score").fill_null(0.0),
                pl.col("metadata_score").fill_null(0.0),
            )
            .with_columns(
                (
                    pl.col("behavioral_score") * BEHAVIORAL_WEIGHT
                    + pl.col("metadata_score") * METADATA_WEIGHT
                ).alias("relation_score")
            )
        )
        strategy = "behavioral+metadata"
    else:
        combined = metadata_scored.rename({"metadata_score": "relation_score"})
        strategy = "metadata_only"

    # ── 4. Top N with full product details ──────────────────────────
    top_related = (
        combined
        .sort("relation_score", descending=True)
        .head(n)
        .select("item_id", "relation_score")
    )

    result = (
        top_related
        .join(store.products, on="item_id", how="inner")
        .sort("relation_score", descending=True)
    )

    return {
        "item_id": item_id,
        "related": result.to_dicts(),
        "strategy": strategy,
    }
