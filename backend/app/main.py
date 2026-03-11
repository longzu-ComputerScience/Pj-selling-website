"""FastAPI application entry point for PJ-SELLING-WEBSITE."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router
from .services.data_loader import get_data_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load data into memory on startup."""
    get_data_store()
    yield


app = FastAPI(
    title="PJ-SELLING-WEBSITE API",
    description="E-commerce demo with product recommendations and related products",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: allow frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
