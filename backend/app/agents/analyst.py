import logging
from typing import Dict, Any, List
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

class DataAnalystAgent:
    """Agent 6: Grounded analytical reasoning, business insights extraction, and smart visualization selection."""
    
    @staticmethod
    def analyze_results(question: str, columns: List[str], rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not rows or not columns:
            return {
                "summary": "No data returned for this query.",
                "insights": ["Query returned 0 rows matching the specified criteria."],
                "chart_recommendation": {"type": "table", "title": "Empty Result Set"}
            }

        df = pd.DataFrame(rows)
        insights = []
        
        # 1. Identify Numeric and Categorical Columns
        numeric_cols = []
        for col in columns:
            # Check if column is numeric
            try:
                pd.to_numeric(df[col].dropna())
                numeric_cols.append(col)
            except Exception:
                pass
                
        categorical_cols = [c for c in columns if c not in numeric_cols]
        
        # 2. Derive Grounded Insights
        row_count = len(df)
        insights.append(f"Analyzed {row_count} record{'s' if row_count != 1 else ''} across {len(columns)} dimensions.")
        
        # Numeric Stats & Top contributors
        for num_col in numeric_cols[:2]:
            series = pd.to_numeric(df[num_col].dropna())
            if len(series) > 0:
                total_val = float(series.sum())
                avg_val = float(series.mean())
                max_val = float(series.max())
                
                # Format currency/numbers
                is_money = any(k in num_col.lower() for k in ["revenue", "price", "spending", "amount", "total", "cost", "fee"])
                prefix = "$" if is_money else ""
                
                if categorical_cols:
                    cat_col = categorical_cols[0]
                    max_idx = series.idxmax()
                    top_cat = df.loc[max_idx, cat_col]
                    top_share = round((max_val / max(1.0, total_val)) * 100, 1) if total_val > 0 else 0
                    insights.append(f"Top performer in {num_col.replace('_', ' ')} is '{top_cat}' at {prefix}{max_val:,.2f} ({top_share}% of total).")
                else:
                    insights.append(f"Highest {num_col.replace('_', ' ')} is {prefix}{max_val:,.2f} (Average: {prefix}{avg_val:,.2f}).")
                    
                if total_val > 0 and len(series) > 1:
                    insights.append(f"Aggregate {num_col.replace('_', ' ')} across all returned records is {prefix}{total_val:,.2f}.")

        # Detect Distribution / Tiers
        if "loyalty_tier" in categorical_cols:
            tier_counts = df["loyalty_tier"].value_counts()
            top_tier = tier_counts.index[0]
            insights.append(f"Dominant loyalty tier is '{top_tier}' representing {round(tier_counts.iloc[0]/row_count*100, 1)}% of users.")
            
        if "city" in categorical_cols:
            city_count = df["city"].nunique()
            insights.append(f"Geographic distribution spans {city_count} distinct metropolitan market{'s' if city_count != 1 else ''}.")

        # 3. Chart Recommendation Logic
        chart_config = DataAnalystAgent._determine_best_chart(df, columns, categorical_cols, numeric_cols, question)

        return {
            "summary": f"Query returned {row_count} rows with primary metric '{numeric_cols[0] if numeric_cols else 'Count'}'.",
            "insights": insights[:5],
            "chart_recommendation": chart_config
        }

    @staticmethod
    def _determine_best_chart(
        df: pd.DataFrame, 
        columns: List[str], 
        categorical_cols: List[str], 
        numeric_cols: List[str], 
        question: str
    ) -> Dict[str, Any]:
        q_lower = question.lower()
        
        # KPI Card for single row single metric
        if len(df) == 1 and len(numeric_cols) >= 1:
            val = float(df[numeric_cols[0]].iloc[0])
            return {
                "type": "kpi",
                "title": numeric_cols[0].replace("_", " ").title(),
                "value": val,
                "label": columns[0]
            }

        # Date / Time series -> Line or Area Chart
        date_col = next((c for c in columns if any(d in c.lower() for d in ["date", "month", "year", "time", "day", "week"])), None)
        if date_col and numeric_cols:
            return {
                "type": "area" if "revenue" in q_lower or "cumulative" in q_lower else "line",
                "title": f"Trend Analysis by {date_col.replace('_', ' ').title()}",
                "xAxisKey": date_col,
                "yAxisKeys": numeric_cols[:2],
                "description": f"Historical timeline mapping {', '.join(numeric_cols[:2])} over {date_col}."
            }

        # Small categorical distribution (2-6 rows) -> Pie / Donut Chart
        if 2 <= len(df) <= 6 and categorical_cols and numeric_cols and any(k in q_lower for k in ["share", "distribution", "tier", "percentage", "method", "category"]):
            return {
                "type": "pie",
                "title": f"Distribution by {categorical_cols[0].replace('_', ' ').title()}",
                "nameKey": categorical_cols[0],
                "dataKey": numeric_cols[0],
                "description": f"Proportional breakdown of {numeric_cols[0]} across {categorical_cols[0]}."
            }

        # Categorical with 1 or 2 numeric columns -> Bar Chart
        if categorical_cols and numeric_cols:
            return {
                "type": "bar",
                "title": f"Comparison by {categorical_cols[0].replace('_', ' ').title()}",
                "xAxisKey": categorical_cols[0],
                "yAxisKeys": numeric_cols[:2],
                "description": f"Comparative performance across {categorical_cols[0]}."
            }

        # Multiple numeric columns without category -> Scatter / Multi-bar
        if len(numeric_cols) >= 2:
            return {
                "type": "scatter",
                "title": f"Correlation: {numeric_cols[0].title()} vs {numeric_cols[1].title()}",
                "xAxisKey": numeric_cols[0],
                "yAxisKeys": [numeric_cols[1]],
                "description": "Cross-metric correlation distribution."
            }

        return {
            "type": "table",
            "title": "Data Overview",
            "columns": columns
        }

data_analyst = DataAnalystAgent()
