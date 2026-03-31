from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine, Base, SessionLocal
from models import MainCategory, Category, Dish, User, Banner
from routers import categories, dishes, orders, reservations, banners, upload, main_categories
import os

# 创建所有表
Base.metadata.create_all(bind=engine)

app = FastAPI(title="家庭点餐系统", version="1.0")

# 允许小程序开发环境跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(banners.router)
app.include_router(main_categories.router)
app.include_router(categories.router)
app.include_router(dishes.router)
app.include_router(orders.router)
app.include_router(reservations.router)
app.include_router(upload.router)

# 挂载静态文件
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# 挂载上传文件目录
upload_dir = r"C:\Users\54641\Desktop\claude-test"
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")


@app.get("/admin", include_in_schema=False)
def admin_page():
    return FileResponse(os.path.join(static_dir, "admin.html"))


@app.get("/admin/banners", include_in_schema=False)
def banners_page():
    return FileResponse(os.path.join(static_dir, "banners.html"))


def seed():
    """初始化示例数据（只在数据为空时执行）"""
    db = SessionLocal()
    try:
        if db.query(MainCategory).count() > 0:
            return

        # 创建主分类
        main_cats = [
            MainCategory(name="饭菜", code="food"),
            MainCategory(name="咖啡", code="coffee"),
            MainCategory(name="酒", code="wine"),
        ]
        db.add_all(main_cats)
        db.flush()

        # 创建子分类
        cats = [
            Category(name="热菜", main_category_id=main_cats[0].id),
            Category(name="凉菜", main_category_id=main_cats[0].id),
            Category(name="汤类", main_category_id=main_cats[0].id),
            Category(name="主食", main_category_id=main_cats[0].id),
            Category(name="美式", main_category_id=main_cats[1].id),
            Category(name="拿铁", main_category_id=main_cats[1].id),
            Category(name="红酒", main_category_id=main_cats[2].id),
            Category(name="白酒", main_category_id=main_cats[2].id),
        ]
        db.add_all(cats)
        db.flush()

        dishes_data = [
            Dish(name="红烧肉", price=38.0, category_id=cats[0].id, description="软烂入味，肥而不腻"),
            Dish(name="鱼香肉丝", price=28.0, category_id=cats[0].id, description="经典川菜，酸甜微辣"),
            Dish(name="番茄炒蛋", price=18.0, category_id=cats[0].id, description="家常必备，下饭神器"),
            Dish(name="清炒时蔬", price=15.0, category_id=cats[0].id, description="新鲜蔬菜，清爽健康"),
            Dish(name="拍黄瓜", price=12.0, category_id=cats[1].id, description="清脆爽口，蒜香十足"),
            Dish(name="凉拌木耳", price=14.0, category_id=cats[1].id, description="黑木耳拌香葱"),
            Dish(name="番茄蛋花汤", price=12.0, category_id=cats[2].id, description="酸甜开胃，暖胃暖心"),
            Dish(name="紫菜蛋花汤", price=10.0, category_id=cats[2].id, description="简单清淡，营养丰富"),
            Dish(name="米饭", price=3.0, category_id=cats[3].id, description="东北大米，颗粒饱满"),
            Dish(name="馒头", price=2.0, category_id=cats[3].id, description="手工馒头，松软可口"),
        ]
        db.add_all(dishes_data)

        # 添加轮播图示例数据
        # banners_data = [
        #     Banner(image="/images/banner-cooking.png", title="今天有没有好好吃饭！", sort_order=1, is_active=True, is_default=True),
        #     Banner(image="/images/banner-coffee.png", title="来杯咖啡提提神", sort_order=2, is_active=True, is_default=True),
        #     Banner(image="/images/banner-cocktail.png", title="小酌怡情", sort_order=3, is_active=True, is_default=True),
        # ]
        banners_data = [
            Banner(image="/images/banner-cooking.png", title=" ", sort_order=1, is_active=True, is_default=True),
            Banner(image="/images/banner-coffee.png", title=" ", sort_order=2, is_active=True, is_default=True),
            Banner(image="/images/banner-cocktail.png", title=" ", sort_order=3, is_active=True, is_default=True),
        ]
        db.add_all(banners_data)

        # 创建默认测试用户（openid: test_user）
        db.add(User(openid="test_user", balance=100.0))

        db.commit()
        print("示例数据初始化完成")
    finally:
        db.close()


seed()


@app.get("/")
def root():
    return {"message": "家庭点餐系统 API 运行中"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
