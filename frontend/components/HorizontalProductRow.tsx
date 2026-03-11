"use client";

import { useRef } from "react";
import { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

interface HorizontalProductRowProps {
  products: Product[];
  title: string;
  badge?: string;
}

export default function HorizontalProductRow({
  products,
  title,
  badge,
}: HorizontalProductRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (products.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-3">{title}</h2>
        <p className="text-gray-400 text-sm py-6">No products to show.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          {badge && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {badge}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 rounded-full border hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Scroll left"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 rounded-full border hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Scroll right"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth scrollbar-hide"
      >
        {products.map((product) => (
          <div key={product.item_id} className="flex-shrink-0 w-48">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
