# BANK AI — Canonical Column Mappings for Dynamic Normalization
# Maps various naming formats to unified, standard keys to avoid hardcoded bank-specific parsers.

CANONICAL_KEYS = [
    "transaction_id",
    "reference_id",
    "amount",
    "date",
    "description",
    "transaction_type",
    "source"
]

BANK_COLUMN_MAPPINGS = {
    "transaction_id": [
        "transaction_id",
        "tx_id",
        "txn_id",
        "id",
        "trans_id",
        "row_id",
        "serial_no",
        "ref_no"
    ],
    "reference_id": [
        "reference_id",
        "reference",
        "ref",
        "transaction_reference",
        "utr",
        "txn_ref",
        "bank_ref",
        "payment_ref",
        "clabe"
    ],
    "amount": [
        "amount",
        "value",
        "txn_amount",
        "transaction_amount",
        "amt",
        "credit_amount",
        "debit_amount",
        "withdrawal",
        "deposit",
        "charge"
    ],
    "date": [
        "date",
        "transaction_date",
        "txn_date",
        "booking_date",
        "value_date",
        "created_at",
        "timestamp",
        "time"
    ],
    "description": [
        "description",
        "desc",
        "memo",
        "particulars",
        "narrative",
        "remarks",
        "transaction_details",
        "payee",
        "details"
    ],
    "transaction_type": [
        "transaction_type",
        "type",
        "source_type",
        "action",
        "credit_debit",
        "cr_dr",
        "kind"
    ]
}
