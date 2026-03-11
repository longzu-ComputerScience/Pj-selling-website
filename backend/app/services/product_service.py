"""Product Service — handles product listing and retrieval."""

import polars as pl
from .data_loader import get_data_store


def list_products(
    page: int = 1,
    page_size: int = 20,
    category: str | None = None,
    brand: str | None = None,
    search: str | None = None,
) -> dict:
    """List products with pagination and optional category/brand/search filters."""
    store = get_data_store()
    df = store.products

    if category:
        df = df.filter(pl.col("category_l1") == category)

    if brand:
        df = df.filter(pl.col("brand") == brand)

    if search:
        search_lower = search.lower()
        df = df.filter(
            pl.col("category").str.to_lowercase().str.contains(search_lower, literal=True)
            | pl.col("brand").str.to_lowercase().str.contains(search_lower, literal=True)
            | pl.col("category_l1").str.to_lowercase().str.contains(search_lower, literal=True)
            | pl.col("category_l2").str.to_lowercase().str.contains(search_lower, literal=True)
            | pl.col("item_id").str.contains(search_lower, literal=True)
        )

    total = df.height
    offset = (page - 1) * page_size
    page_df = df.slice(offset, page_size)

    return {
        "products": page_df.to_dicts(),
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_product(item_id: str) -> dict | None:
    """Get a single product by item_id."""
    return get_data_store().get_product(item_id)


def get_categories() -> list[str]:
    """Get all unique category_l1 values, sorted."""
    store = get_data_store()
    return store.products["category_l1"].unique().sort().to_list()


def get_brands() -> list[str]:
    """Get all unique brand values, sorted."""
    store = get_data_store()
    return store.products["brand"].unique().sort().to_list()
