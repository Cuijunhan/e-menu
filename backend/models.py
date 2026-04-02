from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Banner(Base):
    __tablename__ = "banner"
    id = Column(Integer, primary_key=True, index=True)
    image = Column(String, nullable=False)
    title = Column(String, default="")
    link = Column(String, default="")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)


class MainCategory(Base):
    __tablename__ = "main_category"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # 饭菜、咖啡、酒
    code = Column(String, unique=True, nullable=False)  # food, coffee, wine
    categories = relationship("Category", back_populates="main_category")


class Category(Base):
    __tablename__ = "category"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    main_category_id = Column(Integer, ForeignKey("main_category.id"))
    main_category = relationship("MainCategory", back_populates="categories")
    dishes = relationship("Dish", back_populates="category")


class Dish(Base):
    __tablename__ = "dish"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    category_id = Column(Integer, ForeignKey("category.id"))
    image = Column(String, default="")
    description = Column(String, default="")
    ingredients = Column(Text, default="")  # 食材
    instructions = Column(Text, default="")  # 做法
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


class Reservation(Base):
    __tablename__ = "reservation"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    dish_name = Column(String, nullable=False)        # 想吃的菜名
    link = Column(String, default="")                 # 抖音/小红书链接（可选）
    note = Column(Text, default="")                   # 备注
    status = Column(String, default="待处理")          # 待处理 / 已处理
    create_time = Column(DateTime, default=datetime.now)
    user = relationship("User")
