from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Banner
from pydantic import BaseModel

router = APIRouter(prefix="/banners", tags=["轮播图"])


class BannerCreate(BaseModel):
    image: str
    title: str = ""
    link: str = ""
    sort_order: int = 0
    is_active: bool = True
    is_default: bool = False


@router.get("")
def get_banners(db: Session = Depends(get_db)):
    """获取所有激活的轮播图"""
    banners = db.query(Banner).filter(Banner.is_active == True).order_by(Banner.sort_order).all()
    return {"data": [{"id": b.id, "image": b.image, "title": b.title, "link": b.link} for b in banners]}


@router.get("/all")
def get_all_banners(db: Session = Depends(get_db)):
    """获取所有轮播图（包括未激活的）"""
    banners = db.query(Banner).order_by(Banner.sort_order).all()
    return {"data": [{"id": b.id, "image": b.image, "title": b.title, "link": b.link, "sort_order": b.sort_order, "is_active": b.is_active, "is_default": b.is_default} for b in banners]}


@router.post("")
def create_banner(banner: BannerCreate, db: Session = Depends(get_db)):
    """创建轮播图"""
    new_banner = Banner(**banner.dict())
    db.add(new_banner)
    db.commit()
    db.refresh(new_banner)
    return {"id": new_banner.id}


@router.delete("/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    """删除轮播图"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="轮播图不存在")
    db.delete(banner)
    db.commit()
    return {"message": "删除成功"}
