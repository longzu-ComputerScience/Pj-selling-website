"""API Routes for PJ-SELLING-WEBSITE."""

from fastapi import APIRouter, Query, HTTPException
from ..services import product_service, recommendation_service, related_products_service

router = APIRouter()


@router.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}


@router.get("/products")
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = Query(None),
    brand: str | None = Query(None),
    search: str | None = Query(None),
):
    """List products with pagination and optional filters."""
    return product_service.list_products(
        page=page,
        page_size=page_size,
        category=category,
        brand=brand,
        search=search,
    )


@router.get("/categories")
def get_categories():
    """Get all unique top-level categories."""
    return product_service.get_categories()


@router.get("/brands")
def get_brands():
    """Get all unique brands."""
    return product_service.get_brands()


@router.get("/products/{item_id}")
def get_product(item_id: str):
    """Get a single product by item_id."""
    product = product_service.get_product(item_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/recommendations/{customer_id}")
def get_recommendations(
    customer_id: int,
    n: int = Query(20, ge=1, le=100),
):
    """
    Get personalized product recommendations for a customer.

    Uses co-occurrence-based collaborative filtering.
    Falls back to popular products for unknown customers (cold-start).
    """
    return recommendation_service.get_recommendations(customer_id, n=n)


@router.get("/related/{item_id}")
def get_related_products(
    item_id: str,
    n: int = Query(20, ge=1, le=100),
):
    """
    Get related products for a given item.

    Combines behavioral co-purchase signals with metadata similarity
    to surface both similar and complementary products.
    """
    return related_products_service.get_related_products(item_id, n=n)
