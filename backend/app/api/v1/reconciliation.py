from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.reconciliation_service import ReconciliationService
from app.models.base import ReconciliationResult

from app.schemas.reconciliation import (
    RunReconciliationResponse,
    ReconciliationResultSchema,
    ReconciliationSummarySchema,
    TransactionRepresentation
)
from app.schemas.upload import StandardResponse
from app.utils.logging import logger
import pandas as pd
import io

router = APIRouter(tags=["Reconciliation"])

@router.post("/run/{session_id}", response_model=StandardResponse)
async def run_reconciliation(session_id: str, db: Session = Depends(get_db)):
    """
    Executes the rule-based matching engine on parsed bank and external transactions.
    """
    logger.info(f"API: Running reconciliation for session: {session_id}")
    try:
        data = ReconciliationService.run_reconciliation(session_id, db)
        return StandardResponse(
            success=True,
            message="Reconciliation pipeline completed successfully.",
            data=data,
            errors=[]
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API Error running reconciliation: {str(e)}")
        return StandardResponse(
            success=False,
            message="Failed running reconciliation engine.",
            data=None,
            errors=[str(e)]
        )

@router.get("/results/{session_id}", response_model=StandardResponse)
async def get_reconciliation_results(session_id: str, db: Session = Depends(get_db)):
    """
    Fetches the detailed matched and unmatched transaction pairings.
    """
    logger.info(f"API: Fetching results for session: {session_id}")
    try:
        db_results = ReconciliationService.get_results(session_id, db)
        
        # Serialize results to match schema requirements
        serialized = []
        for r in db_results:
            b_rep = None
            if r.bank_transaction:
                b_rep = TransactionRepresentation.model_validate(r.bank_transaction)
                
            e_rep = None
            if r.ledger_transaction:
                e_rep = TransactionRepresentation.model_validate(r.ledger_transaction)

            serialized.append(ReconciliationResultSchema(
                id=r.id,
                session_id=r.session_id,
                bank_transaction_id=r.bank_transaction_id,
                ledger_transaction_id=r.ledger_transaction_id,
                status=r.match_type,
                match_score=r.match_score,
                remarks=r.comments,
                bank_transaction=b_rep,
                ledger_transaction=e_rep
            ))

        return StandardResponse(
            success=True,
            message="Reconciliation results fetched successfully.",
            data=serialized,
            errors=[]
        )
    except Exception as e:
        logger.error(f"API Error getting reconciliation results: {str(e)}")
        return StandardResponse(
            success=False,
            message="Failed getting reconciliation results.",
            data=[],
            errors=[str(e)]
        )

@router.get("/summary/{session_id}", response_model=StandardResponse)
async def get_reconciliation_summary(session_id: str, db: Session = Depends(get_db)):
    """
    Computes/fetches the high-level match efficiency indicators.
    """
    logger.info(f"API: Fetching summary for session: {session_id}")
    try:
        data = ReconciliationService.get_summary(session_id, db)
        return StandardResponse(
            success=True,
            message="Reconciliation summary fetched successfully.",
            data=data,
            errors=[]
        )
    except Exception as e:
        logger.error(f"API Error getting summary: {str(e)}")
        return StandardResponse(
            success=False,
            message="Failed getting reconciliation summary.",
            data=None,
            errors=[str(e)]
        )

@router.get("/export/{session_id}")
async def export_reconciliation_results(
    session_id: str,
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    db: Session = Depends(get_db)
):
    """
    Generates downloadable report logs (CSV or XLSX) of matched and mismatched transactions.
    """
    logger.info(f"API: Generating {format.upper()} export for session {session_id}")
    try:
        db_results = ReconciliationService.get_results(session_id, db)
        
        # Build flattened dataframe structures
        rows = []
        for r in db_results:
            b_tx = r.bank_transaction
            e_tx = r.ledger_transaction
            
            rows.append({
                "Result ID": r.id,
                "Match Status": r.match_type,
                "Match Score (%)": r.match_score,
                "Remarks": r.comments,
                "Reference Code": b_tx.reference if b_tx else (e_tx.reference if e_tx else "N/A"),
                "Bank Amount": b_tx.amount if b_tx else None,
                "Ledger Amount": e_tx.amount if e_tx else None,
                "Bank Value Date": b_tx.transaction_date.strftime("%Y-%m-%d %H:%M:%S") if b_tx else "N/A",
                "Ledger Value Date": e_tx.transaction_date.strftime("%Y-%m-%d %H:%M:%S") if e_tx else "N/A",
                "Bank Description": b_tx.description if b_tx else "N/A",
                "Ledger Description": e_tx.description if e_tx else "N/A"
            })
            
        df = pd.DataFrame(rows)
        
        if df.empty:
            # Fallback if no records found
            df = pd.DataFrame(columns=["Result ID", "Match Status", "Match Score (%)", "Remarks"])

        if format == "csv":
            stream = io.StringIO()
            df.to_csv(stream, index=False)
            response = StreamingResponse(
                iter([stream.getvalue()]),
                media_type="text/csv"
            )
            response.headers["Content-Disposition"] = f"attachment; filename=reconciliation_report_{session_id}.csv"
            return response
        else:
            # Excel export
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Reconciliation Report")
            output.seek(0)
            response = StreamingResponse(
                io.BytesIO(output.read()),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            response.headers["Content-Disposition"] = f"attachment; filename=reconciliation_report_{session_id}.xlsx"
            return response

    except Exception as e:
        logger.error(f"API Error generating export: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed compiling export report: {str(e)}")

