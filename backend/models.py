from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Category(Base):
    __tablename__ = "category"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dishes = relationship("Dish", back_populates="category")


class Dish(Base):
    __tablename__ = "dish"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    category_id = Column(Integer, ForeignKey("category.id"))
    image = Column(String, default="")
    description = Column(String, default="")
    category = relationship("Category", back_populates="dishes")


class User(Base):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True, index=True)
    openid = Column(String, unique=True, nullable=False)
    balance = Column(Float, default=0.0)
    orders = relationship("Order", back_populates="user")


class Order(Base):
    __tablename__ = "order"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    total_price = Column(Float, nullable=False)
    status = Column(String, default="已下单")  # 已下单 / 已完成
    create_time = Column(DateTime, default=datetime.now)
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_item"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("order.id"))
    dish_id = Column(Integer, ForeignKey("dish.id"))
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    order = relationship("Order", back_populates="items")
    dish = relationship("Dish")
