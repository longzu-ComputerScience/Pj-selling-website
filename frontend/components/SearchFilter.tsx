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

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="flex-1 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by category, brand, or item ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
      <select
        value={category}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className="px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
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
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        Search
      </button>
    </div>
  );
}
