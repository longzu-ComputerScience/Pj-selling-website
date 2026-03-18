"use client";

import { useState } from "react";
import { Product } from "@/lib/types";
import { getRecommendations } from "@/lib/api";
import ProductGrid from "./ProductGrid";

export default function RecommendationList() {
  const [itemId, setItemId] = useState("");
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [strategy, setStrategy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const id = itemId.trim();
    if (!id) {
      setError("Please enter a valid item ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const data = await getRecommendations(id);
      setRecommendations(data.recommendations);
      setStrategy(data.strategy);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch recommendations.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Enter Item ID (e.g. 0020010000098)"
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !itemId.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {loading ? "Loading..." : "Get Solution 2"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {searched && !loading && !error && (
        <div>
          {strategy && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-500">Strategy:</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                {strategy}
              </span>
            </div>
          )}
          <ProductGrid
            products={recommendations}
            title={`Solution 2 Recommendations (${recommendations.length} products)`}
          />
        </div>
      )}
    </div>
  );
}
