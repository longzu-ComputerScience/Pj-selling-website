"use client";

import { useState, useEffect, useCallback } from "react";
import { Product } from "@/lib/types";
import { getProducts, getCategories } from "@/lib/api";
import ProductGrid from "@/components/ProductGrid";
import SearchFilter from "@/components/SearchFilter";

const PAGE_SIZE = 20;

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="skeleton rounded-lg h-36 mb-3" />
          <div className="skeleton rounded h-3 w-16 mb-2" />
          <div className="skeleton rounded h-4 w-full mb-1" />
          <div className="skeleton rounded h-4 w-3/4 mb-2" />
          <div className="skeleton rounded h-3 w-20 mb-3" />
          <div className="skeleton rounded h-5 w-24 mt-2" />
        </div>
      ))}
    </div>
  );
}

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
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load products. Make sure the backend is running on port 8000."
      );
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

  const handleFilterChange = (newFilters: {
    search: string;
    category: string;
  }) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="animate-fade-in-up">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Products
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Browse our full catalog of products
        </p>
      </div>

      <SearchFilter
        categories={categories}
        onFilterChange={handleFilterChange}
      />

      {/* Error state */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center animate-fade-in-up">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-red-700 font-semibold mb-1">
            Unable to load products
          </p>
          <p className="text-red-500 text-sm mb-4 max-w-md mx-auto">
            {error}
          </p>
          <button
            onClick={fetchProducts}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-all active:scale-[0.98] shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>
        </div>
      ) : loading ? (
        <SkeletonGrid />
      ) : (
        <>
          {/* Results info */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-gray-600">
                {total.toLocaleString()}
              </span>{" "}
              products found
            </p>
            {totalPages > 1 && (
              <p className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </p>
            )}
          </div>

          <ProductGrid products={products} />
        </>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-10 mb-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                    page === pageNum
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
          >
            Next
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
