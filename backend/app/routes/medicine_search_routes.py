from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List

# Ensure we import the database dependency if your setup has it:
import sys
from pathlib import Path
try:
    from app.database import get_db
except ImportError:
    # Fallback placeholder if get_db needs to be redefined or imported differently
    def get_db():
        yield None

from app.schemas.medicine_schema import MedicineResponse
from app.services.medicine_service import search_medicines

router = APIRouter()

@router.get("/search", response_model=List[MedicineResponse])
def get_medicines_search(query: str = Query(..., description="Medicine name to search for"), db: Session = Depends(get_db)):
    try:
        results = search_medicines(db, query)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail="Server Error processing medicine search")
