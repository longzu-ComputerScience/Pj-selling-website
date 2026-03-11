"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Product } from "@/lib/types";
import { getProduct } from "@/lib/api";
import RelatedProducts from "@/components/RelatedProducts";
import RecommendedProducts from "@/components/RecommendedProducts";

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

export default function ProductDetailPage() {
  const params = useParams();
  const itemId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getProduct(itemId)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-200 rounded-lg h-80" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">
          Product not found or failed to load.
        </p>
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back to products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline mb-6 inline-block"
      >
        &larr; Back to products
      </Link>

      {/* ── Product Detail (top section) ─────────────────────── */}
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl h-80 flex items-center justify-center">
          <span className="text-7xl opacity-50">🛍️</span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {product.category_l1}
            </span>
            {product.sale_status === 1 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                On Sale
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {product.category}
          </h1>

          <p className="text-3xl font-bold text-red-600 mb-6">
            {formatPrice(product.price)}
          </p>

          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-700">Brand:</span>{" "}
              {product.brand}
            </p>
            <p>
              <span className="font-medium text-gray-700">Manufacturer:</span>{" "}
              {product.manufacturer}
            </p>
            <p>
              <span className="font-medium text-gray-700">Category:</span>{" "}
              {product.category_l1} &rarr; {product.category_l2} &rarr;{" "}
              {product.category_l3}
            </p>
            <p>
              <span className="font-medium text-gray-700">Item ID:</span>{" "}
              <code className="bg-gray-100 px-1 rounded text-xs">
                {product.item_id}
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* ── Section A: Related Products (horizontal scroll) ── */}
      <div className="border-t pt-8 mb-10">
        <RelatedProducts itemId={itemId} />
      </div>

      {/* ── Section B: Recommended Products (horizontal scroll) */}
      <div className="border-t pt-8">
        <RecommendedProducts itemId={itemId} />
      </div>
    </div>
  );
}
