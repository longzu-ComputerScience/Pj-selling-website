export interface Product {
  item_id: string;
  price: number;
  category_l1: string;
  category_l2: string;
  category_l3: string;
  category: string;
  brand: string;
  manufacturer: string;
  sale_status: number;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
}

export interface RecommendationResponse {
  customer_id: number;
  recommendations: Product[];
  strategy: string;
}

export interface RelatedProductsResponse {
  item_id: string;
  related: (Product & { relation_score?: number })[];
  strategy: string;
}
