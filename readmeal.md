# Thuật Toán Gợi Ý Sản Phẩm — PJ Selling Website

> **Ngữ cảnh:** Website không yêu cầu đăng nhập → **không có `customer_id`**.
> Thuật toán chính được sử dụng là **Related Products** — gợi ý dựa trên sản phẩm người dùng đang xem.

---

## Tổng Quan

| | Related Products ⭐ | Recommendations |
|---|---|---|
| **Input** | `item_id` (SP đang xem) | `customer_id` (cần đăng nhập) |
| **Khi nào dùng** | Luôn — chỉ cần người dùng click vào 1 SP | Chỉ khi biết khách hàng là ai |
| **Không cần đăng nhập?** | ✅ Hoạt động tốt | ❌ Rơi vào cold-start (chỉ trả SP phổ biến) |
| **Thuật toán** | Hybrid: Behavioral + Metadata | Co-occurrence Collaborative Filtering |

→ Trong hệ thống không có đăng nhập, **Related Products là thuật toán gợi ý chính**, vì nó tận dụng tín hiệu duy nhất: **sản phẩm người dùng đang quan tâm**.

---

---

# PHẦN 1: RELATED PRODUCTS (THUẬT TOÁN CHÍNH)

> Gợi ý sản phẩm liên quan khi người dùng xem chi tiết một sản phẩm.
> Không cần biết người dùng là ai — chỉ cần biết họ đang xem sản phẩm nào.

---

## Slide 1.1 — Bài toán & Ý tưởng

**Bài toán:** Người dùng đang xem sản phẩm X → gợi ý N sản phẩm liên quan nhất.

**Tại sao phù hợp khi không có đăng nhập?**
- Không cần `customer_id` hay lịch sử mua hàng.
- Hành động **click xem sản phẩm** = tín hiệu duy nhất về sở thích → thuật toán khai thác trực tiếp tín hiệu này.

**Ý tưởng — Kết hợp 2 loại tín hiệu:**

| Tín hiệu | Trọng số | Phát hiện gì? |
|-----------|:--------:|---------------|
| **Behavioral** (Co-occurrence) | **0.6** | SP **bổ trợ** — hay được mua cùng nhau |
| **Metadata** (Category + Brand) | **0.4** | SP **tương tự** — cùng danh mục/thương hiệu |

→ Kết quả bao gồm cả sản phẩm **tương tự** (cùng loại) lẫn **bổ trợ** (hay mua kèm).

---

## Slide 1.2 — Dữ liệu nền: Bảng Co-occurrence

**Vấn đề:** Dữ liệu giao dịch **không có `order_id` hay `cart_id`** → không biết SP nào được mua cùng nhau.

**Giải pháp — Pseudo-Session:**
- Nhóm giao dịch theo `(customer_id, ngày mua)`.
- Cùng 1 khách mua trong cùng 1 ngày → coi như **một phiên mua sắm**.
- Chỉ giữ session có **2 – 50 SP unique** (lọc nhiễu).

**Xây dựng bảng co-occurrence:**

```
Với mỗi session:
    Lấy tất cả cặp (A, B) từ tập SP     ← C(n, 2) cặp
    co_count[(A, B)] += 1
    co_count[(B, A)] += 1                 ← lưu hai chiều
```

**Output:** Bảng `item_cooccurrence.parquet`

| item_a | item_b | co_count |
|--------|--------|----------|
| SP001  | SP002  | 45       |
| SP002  | SP001  | 45       |
| SP001  | SP003  | 12       |

→ `co_count` = số phiên mà hai SP cùng xuất hiện (được mua cùng nhau).

---

## Slide 1.3 — Behavioral Score (Điểm hành vi)

**Mục đích:** Tìm sản phẩm **bổ trợ** — thường được mua cùng với SP đang xem.

**Công thức:**

```
behavioral_score(Y) = co_count(X, Y) / max_co_count(X)
```

- `co_count(X, Y)` = số phiên X và Y cùng xuất hiện.
- `max_co_count(X)` = giá trị co-occurrence lớn nhất của X → dùng chuẩn hóa về [0, 1].

**Ví dụ** (SP đang xem: Máy hâm sữa):

