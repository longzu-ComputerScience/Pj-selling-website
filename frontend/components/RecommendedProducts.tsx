"use client";

import { useState, useEffect } from "react";
import { Product } from "@/lib/types";
import { getRecommendations } from "@/lib/api";
import HorizontalProductRow from "./HorizontalProductRow";

export default function RecommendedProducts({ itemId }: { itemId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [strategy, setStrategy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getRecommendations(itemId, 20)
      .then((data) => {
        const filtered = data.recommendations.filter((p) => p.item_id !== itemId);
        setProducts(filtered);
        setStrategy(data.strategy);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-56 mb-3" />
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48 bg-gray-200 rounded-lg h-60" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-500 text-sm">
        Failed to load Solution 2 recommendations.
      </p>
    );
  }

  return (
    <HorizontalProductRow
      products={products}
      title="Recommended Products (Solution 2)"
      badge={strategy}
    />
  );
}
