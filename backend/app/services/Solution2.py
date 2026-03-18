"""
Solution 2 — Upsale tã (bỉm) dựa trên size kết hợp Co-buy
============================================================

Thuật toán:
    1. **Đầu vào**: item_id của sản phẩm đang xem.
    2. **Lấy tập ứng viên nền từ Solution 1** (co-buy + lọc category).
    3. **Kiểm tra điều kiện áp dụng**:
         - Nếu sản phẩm KHÔNG thuộc danh mục "Tã" → trả nguyên Solution 1.
         - Nếu sản phẩm không có size_rank → trả nguyên Solution 1.
    4. **Chấm điểm upsale cho sản phẩm tã** (chỉ áp dụng khi là Tã):
         a. Lọc ứng viên: chỉ giữ ứng viên thuộc danh mục Tã,
            có size_rank, và size_rank >= size_rank hiện tại.
         b. Tính size_gap = candidate_size_rank − current_size_rank.
         c. score_upsale = size_gap + 1
            (size_gap = 0 → cùng size → score = 1;
             size_gap lớn → size lớn hơn → ưu tiên cao hơn).
         d. final_score = co_count × score_upsale.
    5. **Xếp hạng**: sắp xếp theo final_score giảm dần, rồi co_count
       giảm dần (tie-breaker).
    6. **Fallback**: nếu sau lọc không còn ứng viên tã hợp lệ → trả
       nguyên kết quả Solution 1.

Quy tắc kinh doanh:
    - Mọi sản phẩm đều đi qua Solution 1 trước.
    - Chỉ sản phẩm thuộc category_l1 == "Tã" mới có thêm Solution 2.
    - Sản phẩm không phải Tã → KHÔNG gọi Solution 2, chỉ dùng Solution 1.
"""

import polars as pl
from .data_loader import get_data_store
from . import Solution1

# Hằng số danh mục Tã (category_l1)
DIAPER_CATEGORY = "T\u00e3"


# ---------------------------------------------------------------------------
# Bước phụ: Tạo response fallback từ kết quả Solution 1
# ---------------------------------------------------------------------------

def _build_solution1_fallback_response(
    item_id: str,
    candidates: pl.DataFrame | None,
    strategy: str,
    n: int,
    reason: str | None = None,
) -> dict:
    """
    Xây dựng response recommendation từ tập ứng viên Solution 1.

    Hàm này được dùng khi KHÔNG thể áp dụng logic upsale của Solution 2
    (ví dụ: sản phẩm không phải Tã, không có size_rank, hoặc không tìm
    được ứng viên tã phù hợp).

    Args:
        item_id:    Mã sản phẩm gốc.
        candidates: Tập ứng viên từ Solution 1 (có thể None).
        strategy:   Chiến lược gốc từ Solution 1.
        n:          Số lượng sản phẩm tối đa.
        reason:     Lý do fallback (dùng để ghi vào strategy string).

    Returns:
        Dict response chuẩn cho API endpoint.
    """
    # --- Xây dựng chuỗi strategy mô tả lý do dùng Solution 1 ---
    final_strategy = (
        f"solution1_only:{strategy}"
        if reason is None
        else f"solution1_only:{reason}+{strategy}"
    )

    # --- Không có ứng viên → trả mảng rỗng ---
    if candidates is None or candidates.height == 0:
        return {
            "item_id": item_id,
            "recommendations": [],
            "strategy": final_strategy,
        }

    # --- Lấy top-N và join đầy đủ thông tin từ catalog ---
    store = get_data_store()
    top_recommendations = (
        candidates
        .head(n)
        .select("item_id", "co_count")
    )
    result = (
        top_recommendations
        .join(store.products, on="item_id", how="inner")
        .sort("co_count", descending=True)
    )

    return {
        "item_id": item_id,
        "recommendations": result.to_dicts(),
        "strategy": final_strategy,
    }


# ---------------------------------------------------------------------------
# Bước phụ: Chấm điểm upsale theo size cho ứng viên tã
# ---------------------------------------------------------------------------

