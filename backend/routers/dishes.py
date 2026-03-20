from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Dish
from schemas import DishOut, DishCreate
from typing import List, Optional

router = APIRouter(prefix="/dishes", tags=["菜品"])


@router.get("", response_model=List[DishOut])
def get_dishes(category_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Dish)
    if category_id:
        query = query.filter(Dish.category_id == category_id)
    return query.all()


@router.get("/{dish_id}", response_model=DishOut)
def get_dish(dish_id: int, db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="菜品不存在")
    return dish


@router.post("", response_model=DishOut)
def create_dish(dish: DishCreate, db: Session = Depends(get_db)):
    db_dish = Dish(**dish.model_dump())
    db.add(db_dish)
    db.commit()
    db.refresh(db_dish)
    return db_dish
