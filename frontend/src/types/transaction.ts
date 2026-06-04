export interface CanonicalTransaction {
  transaction_id: string | null;
  reference_id: string | null;
  amount: number;
  date: string | null; // ISO Date string 'YYYY-MM-DD HH:MM:SS'
  description: string | null;
  transaction_type: string | null;
  source: "BANK_STATEMENT" | "EXTERNAL_LEDGER";
}
