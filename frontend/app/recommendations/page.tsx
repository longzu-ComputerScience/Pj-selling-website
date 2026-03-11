import RecommendationList from "@/components/RecommendationList";

export default function RecommendationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Product Recommendations
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Enter a customer ID to see personalised product recommendations based on
        purchase history.
      </p>
      <RecommendationList />
    </div>
  );
}
