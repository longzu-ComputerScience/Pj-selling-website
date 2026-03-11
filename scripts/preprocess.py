"""
Preprocessing Script for PJ-SELLING-WEBSITE
============================================

Loads raw parquet files and generates processed data artifacts
for the API backend to serve.

CO-PURCHASE DETECTION STRATEGY (no order_id/cart_id available):
    Since transactions lack order_id or cart_id, we approximate
    "shopping sessions" by grouping transactions by (customer_id, date).
    Transactions by the same customer on the same day are treated as a
    single session. Item pairs within a session are considered co-purchased.
    Sessions with more than 50 unique items are excluded to avoid
    combinatorial explosion from bulk buyers.

Generated artifacts (saved to data/ folder):
    - products.parquet          : cleaned product catalog (price as Float64)
    - item_popularity.parquet   : purchase count per item
    - customer_history.parquet  : per-customer list of purchased item_ids
    - item_cooccurrence.parquet : item-to-item co-occurrence counts (bidirectional)
"""

import polars as pl
from pathlib import Path
from collections import Counter
from itertools import combinations
import time

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
RAW_ITEMS = ROOT / "items.parquet"
RAW_TRANSACTIONS = ROOT / "transactions-2025-12.parquet"


def load_raw_data():
    """Load and clean raw parquet files."""
    print("Loading raw data...")
    items = pl.read_parquet(RAW_ITEMS)
    transactions = pl.read_parquet(RAW_TRANSACTIONS)

    # Cast Decimal to Float64 for easier downstream processing
    items = items.with_columns(pl.col("price").cast(pl.Float64))
    transactions = transactions.with_columns(
        pl.col("price").cast(pl.Float64),
        pl.col("updated_date").cast(pl.Datetime("us")),
    )

    print(f"  Items: {items.height} rows, {items.width} columns")
    print(f"  Transactions: {transactions.height} rows, {transactions.width} columns")
    return items, transactions


def build_products(items: pl.DataFrame):
    """Save cleaned product catalog."""
    print("\nBuilding products catalog...")
    items.write_parquet(DATA_DIR / "products.parquet")
    print(f"  Saved {items.height} products")


def build_item_popularity(transactions: pl.DataFrame):
    """Compute item purchase frequency for popularity-based ranking."""
    print("\nBuilding item popularity...")
    popularity = (
        transactions.group_by("item_id")
        .agg(pl.len().alias("purchase_count"))
        .sort("purchase_count", descending=True)
    )
    popularity.write_parquet(DATA_DIR / "item_popularity.parquet")
    print(f"  {popularity.height} items with purchase data")
    print(f"  Top 5 most popular items:")
    for row in popularity.head(5).to_dicts():
        print(f"    {row['item_id']}: {row['purchase_count']} purchases")


def build_customer_history(transactions: pl.DataFrame):
    """Build per-customer purchase history (unique list of item_ids)."""
    print("\nBuilding customer purchase history...")
    history = (
        transactions.group_by("customer_id")
        .agg(
            pl.col("item_id").unique().alias("purchased_items"),
            pl.len().alias("total_purchases"),
        )
        .sort("total_purchases", descending=True)
    )
    history.write_parquet(DATA_DIR / "customer_history.parquet")
    avg_items = history["purchased_items"].list.len().mean()
    print(f"  {history.height} customers")
    print(f"  Avg unique items per customer: {avg_items:.1f}")


def build_cooccurrence(transactions: pl.DataFrame):
    """
    Build item co-occurrence matrix using pseudo-session approach.

    Strategy:
        1. Group transactions by (customer_id, date) to form pseudo-sessions
        2. Keep sessions with 2-50 unique items
        3. For each session, generate all unique item pairs
        4. Count how often each pair appears across all sessions
        5. Store both directions (A→B and B→A) for easy lookup
    """
    print("\nBuilding co-occurrence matrix...")
    start = time.time()

    # Create pseudo-sessions: same customer + same day
    sessions = (
        transactions.with_columns(
            pl.col("updated_date").dt.date().alias("session_date")
        )
        .group_by(["customer_id", "session_date"])
        .agg(pl.col("item_id").unique().alias("items"))
        .filter(pl.col("items").list.len() >= 2)   # Need at least 2 items for pairs
        .filter(pl.col("items").list.len() <= 50)   # Cap to avoid combinatorial explosion
    )

    n_sessions = sessions.height
    print(f"  Sessions with 2-50 unique items: {n_sessions}")

    # Count co-occurrence pairs using Python Counter
    pair_counts: Counter = Counter()
    session_items_list = sessions["items"].to_list()

    for idx, items_in_session in enumerate(session_items_list):
        if idx % 100000 == 0 and idx > 0:
            print(f"    Processing session {idx}/{n_sessions}...")
        sorted_items = sorted(set(items_in_session))
        for a, b in combinations(sorted_items, 2):
            pair_counts[(a, b)] += 1

    elapsed = time.time() - start
    print(f"  Unique directional pairs: {len(pair_counts)}")
    print(f"  Pair generation time: {elapsed:.1f}s")

    if pair_counts:
        # Store both directions (a→b and b→a) for easy lookup
        items_a, items_b, counts = [], [], []
        for (a, b), count in pair_counts.items():
            items_a.extend([a, b])
            items_b.extend([b, a])
            counts.extend([count, count])

        cooccurrence = (
            pl.DataFrame({
                "item_a": items_a,
                "item_b": items_b,
                "co_count": counts,
            })
            .sort(["item_a", "co_count"], descending=[False, True])
        )
    else:
        cooccurrence = pl.DataFrame({
            "item_a": pl.Series([], dtype=pl.Utf8),
            "item_b": pl.Series([], dtype=pl.Utf8),
            "co_count": pl.Series([], dtype=pl.Int64),
        })

    cooccurrence.write_parquet(DATA_DIR / "item_cooccurrence.parquet")
    print(f"  Total co-occurrence entries (bidirectional): {cooccurrence.height}")


def main():
    DATA_DIR.mkdir(exist_ok=True)

    items, transactions = load_raw_data()
    build_products(items)
    build_item_popularity(transactions)
    build_customer_history(transactions)
    build_cooccurrence(transactions)

    print("\n" + "=" * 50)
    print("Preprocessing complete! Artifacts saved to data/")
    print("=" * 50)


if __name__ == "__main__":
    main()
