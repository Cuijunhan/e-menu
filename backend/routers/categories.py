from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Category
from schemas import CategoryOut, CategoryCreate
from typing import List, Optional

router = APIRouter(prefix="/categories", tags=["分类"])


@router.get("", response_model=List[CategoryOut])
def get_categories(main_category_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Category)
    if main_category_id:
        query = query.filter(Category.main_category_id == main_category_id)
    return query.all()


@router.post("", response_model=CategoryOut)
def create_category(cat: CategoryCreate, db: Session = Depends(get_db)):
    db_cat = Category(name=cat.name, main_category_id=cat.main_category_id)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    db_cat = db.query(Category).filter(Category.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="分类不存在")
    db.delete(db_cat)
    db.commit()
    return {"message": "分类已删除"}
