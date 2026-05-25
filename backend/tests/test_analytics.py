"""Tests for AnalyticsService, AnomalyDetectionService, and MerchantIntelligenceService."""
from app.services.analytics_service import AnalyticsService
from app.services.anomaly_detection_service import AnomalyDetectionService
from app.services.merchant_intelligence_service import MerchantIntelligenceService


class TestAnalyticsService:
    def test_returns_status_distribution(self, db, sample_session):
        result = AnalyticsService.get_session_analytics(db, sample_session)
        assert "status_distribution" in result
        assert result["total_processed"] == 3

    def test_returns_mismatch_value(self, db, sample_session):
        result = AnalyticsService.get_session_analytics(db, sample_session)
        assert result["total_mismatch_value"] > 0

    def test_empty_session_returns_error(self, db):
        result = AnalyticsService.get_session_analytics(db, "nonexistent")
        assert "error" in result


class TestAnomalyDetection:
    def test_detects_high_value_duplicate(self, db, sample_session):
        anomalies = AnomalyDetectionService.detect_anomalies(db, sample_session)
        types = [a["type"] for a in anomalies]
        assert "HIGH_VALUE_DUPLICATE" in types

    def test_detects_amount_variance(self, db, sample_session):
        # b2=2500 vs l2=2000 → 20% variance, below 50% threshold. Should NOT flag.
        anomalies = AnomalyDetectionService.detect_anomalies(db, sample_session)
        massive = [a for a in anomalies if a["type"] == "MASSIVE_AMOUNT_VARIANCE"]
        assert len(massive) == 0  # 20% < 50% threshold

    def test_empty_session_returns_empty(self, db):
        anomalies = AnomalyDetectionService.detect_anomalies(db, "nonexistent")
        assert anomalies == []


class TestMerchantIntelligence:
    def test_returns_merchant_list(self, db, sample_session):
        merchants = MerchantIntelligenceService.analyze_merchants(db, sample_session)
        assert len(merchants) > 0

    def test_merchant_has_risk_score(self, db, sample_session):
        merchants = MerchantIntelligenceService.analyze_merchants(db, sample_session)
        for m in merchants:
            assert "risk_score" in m
            assert "total_volume" in m

    def test_empty_session_returns_empty(self, db):
        merchants = MerchantIntelligenceService.analyze_merchants(db, "nonexistent")
        assert merchants == []