def _score_diaper_upsale_candidates(
    base_candidates: pl.DataFrame,
    current_size_rank: int,
    store: object,
) -> pl.DataFrame:
    """
    Chấm điểm upsale cho các ứng viên tã dựa trên chênh lệch size.

    Logic chấm điểm:
        1. Lọc: chỉ giữ ứng viên thuộc danh mục Tã, có size_rank,
           và size_rank >= current_size_rank (không gợi ý size nhỏ hơn).
        2. size_gap = candidate_size_rank − current_size_rank.
        3. score_upsale = size_gap + 1
           → cùng size (gap=0) có score=1, size lớn hơn có score cao hơn.
        4. final_score = co_count × score_upsale
           → kết hợp tần suất mua chung với mức ưu tiên upsale.

    Args:
        base_candidates:   Tập ứng viên từ Solution 1.
        current_size_rank: size_rank của sản phẩm đang xem.
        store:             DataStore singleton.

    Returns:
        DataFrame ứng viên đã chấm điểm (có thể rỗng).
    """
    # --- Join metadata size_rank và category_l1 cho từng ứng viên ---
    candidates = (
        base_candidates
        .select("item_id", "co_count")
        .join(
            store.products.select("item_id", "category_l1", "size_rank"),
            on="item_id",
            how="inner",
        )
    )

    # --- Lọc, tính điểm ---
    scored = (
        candidates
        # Chỉ giữ ứng viên thuộc danh mục Tã
        .filter(pl.col("category_l1") == DIAPER_CATEGORY)
        # Chỉ giữ ứng viên có thông tin size
        .filter(pl.col("size_rank").is_not_null())
        # Chỉ giữ ứng viên có size >= size hiện tại (upsale, không downsale)
        .filter(pl.col("size_rank") >= int(current_size_rank))
        # Tính size_gap: chênh lệch bậc size
        .with_columns(
            (pl.col("size_rank") - int(current_size_rank)).alias("size_gap")
        )
        # Tính score_upsale = size_gap + 1
        .with_columns(
            (pl.col("size_gap") + 1).cast(pl.Float64).alias("score_upsale")
        )
        # Tính final_score = co_count × score_upsale
        .with_columns(
            (pl.col("co_count").cast(pl.Float64) * pl.col("score_upsale")).alias(
                "final_score"
            )
        )
    )

    return scored


# ---------------------------------------------------------------------------
# Bước chính: API endpoint — Trả kết quả Solution 2 cho frontend
# ---------------------------------------------------------------------------

def get_recommendations(item_id: str, n: int = 20) -> dict:
    """
    Trả về danh sách recommendation theo Solution 2.

    Đây là endpoint được gọi bởi route ``GET /recommendations/{item_id}``.

    Luồng xử lý:
        1. Gọi Solution 1 để lấy tập ứng viên nền.
        2. Nếu sản phẩm không phải Tã → trả nguyên Solution 1 (fallback).
        3. Nếu là Tã nhưng không có size_rank → trả nguyên Solution 1.
        4. Nếu là Tã và có size_rank → chấm điểm upsale, xếp hạng.
        5. Nếu sau chấm điểm không còn ứng viên → fallback Solution 1.

    Args:
        item_id: Mã sản phẩm đang xem.
        n:       Số lượng sản phẩm tối đa trả về (mặc định 20).

    Returns:
        Dict gồm:
            - ``item_id``: mã sản phẩm gốc.
            - ``recommendations``: danh sách sản phẩm gợi ý
              (kèm co_count, size_gap, score_upsale, final_score).
            - ``strategy``: chuỗi mô tả chiến lược đã dùng.
    """
    store = get_data_store()

    # --- Bước 1: Lấy tập ứng viên nền từ Solution 1 ---
    product, base_candidates, base_strategy = (
        Solution1.get_solution1_candidates(item_id)
    )

    # --- Không tìm thấy sản phẩm ---
    if product is None:
        return {"item_id": item_id, "recommendations": [], "strategy": "not_found"}

    # --- Không có dữ liệu co-buy ---
    if base_candidates is None:
        return {"item_id": item_id, "recommendations": [], "strategy": base_strategy}

    # --- Bước 2: Kiểm tra — không phải Tã → fallback Solution 1 ---
    if product.get("category_l1") != DIAPER_CATEGORY:
        return _build_solution1_fallback_response(
            item_id, base_candidates, base_strategy, n
        )

    # --- Bước 3: Là Tã nhưng không có size_rank → fallback Solution 1 ---
    current_size_rank = product.get("size_rank")
    if current_size_rank is None:
        return _build_solution1_fallback_response(
            item_id,
            base_candidates,
            base_strategy,
            n,
            reason="size_unknown",
        )

    # --- Bước 4: Chấm điểm upsale cho ứng viên tã ---
    scored = _score_diaper_upsale_candidates(
        base_candidates, current_size_rank, store
    )

    # --- Bước 5: Fallback nếu không còn ứng viên sau lọc ---
    if scored.height == 0:
        return _build_solution1_fallback_response(
            item_id,
            base_candidates,
            base_strategy,
            n,
            reason="no_diaper_candidate",
        )

    # --- Bước 6: Xếp hạng final_score giảm dần, co_count tie-breaker ---
    top_recommendations = (
        scored
        .sort(
            by=["final_score", "co_count"],
            descending=[True, True],
        )
        .head(n)
        .select("item_id", "co_count", "size_gap", "score_upsale", "final_score")
    )

    # --- Join đầy đủ thông tin catalog ---
    result = (
        top_recommendations
        .join(store.products, on="item_id", how="inner")
        .sort(by=["final_score", "co_count"], descending=[True, True])
    )

    return {
        "item_id": item_id,
        "recommendations": result.to_dicts(),
        "strategy": f"solution2:upsale_on_top_of:{base_strategy}",
    }
