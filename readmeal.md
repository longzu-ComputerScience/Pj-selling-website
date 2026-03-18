# Thuật Toán Gợi Ý Sản Phẩm — PJ Selling Website

> **Ngữ cảnh:** Website không yêu cầu đăng nhập → **không có `customer_id`**.
> Thuật toán chính được sử dụng là **Related Products** — gợi ý dựa trên sản phẩm người dùng đang xem.

---

## Tổng Quan

| | Related Products ⭐ | Recommendations |
|---|---|---|
| **Input** | `item_id` (SP đang xem) | `item_id` (SP đang xem) |
| **Khi nào dùng** | Luôn — mọi sản phẩm đều chạy qua bước này | Chỉ bổ sung khi SP thuộc nhóm `Tã` |
| **Không cần đăng nhập?** | ✅ Hoạt động tốt | ✅ Hoạt động tốt |
| **Thuật toán** | Co-buy + lọc category tương tự | Solution 1 + upsale theo `size_rank` |

→ Trong hệ thống không có đăng nhập, **Solution 1 là tầng gợi ý nền cho mọi sản phẩm**.  
→ **Solution 2 không thay thế Solution 1** mà chỉ rerank thêm cho nhóm `Tã`.

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

> Dùng cùng `item_id` như Related Products.
> Chỉ áp dụng thêm khi sản phẩm đang xem thuộc nhóm `Tã`.

---

## Slide 2.1 — Ý tưởng

**Input:** `item_id` của sản phẩm đang xem.

**So sánh với Related Products:**

| | Related Products | Recommendations |
|---|---|---|
| Input | `item_id` | `item_id` |
| Tín hiệu | Co-buy + category tương tự | Kết quả Solution 1 + `size_rank` |
| Kết quả | Top SP liên quan | Top SP liên quan nhưng ưu tiên upsale size |

---

## Slide 2.2 — Thuật toán upsale cho nhóm Tã

```
1. Chạy Solution 1 trước:
   → lấy tập ứng viên co-buy đã lọc category

2. Chỉ giữ ứng viên thuộc nhóm Tã và có size_rank

3. Tính khoảng cách size:
   size_gap(Y) = size_rank(Y) - size_rank(X)
   chỉ giữ size_gap >= 0

4. Tính điểm upsale:
   score_upsale(Y) = size_gap(Y) + 1

5. Tính điểm cuối:
   final_score(Y) = co_count(X, Y) * score_upsale(Y)

6. Sắp xếp giảm dần, lấy top N
```

**Ý nghĩa:** sản phẩm vẫn phải liên quan theo `co_count`, nhưng size lớn hơn sẽ được ưu tiên hơn để phục vụ mục tiêu upsale.

---

## Slide 2.3 — Fallback Logic

**Khi nào không áp dụng được Solution 2?**

```
1. Sản phẩm không thuộc nhóm Tã
2. Không có size_rank
3. Không có ứng viên Tã phù hợp

→ Khi đó trả về nguyên kết quả của Solution 1
```

→ Như vậy, **mọi sản phẩm đều có kết quả nền từ Solution 1**, còn Solution 2 chỉ là lớp cộng thêm cho `Tã`.

---

## Slide 2.4 — Sơ đồ Luồng Recommendation

```
item_id
    │
    ├── Solution 1:
    │   co-buy + lọc category
    │        │
    │        ├── Không phải Tã ──► trả kết quả Solution 1
    │        │
    │        └── Là Tã
    │             │
    │             ▼
    │      Solution 2:
    │      rerank theo size_rank
    │             │
    │             ├── Có ứng viên hợp lệ ──► trả kết quả rerank
    │             └── Không có ───────────► fallback Solution 1
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

**Output:** 2 artifact phục vụ API backend:

| Artifact | Mô tả | Dùng cho |
|----------|--------|----------|
| `products.parquet` | Catalog đã lọc + `raw_size`, `normalized_size`, `size_rank`, `is_diaper` | **Solution 1 + Solution 2** |
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
│  • Chuẩn hóa size cho Tã     │
│  • Tạo pseudo-sessions       │
│  • Tính co-occurrence        │
│  • Lưu products metadata     │
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
│ Solution │  │ Solution  │
│    1     │  │    2      │
│ ⭐ NỀN   │  │ (bổ sung)  │
│          │  │           │
│ Co-buy + │  │ S1 +      │
│ category │  │ size_rank │
│          │  │           │
│ Mọi SP   │  │ Chỉ cho Tã│
└──────────┘  └────────────┘
```
