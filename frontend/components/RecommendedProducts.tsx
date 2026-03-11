"use client";

import { useState, useEffect } from "react";
import { Product } from "@/lib/types";
import { getRecommendations } from "@/lib/api";
import HorizontalProductRow from "./HorizontalProductRow";

/**
 * Displays recommended products on the product detail page.
 *
 * Since recommendations require a customer_id and we don't have a login system,
 * we use a demo fallback: call the API with customer_id=0 which triggers the
 * cold-start path and returns globally popular products. Users can optionally
 * enter their own customer_id via a small input.
 */

const DEMO_CUSTOMER_ID = 0;

export default function RecommendedProducts({ itemId }: { itemId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [strategy, setStrategy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<number>(DEMO_CUSTOMER_ID);
  const [inputValue, setInputValue] = useState("");

  const fetchRecs = (cid: number) => {
    setLoading(true);
    setError(null);
    getRecommendations(cid, 20)
      .then((data) => {
        // Filter out the current product from recommendations
        const filtered = data.recommendations.filter(
          (p) => p.item_id !== itemId
        );
        setProducts(filtered);
        setStrategy(data.strategy);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecs(customerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, customerId]);

  const handleCustomerSubmit = () => {
    const id = parseInt(inputValue, 10);
    if (!isNaN(id)) {
      setCustomerId(id);
    }
  };

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
        Failed to load recommendations.
      </p>
    );
  }

  return (
    <div>
      <HorizontalProductRow
        products={products}
        title="Recommended Products"
        badge={strategy}
      />
      {/* Optional: let user enter a customer_id for personalised results */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-400">Try personalised:</span>
        <input
          type="text"
          placeholder="Customer ID"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCustomerSubmit()}
          className="w-32 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          onClick={handleCustomerSubmit}
          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Go
        </button>
      </div>
    </div>
  );
}
