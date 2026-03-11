"use client";

import { useState } from "react";

interface SearchFilterProps {
  categories: string[];
  onFilterChange: (filters: { search: string; category: string }) => void;
}

export default function SearchFilter({
  categories,
  onFilterChange,
}: SearchFilterProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const triggerSearch = () => {
    onFilterChange({ search, category });
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    onFilterChange({ search, category: value });
  };

  const handleClear = () => {
    setSearch("");
    setCategory("");
    onFilterChange({ search: "", category: "" });
  };

  const hasFilters = search !== "" || category !== "";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by category, brand, or item ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 focus:bg-white text-sm transition-all placeholder:text-gray-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 text-sm transition-all cursor-pointer sm:w-52"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          onClick={triggerSearch}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-semibold shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          Search
        </button>
        {hasFilters && (
          <button
            onClick={handleClear}
            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
