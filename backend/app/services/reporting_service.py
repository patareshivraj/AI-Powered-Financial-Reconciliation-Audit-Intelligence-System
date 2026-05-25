import io
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from sqlalchemy.orm import Session
from app.models.base import ReconciliationSession, ReconciliationResult
from app.services.analytics_service import AnalyticsService
from app.services.anomaly_detection_service import AnomalyDetectionService
from app.utils.logging import logger
from typing import Dict, Any


class ReportingService:
    @staticmethod
    def _build_report_rows(db: Session, session_id: str) -> list[dict]:
        """Flatten reconciliation results into export-ready row dicts."""
        results = db.query(ReconciliationResult).filter(
            ReconciliationResult.session_id == session_id
        ).all()

        rows = []
        for r in results:
            b = r.bank_transaction
            e = r.ledger_transaction
            rows.append({
                "Reference": (b.reference if b else None) or (e.reference if e else None) or "N/A",
                "Status": r.match_type,
                "Score": r.match_score,
                "Bank Amount": b.amount if b else None,
                "Ledger Amount": e.amount if e else None,
                "Bank Date": b.transaction_date.strftime("%Y-%m-%d") if b and b.transaction_date else "N/A",
                "Ledger Date": e.transaction_date.strftime("%Y-%m-%d") if e and e.transaction_date else "N/A",
                "Remarks": r.comments or "",
            })
        return rows

    @staticmethod
    def generate_csv(db: Session, session_id: str) -> str:
        rows = ReportingService._build_report_rows(db, session_id)
        df = pd.DataFrame(rows) if rows else pd.DataFrame(columns=["Reference", "Status"])
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        return buf.getvalue()

    @staticmethod
    def generate_xlsx(db: Session, session_id: str) -> bytes:
        rows = ReportingService._build_report_rows(db, session_id)
        df = pd.DataFrame(rows) if rows else pd.DataFrame(columns=["Reference", "Status"])

        # Anomalies sheet
        anomalies = AnomalyDetectionService.detect_anomalies(db, session_id)
        adf = pd.DataFrame(anomalies) if anomalies else pd.DataFrame(columns=["type", "severity", "description"])

        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Reconciliation")
            adf.to_excel(writer, index=False, sheet_name="Anomalies")
        buf.seek(0)
        return buf.read()

    @staticmethod
    def generate_pdf(db: Session, session_id: str) -> bytes:
        rows = ReportingService._build_report_rows(db, session_id)
        analytics = AnalyticsService.get_session_analytics(db, session_id)
        anomalies = AnomalyDetectionService.detect_anomalies(db, session_id)

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20*mm, bottomMargin=15*mm)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        elements.append(Paragraph("BANK AI — Investigation Report", styles["Title"]))
        elements.append(Spacer(1, 6*mm))

        # Analytics summary
        if isinstance(analytics, dict) and "error" not in analytics:
            elements.append(Paragraph(f"Total Processed: {analytics.get('total_processed', 0)}", styles["Normal"]))
            elements.append(Paragraph(f"Total Mismatch Value: ${analytics.get('total_mismatch_value', 0):,.2f}", styles["Normal"]))
            sd = analytics.get("status_distribution", {})
            for k, v in sd.items():
                elements.append(Paragraph(f"  {k}: {v}", styles["Normal"]))
            elements.append(Spacer(1, 4*mm))

        # Anomalies
        if anomalies:
            elements.append(Paragraph("Detected Anomalies", styles["Heading2"]))
            for a in anomalies[:20]:
                elements.append(Paragraph(f"• [{a['severity']}] {a['type']}: {a['description']}", styles["Normal"]))
            elements.append(Spacer(1, 4*mm))

        # Results table (capped at 200 rows for PDF)
        if rows:
            elements.append(Paragraph("Reconciliation Results", styles["Heading2"]))
            header = ["Reference", "Status", "Score", "Bank Amt", "Ledger Amt"]
            table_data = [header]
            for r in rows[:200]:
                table_data.append([
                    str(r["Reference"])[:20],
                    r["Status"],
                    str(r["Score"]),
                    f"${r['Bank Amount']:,.2f}" if r["Bank Amount"] else "—",
                    f"${r['Ledger Amount']:,.2f}" if r["Ledger Amount"] else "—",
                ])
            t = Table(table_data, repeatRows=1)
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#334155")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
            ]))
            elements.append(t)

        doc.build(elements)
        buf.seek(0)
        return buf.read()
