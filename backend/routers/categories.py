from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Category
from schemas import CategoryOut
from typing import List

router = APIRouter(prefix="/categories", tags=["分类"])


@router.get("", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()
