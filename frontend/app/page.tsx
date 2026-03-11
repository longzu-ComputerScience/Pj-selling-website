"use client";

import { useState, useEffect, useCallback } from "react";
import { Product } from "@/lib/types";
import { getProducts, getCategories } from "@/lib/api";
import ProductGrid from "@/components/ProductGrid";
import SearchFilter from "@/components/SearchFilter";

const PAGE_SIZE = 20;

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategoriesList] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ search: "", category: "" });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProducts({
        page,
        page_size: PAGE_SIZE,
        category: filters.category || undefined,
        search: filters.search || undefined,
      });
      setProducts(data.products);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Failed to load products. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    getCategories().then(setCategoriesList).catch(console.error);
  }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleFilterChange = (newFilters: { search: string; category: string }) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Products</h1>

      <SearchFilter
        categories={categories}
        onFilterChange={handleFilterChange}
      />

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
          <button
            onClick={fetchProducts}
            className="ml-3 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-lg h-72 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {total.toLocaleString()} products found
          </p>
          <ProductGrid products={products} />
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
