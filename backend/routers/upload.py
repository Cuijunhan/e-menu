from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil
import uuid

router = APIRouter(prefix="/upload", tags=["文件上传"])

# 上传目录
UPLOAD_DIR = Path(r"C:\Users\54641\Desktop\claude-test")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """上传图片"""
    # 检查文件类型
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="只能上传图片文件")

    # 生成唯一文件名
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = UPLOAD_DIR / filename

    # 保存文件
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 返回文件路径
    return {"url": f"/uploads/{filename}", "path": str(file_path)}
