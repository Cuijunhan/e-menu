from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Order, OrderItem, Dish, User
from schemas import OrderCreate, OrderOut
from typing import List

router = APIRouter(prefix="/orders", tags=["订单"])


@router.post("", response_model=OrderOut)
def create_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    # 确保用户存在
    user = db.query(User).filter(User.id == order_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    total = sum(item.price * item.quantity for item in order_in.items)

    order = Order(user_id=order_in.user_id, total_price=total)
    db.add(order)
    db.flush()

    for item in order_in.items:
        db_item = OrderItem(
            order_id=order.id,
            dish_id=item.dish_id,
            quantity=item.quantity,
            price=item.price,
        )
        db.add(db_item)

    db.commit()
    db.refresh(order)
    return _build_order_out(order, db)


@router.get("", response_model=List[OrderOut])
def get_orders(user_id: int, db: Session = Depends(get_db)):
    orders = (
        db.query(Order)
        .filter(Order.user_id == user_id)
        .order_by(Order.create_time.desc())
        .all()
    )
    return [_build_order_out(o, db) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    return _build_order_out(order, db)


@router.put("/{order_id}/complete", response_model=OrderOut)
def complete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    order.status = "已完成"
    db.commit()
    db.refresh(order)
    return _build_order_out(order, db)


@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    db.delete(order)
    db.commit()
    return {"message": "订单已删除"}


def _build_order_out(order: Order, db: Session) -> OrderOut:
    """把 order 对象转成带菜名的 OrderOut"""
    items_out = []
    for item in order.items:
        dish = db.query(Dish).filter(Dish.id == item.dish_id).first()
        items_out.append({
            "dish_id": item.dish_id,
            "quantity": item.quantity,
            "price": item.price,
            "dish_name": dish.name if dish else "未知菜品",
        })
    return OrderOut(
        id=order.id,
        user_id=order.user_id,
        total_price=order.total_price,
        status=order.status,
        create_time=order.create_time,
        items=items_out,
    )
