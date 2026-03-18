import RecommendationList from "@/components/RecommendationList";

export default function RecommendationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Solution 2 Recommendations
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Enter an item ID to get item-based diaper up-sale recommendations
        (co-buy * score_upsale).
      </p>
      <RecommendationList />
    </div>
  );
}