| Ứng viên Y | co_count | max | behavioral_score |
|------------|:--------:|:---:|:----------------:|
| Bình sữa  | 80       | 80  | **1.00**         |
| Núm ti     | 60       | 80  | **0.75**         |
| Tã giấy   | 20       | 80  | **0.25**         |

→ Bình sữa được mua chung với Máy hâm sữa nhiều nhất → điểm cao nhất.

---

## Slide 1.4 — Metadata Score (Điểm thuộc tính)

**Mục đích:** Tìm sản phẩm **tương tự** — cùng danh mục hoặc thương hiệu.

**Công thức:**

```
metadata_score(Y) =
    0.25 × match(category_l1)    // Danh mục cấp 1
  + 0.25 × match(category_l2)    // Danh mục cấp 2
  + 0.25 × match(category_l3)    // Danh mục cấp 3
  + 0.25 × match(brand)          // Thương hiệu
```

Mỗi `match()` = **1** nếu trùng, **0** nếu khác → `metadata_score ∈ [0, 1]`

**Ví dụ** (SP gốc: Sữa Enfamil — Babycare > Sữa > Sữa bột — Mead Johnson):

| Ứng viên Y | L1 | L2 | L3 | Brand | Score |
|------------|:--:|:--:|:--:|:-----:|:-----:|
| Sữa Enfamil 2 | ✓ | ✓ | ✓ | ✓ | **1.00** |
| Sữa Similac | ✓ | ✓ | ✓ | ✗ | **0.75** |
| Bỉm Huggies | ✓ | ✗ | ✗ | ✗ | **0.25** |
| Đồ chơi Lego | ✗ | ✗ | ✗ | ✗ | **0.00** |

---

## Slide 1.5 — Kết hợp điểm (Hybrid Scoring)

**Công thức cuối cùng:**

```
relation_score(Y) = 0.6 × behavioral_score(Y) + 0.4 × metadata_score(Y)
```

**Tại sao trọng số 0.6 / 0.4?**
- Behavioral (0.6): dữ liệu hành vi thực tế của hàng triệu giao dịch → đáng tin hơn.
- Metadata (0.4): đảm bảo có kết quả ngay cả khi chưa có dữ liệu hành vi.

**Ví dụ so sánh:**

| Ứng viên | Loại | behavioral | metadata | **relation_score** |
|----------|------|:----------:|:--------:|:------------------:|
| SP C — cùng loại, hay mua cùng | Tương tự + Bổ trợ | 0.70 | 0.75 | **0.72** |
| SP A — khác loại nhưng hay mua cùng | Bổ trợ | 0.90 | 0.25 | **0.64** |
| SP B — cùng loại nhưng ít mua cùng | Tương tự | 0.10 | 1.00 | **0.46** |

→ SP C xếp cao nhất vì kết hợp tốt cả hai tín hiệu.

---

## Slide 1.6 — Fallback: Sản phẩm mới chưa có dữ liệu

**Vấn đề:** SP mới chưa có giao dịch → không có co-occurrence.

**Giải pháp — Metadata Only:**

```
Nếu không có behavioral data cho item_id:
    relation_score(Y) = metadata_score(Y)
    strategy = "metadata_only"
```

→ Vẫn gợi ý được SP cùng danh mục / cùng thương hiệu.

---

## Slide 1.7 — Sơ đồ Luồng Related Products

```
Người dùng click xem sản phẩm X
    │
    ▼
Lấy thông tin SP X từ catalog
    │
    ├──► Tra co-occurrence(X, *)
    │         │
    │         ▼
    │    Chuẩn hóa → behavioral_score [0,1]
    │
    ├──► Lọc SP cùng category/brand
    │         │
    │         ▼
    │    Tính matching → metadata_score [0,1]
    │
    ▼
┌──────────────────────────────┐
│     Có dữ liệu behavioral?  │
├──────────┬───────────────────┤
│   Có     │      Không        │
│          │                   │
│ 0.6×B    │  metadata_score   │
│ + 0.4×M  │  (fallback)       │
├──────────┴───────────────────┤
│       relation_score         │
└──────────────────────────────┘
    │
    ▼
Sắp xếp giảm dần → Top N sản phẩm
```

---

---

# PHẦN 2: PRODUCT RECOMMENDATIONS (BỔ SUNG)

> Chỉ hoạt động tốt khi có `customer_id`.
> Trong hệ thống không đăng nhập, phần này chủ yếu để **demo** — người dùng nhập thủ công ID khách hàng.

