# PJ-SELLING-WEBSITE

A full-stack e-commerce demo project showcasing two item-based features:

1. **Solution 1 (Related Products)** — co-buy + similar category (L3/L2 fallback)
2. **Solution 2 (Recommended Products)** — diaper up-sale using co-buy * score_upsale

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
├── raw_data/
│   ├── items.parquet                  # Raw product catalog (29,808 items)
│   └── transactions-2025-12.parquet   # Raw transaction history (3.7M rows)
├── data/                              # Generated artifacts (from preprocessing)
│   ├── products.parquet               # Product catalog + diaper size metadata
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
│           ├── Solution1.py           # Related products
│           └── Solution2.py           # Recommendation extends Solution1 for diapers
├── frontend/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Home (product listing)
│   │   ├── products/[id]/page.tsx     # Product detail (Solution 1 + Solution 2)
│   │   └── recommendations/page.tsx   # Solution 2 demo page (item-based)
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
| GET    | `/api/related/{item_id}`          | Solution 1 related products for an item |
| GET    | `/api/recommendations/{item_id}`  | Solution 2 recommendations for an item |

### Example Requests

```bash
# List products (page 1, 20 per page)
curl http://localhost:8000/api/products?page=1&page_size=20

# Filter by category
curl http://localhost:8000/api/products?category=Babycare

# Get a product
curl http://localhost:8000/api/products/0020020000253

# Solution 1 related products for item 0020020000253
curl http://localhost:8000/api/related/0020020000253

# Solution 2 recommendations for item 0020010000098
curl http://localhost:8000/api/recommendations/0020010000098
```

---

## Solution 1 — Related Products

Solution 1 follows the notebook-style rule set:

1. Start from **co-buy** candidates for product `X` (items with co-occurrence
   count against `X`).
2. Apply **similar category** filtering:
   - prefer same `category_l3`
   - fallback to same `category_l2` when no `category_l3` matches exist
3. Rank by `co_count` descending.

No brand scoring and no weighted metadata hybrid are used in Solution 1.
If both `category_l3` and `category_l2` produce no matches, the service keeps
the co-buy set (`strategy = "co_buy_only"`) instead of falling back to
`category_l1`.

The endpoint is:
- `GET /api/related/{item_id}`

---

## Solution 2 — Recommended Products

Solution 2 is item-based and used for diaper up-sale on product detail pages.

1. Start from the **Solution 1 candidate set** for product `X`.
2. This means every product first goes through:
   - co-buy lookup
   - `category_l3` filtering when possible
   - `category_l2` fallback otherwise
3. If `X` is diaper (`category_l1 == "Tã"`):
   - keep diaper candidates only
   - keep candidates with `size_rank >= current_size_rank`
   - compute:

```
size_gap = candidate_size_rank - current_size_rank
score_upsale = size_gap + 1
final_score = co_count * score_upsale
```

4. Rank by `final_score` descending, then `co_count` descending.

Fallback behavior:
- If `X` is not diaper, Solution 2 returns the Solution 1 result as-is
  (`strategy = "solution1_only:..."`).
- If diaper size metadata is missing, Solution 2 also falls back to
  Solution 1 (`strategy = "solution1_only:size_unknown+..."`).
- If no diaper candidate survives the size filter, Solution 2 again falls back
  to Solution 1 (`strategy = "solution1_only:no_diaper_candidate+..."`).
- If no `category_l3` and `category_l2` matches are found, Solution 2 keeps
  the co-buy set before diaper/size filters (`strategy` includes `co_buy_only`).

The endpoint is:
- `GET /api/recommendations/{item_id}`

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
| description    | string  | Free-text product description   |
| sale_status    | int     | 0 = normal, 1 = on sale         |
| size           | string  | Raw size text in source data    |

29,808 products. Vietnamese baby/children's products.

Derived fields added in `data/products.parquet` during preprocessing:
- `raw_size`
- `normalized_size` (`NB`, `S`, `M`, `L`, `XL`, `XXL`, `XXXL`)
- `size_rank` (0..6)
- `is_diaper`

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

## Deploying to Vercel (Frontend)

### Option A: Set Root Directory (Recommended)

1. Push code to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. In **Project Settings → General → Root Directory**, set to `frontend`
4. Add environment variable `NEXT_PUBLIC_API_URL` = your backend URL (e.g. `https://your-backend.railway.app/api`)
5. Deploy

### Option B: Deploy from repo root

The `vercel.json` at the repo root is configured to build from the `frontend/` subdirectory. If Option A is not used:

1. Import the repo in Vercel (leave Root Directory as default)
2. Vercel will use `vercel.json` settings automatically
3. Add `NEXT_PUBLIC_API_URL` in **Settings → Environment Variables**
4. Deploy

> **Note:** The backend (FastAPI) must be deployed separately (e.g., Railway, Render, Fly.io). Without a running backend, the frontend will display an error message with a Retry button. Set the `ALLOWED_ORIGIN` env var on the backend to your Vercel domain for CORS.

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
