import Link from "next/link";
import { Product } from "@/lib/types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.item_id}`}>
      <div className="relative bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-4 h-full flex flex-col">
        {/* Placeholder image */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg h-40 flex items-center justify-center mb-3">
          <span className="text-4xl opacity-60">🛍️</span>
        </div>

        <div className="flex-1 flex flex-col">
          <p className="text-xs text-blue-600 font-medium mb-1 truncate">
            {product.category_l1}
          </p>
          <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2 leading-tight">
            {product.category}
          </h3>
          <p className="text-xs text-gray-500 mb-2 truncate">{product.brand}</p>
          <div className="mt-auto">
            <p className="text-base font-bold text-red-600">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>

        {product.sale_status === 1 && (
          <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            On Sale
          </span>
        )}
      </div>
    </Link>
  );
}
