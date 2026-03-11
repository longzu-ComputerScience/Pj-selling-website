import Link from "next/link";
import { Product } from "@/lib/types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

/** Simple hash-based color picker for placeholder backgrounds */
function getCategoryColor(category: string): string {
  const colors = [
    "from-blue-100 to-sky-50",
    "from-violet-100 to-purple-50",
    "from-emerald-100 to-teal-50",
    "from-amber-100 to-yellow-50",
    "from-rose-100 to-pink-50",
    "from-cyan-100 to-blue-50",
    "from-fuchsia-100 to-violet-50",
    "from-lime-100 to-green-50",
  ];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const CATEGORY_ICONS: Record<string, string> = {
  Babycare: "\uD83D\uDC76",
  "Đồ chơi & Sách": "\uD83E\uDDE9",
  "Dinh dưỡng": "\uD83C\uDF7C",
  "Đồ dùng gia đình": "\uD83C\uDFE0",
  "Thời Trang": "\uD83D\uDC55",
};

function getCategoryIcon(category_l1: string): string {
  return CATEGORY_ICONS[category_l1] || "\uD83D\uDED2";
}

export default function ProductCard({ product }: { product: Product }) {
  const bgGradient = getCategoryColor(product.category_l1 || "");
  const icon = getCategoryIcon(product.category_l1);

  return (
    <Link href={`/products/${product.item_id}`} className="group block">
      <div className="relative bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 p-4 h-full flex flex-col overflow-hidden group-hover:-translate-y-0.5">
        {/* Placeholder image area */}
        <div
          className={`bg-gradient-to-br ${bgGradient} rounded-lg h-36 flex items-center justify-center mb-3 relative overflow-hidden`}
        >
          <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
            {icon}
          </span>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <span className="inline-block text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-1.5 w-fit truncate max-w-full">
            {product.category_l1}
          </span>
          <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">
            {product.category}
          </h3>
          <p className="text-xs text-gray-400 mb-3 truncate">{product.brand}</p>
          <div className="mt-auto pt-2 border-t border-gray-50">
            <p className="text-base font-bold text-red-600">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
