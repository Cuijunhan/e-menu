"""处理图片素材：裁剪、调整尺寸，生成banner和图标"""
from PIL import Image
import os

BASE = r"c:\Users\54641\Desktop\电子菜单\images"

def make_white_bg(img):
    """把透明背景换成白色"""
    bg = Image.new("RGB", img.size, (255, 255, 255))
    if img.mode in ("RGBA", "LA"):
        bg.paste(img, mask=img.split()[-1])
    else:
        bg.paste(img)
    return bg

def resize_to_banner(path_in, path_out, target_w=750, target_h=380):
    """缩放图片到 750x380，多余部分居中裁剪，不足部分用白色填充"""
    img = Image.open(path_in).convert("RGBA")
    img = make_white_bg(img)
    w, h = img.size
    # 按 target_h 缩放
    scale = target_h / h
    new_w = int(w * scale)
    img = img.resize((new_w, target_h), Image.LANCZOS)
    if new_w >= target_w:
        left = (new_w - target_w) // 2
        img = img.crop((left, 0, left + target_w, target_h))
    else:
        canvas = Image.new("RGB", (target_w, target_h), (255, 255, 255))
        canvas.paste(img, ((target_w - new_w) // 2, 0))
        img = canvas
    img.save(path_out, "PNG")
    print(f"  banner → {os.path.basename(path_out)}  {img.size}")

def resize_to_icon(path_in, path_out, size=240, crop_bottom_ratio=1.0):
    """裁剪为正方形图标，可选去掉底部文字"""
    img = Image.open(path_in).convert("RGBA")
    img = make_white_bg(img)
    w, h = img.size
    # 先裁掉底部文字
    if crop_bottom_ratio < 1.0:
        img = img.crop((0, 0, w, int(h * crop_bottom_ratio)))
        h = int(h * crop_bottom_ratio)
    # 居中裁为正方形
    side = min(w, h)
    left = (w - side) // 2
    top  = (h - side) // 2
    img  = img.crop((left, top, left + side, top + side))
    # 加一点白色内边距（图标更呼吸）
    pad = int(side * 0.06)
    canvas = Image.new("RGB", (side, side), (255, 255, 255))
    canvas.paste(img, (0, 0))
    inner_w = side - pad * 2
    icon = img.resize((inner_w, inner_w), Image.LANCZOS)
    canvas = Image.new("RGB", (side, side), (255, 255, 255))
    canvas.paste(icon, (pad, pad))
    canvas = canvas.resize((size, size), Image.LANCZOS)
    canvas.save(path_out, "PNG")
    print(f"  icon   → {os.path.basename(path_out)}  {canvas.size}")

print("=== 处理 banner ===")
resize_to_banner(f"{BASE}/3.png", f"{BASE}/banner-cooking.png")
resize_to_banner(f"{BASE}/4.png", f"{BASE}/banner-coffee.png")
resize_to_banner(f"{BASE}/5.png", f"{BASE}/banner-cocktail.png")

print("=== 处理图标 ===")
resize_to_icon(f"{BASE}/6.png",  f"{BASE}/icon-food.png")
resize_to_icon(f"{BASE}/7.png",  f"{BASE}/icon-coffee.png")
resize_to_icon(f"{BASE}/8.png",  f"{BASE}/icon-cocktail.png")
resize_to_icon(f"{BASE}/9.png",  f"{BASE}/icon-random.png",  crop_bottom_ratio=0.78)
resize_to_icon(f"{BASE}/10.png", f"{BASE}/icon-history.png", crop_bottom_ratio=0.78)

print("=== 全部完成 ===")
