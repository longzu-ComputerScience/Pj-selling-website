"""
Data Loader — loads preprocessed parquet artifacts into memory.

Singleton pattern ensures data is loaded only once at startup.
All services read from the shared DataStore instance.
"""

import polars as pl
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"


class DataStore:
    """In-memory data store holding all preprocessed artifacts."""

    def __init__(self):
        print(f"Loading data from {DATA_DIR} ...")

        self.products = pl.read_parquet(DATA_DIR / "products.parquet")
        self.cooccurrence = pl.read_parquet(DATA_DIR / "item_cooccurrence.parquet")
        self.popularity = pl.read_parquet(DATA_DIR / "item_popularity.parquet")
        self.customer_history = pl.read_parquet(DATA_DIR / "customer_history.parquet")

        # Ensure price is Float64 (safe if already cast during preprocessing)
        if self.products.schema.get("price") != pl.Float64:
            self.products = self.products.with_columns(
                pl.col("price").cast(pl.Float64)
            )

        # Build dict-based indexes for O(1) row lookup
        self._product_index: dict[str, int] = {
            val: idx
            for idx, val in enumerate(self.products["item_id"].to_list())
        }
        self._customer_index: dict[int, int] = {
            val: idx
            for idx, val in enumerate(
                self.customer_history["customer_id"].to_list()
            )
        }

        print(f"  Products loaded:      {self.products.height}")
        print(f"  Co-occurrence entries: {self.cooccurrence.height}")
        print(f"  Popularity entries:    {self.popularity.height}")
        print(f"  Customers loaded:      {self.customer_history.height}")
        print("Data loaded successfully.\n")

    def get_product(self, item_id: str) -> dict | None:
        """Return a single product dict by item_id, or None."""
        idx = self._product_index.get(item_id)
        if idx is None:
            return None
        return self.products.row(idx, named=True)

    def get_customer_items(self, customer_id: int) -> list[str] | None:
        """Return list of item_ids purchased by a customer, or None."""
        idx = self._customer_index.get(customer_id)
        if idx is None:
            return None
        return self.customer_history.row(idx, named=True)["purchased_items"]


# Module-level singleton
_store: DataStore | None = None


def get_data_store() -> DataStore:
    """Get or create the singleton DataStore instance."""
    global _store
    if _store is None:
        _store = DataStore()
    return _store
