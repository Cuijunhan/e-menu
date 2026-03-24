from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Reservation
from schemas import ReservationCreate, ReservationOut
from typing import List

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.post("", response_model=ReservationOut)
def create_reservation(body: ReservationCreate, db: Session = Depends(get_db)):
    """提交一个想吃的菜预约（菜单上没有的）"""
    if not body.dish_name.strip():
        raise HTTPException(status_code=400, detail="菜名不能为空")
    r = Reservation(
        user_id=body.user_id,
        dish_name=body.dish_name.strip(),
        link=body.link or "",
        note=body.note or "",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.get("", response_model=List[ReservationOut])
def get_reservations(user_id: int = None, db: Session = Depends(get_db)):
    """查询预约列表，可按 user_id 筛选"""
    q = db.query(Reservation)
    if user_id:
        q = q.filter(Reservation.user_id == user_id)
    return q.order_by(Reservation.create_time.desc()).all()


@router.put("/{reservation_id}/done", response_model=ReservationOut)
def mark_done(reservation_id: int, db: Session = Depends(get_db)):
    """将预约标记为已处理（做好了）"""
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="预约不存在")
    r.status = "已处理"
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{reservation_id}")
def delete_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """删除预约"""
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="预约不存在")
    db.delete(r)
    db.commit()
    return {"ok": True}
