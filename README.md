# PJ-SELLING-WEBSITE

A full-stack e-commerce demo project showcasing two smart features:

1. **Product Recommendation** — personalised product suggestions for customers
2. **Related Products Display** — similar and complementary products on product detail pages

---

## Tech Stack

| Layer            | Technology         |
| ---------------- | ------------------ |
| Frontend         | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend          | Python, FastAPI    |
| Data Processing  | Polars             |

---

## Project Structure

```
PJ-SELLING-WEBSITE/
├── items.parquet                      # Raw product catalog (29,808 items)
├── transactions-2025-12.parquet       # Raw transaction history (3.7M rows)
├── data/                              # Generated artifacts (from preprocessing)
│   ├── products.parquet
│   ├── item_popularity.parquet
│   ├── customer_history.parquet
│   └── item_cooccurrence.parquet
├── scripts/
│   └── preprocess.py                  # Data preprocessing script
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py                    # FastAPI entry point
│       ├── api/
│       │   └── routes.py              # API endpoints
│       └── services/
│           ├── data_loader.py         # Loads artifacts into memory
│           ├── product_service.py     # Product listing & search
│           ├── recommendation_service.py
│           └── related_products_service.py
├── frontend/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Home (product listing)
│   │   ├── products/[id]/page.tsx     # Product detail + related products
│   │   └── recommendations/page.tsx   # Recommendation page
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── SearchFilter.tsx
│   │   ├── RelatedProducts.tsx
│   │   └── RecommendationList.tsx
│   └── lib/
│       ├── api.ts                     # API client
│       └── types.ts                   # TypeScript types
└── README.md
```

---

## How to Run

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Step 1: Preprocess Data

```bash
cd PJ-SELLING-WEBSITE
pip install polars
python scripts/preprocess.py
```

This generates `data/*.parquet` files used by the backend.

### Step 2: Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**.  
API docs at **http://localhost:8000/docs**.

### Step 3: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**.

---

## API Endpoints

| Method | Endpoint                          | Description                                |
| ------ | --------------------------------- | ------------------------------------------ |
| GET    | `/api/health`                     | Health check                               |
| GET    | `/api/products`                   | List products (pagination, filter, search) |
| GET    | `/api/products/{item_id}`         | Get single product                         |
| GET    | `/api/categories`                 | List all top-level categories              |
| GET    | `/api/brands`                     | List all brands                            |
| GET    | `/api/recommendations/{customer_id}` | Personalised recommendations           |
| GET    | `/api/related/{item_id}`          | Related products for an item               |

### Example Requests

```bash
# List products (page 1, 20 per page)
curl http://localhost:8000/api/products?page=1&page_size=20

# Filter by category
curl http://localhost:8000/api/products?category=Babycare

# Get a product
curl http://localhost:8000/api/products/0020020000253

# Recommendations for customer 7853616
curl http://localhost:8000/api/recommendations/7853616

# Related products for item 0020020000253
curl http://localhost:8000/api/related/0020020000253
```

---

## How Recommendation Works

### Algorithm: Co-occurrence Collaborative Filtering

1. **Look up** the customer's purchase history (items they have bought).
2. For each purchased item, **query the co-occurrence table** to find items
   frequently bought together with it by other customers.
3. **Aggregate** co-occurrence scores across all purchased items.
4. **Remove** items the customer already owns.
5. **Rank** by total score and return the top N results.

### Cold-Start Handling

If the customer has no purchase history (or no co-occurrence data exists for
their purchases), the system falls back to **globally popular products** ranked
by total purchase count.

### Response Format

The API response includes a `strategy` field:
- `"personalized"` — co-occurrence-based recommendations
- `"popular"` — popularity fallback

---

## How Related Products Works

### Algorithm: Behavioral + Metadata Hybrid

Related products combine two signals:

#### 1. Behavioral Signal (weight = 0.6)

Uses the co-occurrence table to find items frequently co-purchased with the
target item. Scores are normalised to [0, 1] by dividing by the max
co-occurrence count for that item.

This captures **complementary products** — e.g. baby formula → bottles.

#### 2. Metadata Similarity (weight = 0.4)

Computes a similarity score from the product catalog:

| Match                  | Score |
| ---------------------- | ----- |
| Same `category_l1`    | 0.25  |
| Same `category_l2`    | +0.25 |
| Same `category_l3`    | +0.25 |
| Same `brand`          | +0.25 |

This captures **similar products** within the same category hierarchy.

#### Final Score

```
relation_score = 0.6 × behavioral_score + 0.4 × metadata_score
```

When no behavioral data exists for an item, only metadata similarity is used
(strategy = `"metadata_only"`).

---

## Dataset Details

### items.parquet — Product Catalog

| Field          | Type    | Description                     |
| -------------- | ------- | ------------------------------- |
| item_id        | string  | Unique product identifier       |
| price          | decimal | Product price (VND)             |
| category_l1    | string  | Top-level category (15 values)  |
| category_l2    | string  | Second-level category           |
| category_l3    | string  | Third-level category            |
| category       | string  | Detailed category name          |
| brand          | string  | Product brand                   |
| manufacturer   | string  | Product manufacturer            |
| sale_status    | int     | 0 = normal, 1 = on sale         |

29,808 products. Vietnamese baby/children's products.

### transactions-2025-12.parquet — Transaction History

| Field          | Type     | Description                    |
| -------------- | -------- | ------------------------------ |
| customer_id    | int      | Customer identifier            |
| item_id        | string   | Product identifier             |
| price          | decimal  | Transaction price (VND)        |
| channel        | string   | Purchase channel (iOS, SPE…)   |
| payment        | string   | Payment method                 |
| updated_date   | datetime | Transaction timestamp          |

3,782,467 rows. 848,641 unique customers. December 2025.

---

## Handling the Lack of order_id

**Problem:** The transaction data does not contain `order_id` or `cart_id`,
making it impossible to directly identify which items were purchased together
in a single order.

**Solution — Pseudo-Session Approximation:**

We define a "session" as all transactions by the same customer on the same
calendar day:

```
session = (customer_id, date)
```

Items within a session are treated as co-purchased. This is a practical
approximation because:

- Most customers have few purchases per month (~4.5 avg).
- Same-day purchases likely belong to the same or related shopping intent.
- The approach is simple, explainable, and produces useful co-occurrence signals.

**Safeguards:**
- Sessions must have ≥ 2 unique items to contribute pairs.
- Sessions with > 50 unique items are excluded (bulk buyers / noise).
- Both item directions (A→B and B→A) are stored for symmetric lookup.

---

## Limitations

- No product images available — UI uses emoji placeholders.
- No product names — `category` field is used as the display name.
- Pseudo-session approximation may group unrelated purchases made on the
  same day.
- Recommendations are based on December 2025 data only — seasonality is
  not accounted for.
- All data is loaded into memory — suitable for demo size but not for
  production scale.

---

## License

Student demo project for CS116 — Python Programming for ML.
