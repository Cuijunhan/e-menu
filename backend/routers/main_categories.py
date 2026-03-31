from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import MainCategory
from schemas import MainCategoryOut

router = APIRouter(prefix="/api/main-categories", tags=["main-categories"])


@router.get("/", response_model=list[MainCategoryOut])
def get_main_categories(db: Session = Depends(get_db)):
    return db.query(MainCategory).all()
