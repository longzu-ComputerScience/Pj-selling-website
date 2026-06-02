# Prompt For Claude Opus 4.6

You are Claude Opus 4.6 working as a senior machine learning engineer on a sale forecasting notebook. Before making any edits, read and understand the current notebook and repository context completely. Do not start changing code until you can explain the existing data flow, current leakage issue, and the expected deliverables.

## Repository And Files

Project root:

```text
C:\Users\asus\Documents\HocTap\HK4\CS116 - Python Programming For ML\Pj-selling website
```

Main notebook to fix:

```text
Additional Doc/Đồ-Án/lightgbm-sale-forecasting.ipynb
```

Raw data folder:

```text
raw_data/
```

Assignment reference image to inspect or cite in notes if helpful:

```text
raw_data/z7773991616135_ad0e5a4f31dd6f2193e30aca677f86a1.jpg
```

Important raw files that may exist:

```text
raw_data/transaction_full_2025.parquet
raw_data/transactions-2025-12.parquet
raw_data/items.parquet
raw_data/event_full_2025.parquet
```

Inspect the actual files and schemas before assuming what each contains. In particular, check whether `transaction_full_2025.parquet` already includes December 2025. If December exists only in `transactions-2025-12.parquet`, include it for the final January 2026 training data exactly once.

## Assignment Statement

Sale Forecasting:

- Data: purchase transactions, event `purchased` / `Purchase`.
- Event data may also include `view_item` and `add-to-cart` as a new dataset.
- Train data: 2025.
- Blind test: January 2026, evaluated only on purchase events.
- Submission output: a table with exactly three columns: `location`, `item_id`, and `prediction`.
- Metrics are evaluated on locations that have transactions.
- Items with `sale_status = 0` must not be included in evaluation.
- Metrics:
  - MAE on quantity / sales volume.
  - MAE on revenue.
  - MAPE on quantity / sales volume. This is the main metric.
  - MAPE on revenue.

## Current Problem To Fix

The existing notebook has target leakage in the supervised skeleton construction. It currently builds rows using both historical pairs and target-month pairs:

```python
skeleton = pl.concat([
    monthly_hist.select("location","item_id").unique(),
    monthly_target.select("location","item_id").unique()
]).unique()
```

This leaks future information because, at real prediction time, we do not know which `(location, item_id)` pairs will sell in the target month. Even though this does not leak the target quantity directly, it leaks target-month pair existence and makes internal validation/test unrealistic.

Fix this properly.

## Required Modeling Direction

Use a leak-free prediction skeleton. Unless an official submission template is provided, define valid prediction rows as:

```text
valid historical locations x active items
```

Where:

- `valid historical locations` are locations observed in historical purchase data up to the history cutoff month.
- `active items` come from `items.parquet` with `sale_status != 0`.
- Do not use target-month transactions to decide which `(location, item_id)` rows should be predicted.

For internal validation and test:

1. Build the skeleton from history only.
2. Build features from history only.
3. Predict for all skeleton rows.
4. Only after the skeleton and features are fixed, join target-month labels for metric calculation.
5. Missing target labels should become zero actual sales/revenue.
6. For MAPE, compute only where actual quantity/revenue is greater than zero to avoid division by zero.
7. If applying the assignment rule "locations that have transactions" during internal evaluation, use target-month transaction locations only as an evaluation mask after predictions have already been produced. Never use that mask for feature generation or prediction-row generation.

For the final January 2026 submission:

1. Train using all available 2025 purchase data.
2. Generate predictions for January 2026 using only known historical information from 2025.
3. Output exactly three columns:

```text
location,item_id,prediction
```

Use this official submission filename:

```text
sale_forecasting_submission_jan_2026.csv
```

Save it under:

```text
Additional Doc/Đồ-Án/
```

## Output File Naming

Rename or create output files with clear names. Avoid vague or overly long names.

Required / recommended outputs:

