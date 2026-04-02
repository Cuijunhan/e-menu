from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Dish, Category
from schemas import DishOut, DishCreate
from typing import List, Optional
import random as _random

router = APIRouter(prefix="/dishes", tags=["菜品"])


@router.get("", response_model=List[DishOut])
def get_dishes(category_id: Optional[int] = None, main_category_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Dish)
    if category_id:
        query = query.filter(Dish.category_id == category_id)
    elif main_category_id:
        query = query.join(Category).filter(Category.main_category_id == main_category_id)
    return query.all()


# ⚠️ /random 必须在 /{dish_id} 之前，否则 "random" 会被解析为整数 id
@router.get("/random", response_model=List[DishOut])
def get_random_dishes(count: int = 5, db: Session = Depends(get_db)):
    """随机返回指定数量的菜品，不足时返回全部"""
    all_dishes = db.query(Dish).all()
    if len(all_dishes) <= count:
        return all_dishes
    return _random.sample(all_dishes, count)


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


@router.put("/{dish_id}", response_model=DishOut)
def update_dish(dish_id: int, dish: DishCreate, db: Session = Depends(get_db)):
    db_dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not db_dish:
        raise HTTPException(status_code=404, detail="菜品不存在")
    for key, value in dish.model_dump().items():
        setattr(db_dish, key, value)
    db.commit()
    db.refresh(db_dish)
    return db_dish


@router.delete("/{dish_id}")
def delete_dish(dish_id: int, db: Session = Depends(get_db)):
    db_dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not db_dish:
        raise HTTPException(status_code=404, detail="菜品不存在")
    db.delete(db_dish)
    db.commit()
    return {"message": "菜品已删除"}
