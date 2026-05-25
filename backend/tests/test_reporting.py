"""Tests for ReportingService."""
from app.services.reporting_service import ReportingService


class TestReportingService:
    def test_csv_generation(self, db, sample_session):
        csv_content = ReportingService.generate_csv(db, sample_session)
        assert "Reference" in csv_content
        assert "MATCHED" in csv_content

    def test_xlsx_generation(self, db, sample_session):
        xlsx_bytes = ReportingService.generate_xlsx(db, sample_session)
        # XLSX files start with PK zip header
        assert xlsx_bytes[:2] == b"PK"

    def test_pdf_generation(self, db, sample_session):
        pdf_bytes = ReportingService.generate_pdf(db, sample_session)
        # PDF files start with %PDF
        assert pdf_bytes[:4] == b"%PDF"

    def test_empty_session_csv(self, db):
        csv_content = ReportingService.generate_csv(db, "nonexistent")
        assert "Reference" in csv_content  # Header should still be present