---

## Slide 2.1 — Ý tưởng

**Input:** `customer_id` → tổng hợp lịch sử mua hàng → gợi ý SP mới.

**So sánh với Related Products:**

| | Related Products | Recommendations |
|---|---|---|
| Biết người dùng? | ❌ Không | ✅ Có (qua customer_id) |
| Tín hiệu | SP đang xem | Toàn bộ SP đã mua |
| Kết quả | Giống nhau cho mọi người xem cùng SP | Khác nhau cho mỗi khách hàng |

---

## Slide 2.2 — Thuật toán cá nhân hóa

```
1. Lấy purchased_items = [X₁, X₂, ..., Xₖ] của customer_id

2. Với mỗi Xᵢ, tra bảng co-occurrence:
   → Tìm tất cả SP Y mà co_count(Xᵢ, Y) > 0

3. Tổng hợp:
   score(Y) = Σ co_count(Xᵢ, Y)   ∀ Xᵢ ∈ purchased_items

4. Loại SP đã mua, sắp xếp giảm dần, lấy top N
```

**Ý nghĩa:** score(Y) cao = Y hay được mua cùng với **nhiều** SP mà khách đã mua → phù hợp với sở thích tổng thể.

---

## Slide 2.3 — Cold-Start (Không có lịch sử)

**Khi `customer_id` không tồn tại hoặc không nhập:**

```
→ Trả về N sản phẩm phổ biến nhất (Popularity Fallback)
```

| item_id | purchase_count |
|---------|:--------------:|
| SP042   | 5,230          |
| SP018   | 4,891          |

→ Đây là lý do khi không có đăng nhập, Recommendations **kém hiệu quả hơn** Related Products.
Nó chỉ trả về "SP bán chạy" — **không liên quan** đến sở thích hiện tại của người dùng.

---

## Slide 2.4 — Sơ đồ Luồng Recommendation

```
customer_id
    │
    ├── Có lịch sử ──► Co-occurrence ──► Tổng hợp score
    │                                        │
    │                               Loại SP đã mua
    │                                        │
    │                               Lấy top N
    │                               (strategy: "personalized")
    │
    └── Không có / không nhập
                │
                ▼
        Top N SP phổ biến nhất
        (strategy: "popular")   ← kém hiệu quả
```

---

---

# PHỤ LỤC: Tiền Xử Lý Dữ Liệu

---

## Slide A — Pipeline

**Input:** 2 file parquet gốc từ `raw_data/`

| File | Nội dung |
|------|----------|
| `items.parquet` | Catalog sản phẩm (~29,800 SP) |
| `transactions-2025-12.parquet` | Lịch sử giao dịch (~3.7M dòng) |

**Bước lọc:** Loại bỏ SP ngừng kinh doanh (`sale_status = 0`) + giao dịch liên quan.

**Output:** 4 artifact phục vụ API backend:

| Artifact | Mô tả | Dùng cho |
|----------|--------|----------|
| `products.parquet` | Catalog đã lọc | Hiển thị SP |
| `item_popularity.parquet` | Lượt mua / SP | Cold-start fallback |
| `customer_history.parquet` | DS SP đã mua / KH | Recommendation |
| `item_cooccurrence.parquet` | Đồng xuất hiện item↔item | **Related + Recommendation** |

---

## Slide B — Sơ đồ Tổng thể

```
┌──────────────────────────────┐
│         RAW DATA             │
│  items.parquet               │
│  transactions.parquet        │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│       PREPROCESSING          │
│  • Lọc SP ngừng kinh doanh   │
│  • Tạo pseudo-sessions       │
│  • Tính co-occurrence        │
│  • Tính popularity           │
│  • Tổng hợp lịch sử KH      │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│      PROCESSED DATA          │
└───────────┬──────────────────┘
            │
    ┌───────┴───────┐
    ▼               ▼
┌──────────┐  ┌───────────┐
│ Related  │  │  Recommend │
│ Products │  │  Service   │
│ ⭐ CHÍNH │  │  (bổ sung) │
│          │  │            │
│ Hybrid:  │  │ Co-occ +   │
│ B + M    │  │ Popular    │
│          │  │            │
│ Không cần│  │ Cần        │
│ đăng nhập│  │ customer_id│
└──────────┘  └────────────┘
```
