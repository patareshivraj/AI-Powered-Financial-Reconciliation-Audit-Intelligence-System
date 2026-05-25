"""Tests for FuzzyMatchingService."""
from app.services.fuzzy_matching_service import FuzzyMatchingService


class TestFuzzyMatching:
    def test_detects_format_variation(self, db, fuzzy_session):
        """UTR-12345 vs UTR12345 should be a probable match."""
        matches = FuzzyMatchingService.detect_probable_matches(db, fuzzy_session)
        assert len(matches) == 1
        assert matches[0]["confidence"] >= 85.0
        assert matches[0]["bank_reference"] == "UTR-12345"
        assert matches[0]["ledger_reference"] == "UTR12345"

    def test_empty_session_returns_empty(self, db):
        matches = FuzzyMatchingService.detect_probable_matches(db, "nonexistent")
        assert matches == []

    def test_no_matches_below_threshold(self, db, sample_session):
        """Sample session has no orphans that would fuzzy-match since they are already paired."""
        matches = FuzzyMatchingService.detect_probable_matches(db, sample_session)
        # All records in sample_session are already matched — no orphans to fuzzy-pair
        assert matches == []
