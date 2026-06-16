#!/usr/bin/env python3
"""
Конвертує зелену карту України у темно-синю.
Запуск: python3 convert_map.py вхідний_файл.png
або без аргументів якщо файл називається ukraine-map-green.png
"""
import sys
from PIL import Image
import numpy as np

src = sys.argv[1] if len(sys.argv) > 1 else "ukraine-map-green.png"
dst = "ukraine-map.png"

img = Image.open(src).convert("RGBA")
data = np.array(img, dtype=np.float32)

r, g, b, a = data[...,0], data[...,1], data[...,2], data[...,3]

# Визначаємо зелені пікселі: G найбільший канал і R < G
is_green = (g > r) & (g > b) & (g > 80)
# Визначаємо білі/світлі пікселі (межі областей)
is_white = (r > 200) & (g > 200) & (b > 200)

out = data.copy()

# Зелені → темно-синій (#162440 = 22, 36, 64)
out[is_green, 0] = 22
out[is_green, 1] = 36
out[is_green, 2] = 64

# Білі межі → світло-блакитні (#8aaedd = 138, 174, 221)
out[is_white, 0] = 138
out[is_white, 1] = 174
out[is_white, 2] = 221

result = Image.fromarray(out.astype(np.uint8), "RGBA")
result.save(dst)
print(f"✓ Збережено: {dst}")
