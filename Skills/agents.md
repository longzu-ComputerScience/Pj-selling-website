# Agent Context: Sale Forecasting Project

This folder is for follow-up coding agents that need to work on the sale forecasting notebook without losing project context.

## Repository Context

- Main notebook: `Additional Doc/Đồ-Án/lightgbm-sale-forecasting.ipynb`
- Raw data folder: `raw_data/`
- Reference image supplied with the assignment: `raw_data/z7773991616135_ad0e5a4f31dd6f2193e30aca677f86a1.jpg`
- Current branch at the time this file was created: `ForeCast`

## Assignment Summary

Sale Forecasting:

- Purchase transaction data uses event `purchased` / `Purchase`.
- Additional event data may include `view_item` and `add-to-cart`.
- Train data: 2025.
- Blind test: January 2026, evaluated only on purchase events.
- Submission output must contain exactly three columns: `location`, `item_id`, `prediction`.
- Evaluation excludes items with `sale_status = 0`.
- Evaluation is computed on stores / locations that have transactions.
- Metrics:
  - MAE on quantity / sales volume.
  - MAE on revenue.
  - MAPE on quantity / sales volume. This is the main metric.
  - MAPE on revenue.

## Important Existing Notebook Issue

The current notebook creates its supervised row skeleton with both history pairs and target-month pairs:

```python
skeleton = pl.concat([
    monthly_hist.select("location","item_id").unique(),
    monthly_target.select("location","item_id").unique()
]).unique()
```

This leaks future information because, at prediction time, the model cannot know which `(location, item_id)` pairs will appear in the target month.

The leak-free candidate set should be built only from information available before the prediction month, for example:

- Valid locations observed in historical purchase data up to `history_end_month`.
- Active items from `items.parquet` where `sale_status != 0`.
- Full combination: `history_locations x active_items`.
- Or, if the assignment provides an official submission template, use that template as the prediction skeleton.

Target-month data may be used only after the prediction skeleton is fixed, and only to attach labels for internal validation / test metrics.

## Notebook Quality Goals

- Keep comments professional and readable. Vietnamese comments should use proper diacritics.
- Add concise outputs after each major cell so the reader can explain what changed:
  - dataframe name
  - shape
  - new columns
  - key filters applied
  - target month / history window
  - target zero-rate when labels are attached
- Avoid long noisy prints.
- Use clear output filenames, especially for the official submission:
  - `sale_forecasting_submission_jan_2026.csv`

## Environment Goals

The notebook should run on both local Windows and Google Colab:

- Avoid hard-coded absolute Windows paths.
- Resolve paths from the repository root or from the notebook location.
- Install missing packages gracefully only when needed.
- Use `pathlib.Path`.
- Avoid relying on shell commands that only work on one OS.

