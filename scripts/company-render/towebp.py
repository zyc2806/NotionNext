import glob, os
from PIL import Image
src = os.path.dirname(os.path.abspath(__file__)) + '/final'
dst = '/tmp/NotionNext/public/company/img'
os.makedirs(dst, exist_ok=True)
for f in sorted([src + '/' + x + '.png' for x in __import__('sys').argv[1:]] or glob.glob(src + '/*.png')):
    n = os.path.basename(f)[:-4]
    im = Image.open(f).convert('RGBA')
    a = im.split()[3].point(lambda v: 255 if v > 12 else 0)
    x0, y0, x1, y1 = a.getbbox()
    pad = int(0.05 * max(x1 - x0, y1 - y0))
    if not n.startswith('case'):  # 服务卡片:裁到内容;案例保留画幅
        im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
    # 边缘渐隐,避免接影面阴影在画幅边上出现硬边
    import numpy as np
    arr = np.array(im).astype(np.float32)
    h, w = arr.shape[:2]; m = int(0.08 * min(h, w))
    ry = np.clip(np.minimum(np.arange(h), np.arange(h)[::-1]) / m, 0, 1)
    rx = np.clip(np.minimum(np.arange(w), np.arange(w)[::-1]) / m, 0, 1)
    fade = np.outer(ry, rx); fade = fade * fade * (3 - 2 * fade)
    arr[..., 3] *= fade
    im = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    im.thumbnail((1400, 1400))
    im.save(f'{dst}/{n}.webp', 'WEBP', quality=86, method=4)
    print(n, im.size, os.path.getsize(f'{dst}/{n}.webp') // 1024, 'KB')
