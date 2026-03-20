from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ---- Category ----
class CategoryOut(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


# ---- Dish ----
class DishOut(BaseModel):
    id: int
    name: str
    price: float
    category_id: int
    image: str
    description: str
    model_config = {"from_attributes": True}


class DishCreate(BaseModel):
    name: str
    price: float
    category_id: int
    image: str = ""
    description: str = ""


# ---- Order ----
class OrderItemIn(BaseModel):
    dish_id: int
    quantity: int
    price: float


class OrderCreate(BaseModel):
    user_id: int
    items: List[OrderItemIn]


class OrderItemOut(BaseModel):
    dish_id: int
    quantity: int
    price: float
    dish_name: Optional[str] = None
    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    user_id: int
    total_price: float
    status: str
    create_time: datetime
    items: List[OrderItemOut] = []
    model_config = {"from_attributes": True}


# ---- User ----
class UserOut(BaseModel):
    id: int
    openid: str
    balance: float
    model_config = {"from_attributes": True}
