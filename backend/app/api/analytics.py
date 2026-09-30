import io
import csv
from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
from app.agents.analyst import data_analyst

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])

class InsightsRequest(BaseModel):
    question: str
    columns: List[str]
    rows: List[Dict[str, Any]]

class ReportExportRequest(BaseModel):
    question: str
    sql: str
    execution_time_ms: float
    row_count: int
    risk_level: str
    insights: List[str]
    columns: List[str]
    rows: List[Dict[str, Any]]

@router.post("/insights")
async def generate_insights(req: InsightsRequest):
    """Generates strictly grounded business insights and chart recommendations."""
    return data_analyst.analyze_results(req.question, req.columns, req.rows)

@router.post("/export/csv")
async def export_csv(req: InsightsRequest):
    """Exports query result rows as a CSV file."""
    output = io.StringIO()
    if req.columns:
        writer = csv.DictWriter(output, fieldnames=req.columns)
        writer.writeheader()
        for r in req.rows:
            writer.writerow(r)
    
    csv_bytes = output.getvalue().encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="sqlgenx_query_result.csv"'}
    )

@router.post("/export/pdf")
async def export_pdf_report(req: ReportExportRequest):
    """Generates an executive PDF intelligence report for the query."""
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=501, 
            detail="PDF generation requires 'reportlab' package. Please install with: pip install reportlab"
        )
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=12
    )
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=15
    )
    heading2_style = ParagraphStyle(
        'Heading2Style',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=10,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )
    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Code'],
        fontSize=8,
        textColor=colors.HexColor("#0f766e"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPadding=6,
        spaceAfter=10
    )

    story = []
    
    # Title & Metadata
    story.append(Paragraph("SQLGenX Query Intelligence Report", title_style))
    story.append(Paragraph(f"Generated on {req.question} | Risk Level: {req.risk_level.upper()} | Execution Time: {req.execution_time_ms} ms | Rows: {req.row_count}", subtitle_style))
    story.append(Spacer(1, 8))
    
    # Generated SQL
    story.append(Paragraph("Executed SQL Query:", heading2_style))
    clean_sql = req.sql.replace("<", "&lt;").replace(">", "&gt;")
    story.append(Paragraph(clean_sql, code_style))
    story.append(Spacer(1, 8))
    
    # AI Insights
    story.append(Paragraph("Key Business Insights & Findings:", heading2_style))
    for ins in req.insights:
        story.append(Paragraph(f"• {ins}", body_style))
    story.append(Spacer(1, 10))
    
    # Data Table Preview (First 10 rows)
    if req.columns and req.rows:
        story.append(Paragraph("Query Result Preview (Top Rows):", heading2_style))
        preview_rows = req.rows[:10]
        table_data = [req.columns]
        for r in preview_rows:
            table_data.append([str(r.get(c, "")) for c in req.columns])
            
        t = Table(table_data, hAlign='LEFT')
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        story.append(t)
        
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="SQLGenX_Intelligence_Report.pdf"'}
    )