```text
Additional Doc/Đồ-Án/sale_forecasting_submission_jan_2026.csv
Additional Doc/Đồ-Án/lightgbm_no_leak_validation_oct_predictions.csv
Additional Doc/Đồ-Án/lightgbm_no_leak_test_nov_predictions.csv
Additional Doc/Đồ-Án/lightgbm_no_leak_metrics_summary.csv
Additional Doc/Đồ-Án/lightgbm_no_leak_feature_importance.csv
```

The official submission file must contain only the three assignment columns. Diagnostic validation/test files may contain actuals, predictions, revenue, and error columns.

If any diagnostic file becomes too large for GitHub, prefer Parquet for diagnostics or create a clearly named sampled CSV, but keep the official submission CSV.

## Notebook Readability Requirements

The current notebook has some Vietnamese comments without diacritics, which makes it hard to read. Update comments and markdown explanations so they are professional and readable:

- Vietnamese comments should use proper accents/diacritics.
- Keep comments concise.
- Do not turn the notebook into a long essay.
- Explain the leakage fix clearly in markdown.
- Explain why LightGBM's training `l1` metric is low: the model is trained on `log1p(y_qty)`, so training `l1` is measured on log scale, while reported MAE/MAPE are measured on original quantity/revenue scale.
- Explain why MAPE may remain high on sparse retail demand: many rows have actual quantity 1 or 2, so small absolute errors become large percentage errors.

## Add Concise Cell Outputs

The user finds the notebook hard to explain. Add concise outputs after important cells so they can see what each cell created or changed.

Use a professional, compact style. For example, create helper functions such as:

```python
def report_df(name, df, key_cols=None, added_cols=None, notes=None, max_cols=12):
    ...
```

Each major cell should print only useful information, such as:

- dataframe name
- shape
- key columns
- newly added columns
- filter applied
- date/month range
- number of locations
- number of items
- number of active items
- number of prediction rows
- target zero-rate after labels are joined
- train/validation/test split sizes

Avoid dumping huge tables. Use `.head()` only when it helps.

## Implementation Expectations

Refactor carefully, but keep the notebook easy to follow. Suggested structure:

1. Setup and path resolution.
2. Load schemas and data.
3. Clean purchases and active items.
4. Build monthly aggregates.
5. Define leak-free skeleton builder.
6. Define feature builder using history only.
7. Build leak-free train/validation/test sets.
8. Train LightGBM and select best iteration.
9. Evaluate October validation and November internal test.
10. Train final model on all available 2025 history.
11. Generate January 2026 submission.
12. Save clear outputs.
13. Print compact final summary.

Use `pathlib.Path` and avoid hard-coded absolute Windows paths. The notebook should work from:

- Local Windows when opened from the repository.
- Google Colab after the project folder/data is available.

Package handling should be robust:

- Do not blindly run `pip install` every time if packages are already installed.
- If you keep an install cell, make it safe and clear.
- Required packages include `polars`, `pandas`, `numpy`, `lightgbm`, `pyarrow`, `scikit-learn`, and `matplotlib` if plots are still used.

## Leakage Acceptance Checks

Before finishing, verify the notebook no longer uses target-month pairs to build the prediction skeleton.

Search for suspicious logic like:

```python
monthly_target.select("location", "item_id").unique()
```

This is allowed only for joining labels or computing evaluation masks after predictions are fixed. It must not appear inside skeleton creation.

Also verify:

- Features are computed only from `month <= history_end_month`.
- Target labels are joined only after features/skeleton are built.
- No target-month quantity, revenue, active days, bills, or customers are used as features.
- The official submission file has exactly three columns: `location`, `item_id`, `prediction`.
- Items with `sale_status = 0` are excluded from active prediction items.
- The notebook can restart kernel and run top-to-bottom.

## Be Careful With Existing Work

Do not remove useful existing analysis unless it conflicts with the leakage fix. Preserve the intent of the current LightGBM solution, but make the data construction leak-free and easier to explain.

Do not pull or fetch from GitHub as part of this task. Work only with the local repository state unless explicitly asked otherwise.

At the end, provide a short summary of:

- what changed,
- how leakage was fixed,
- which output files were generated,
- the new validation/test metrics,
- any remaining caveats.

