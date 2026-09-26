# 公司页配图渲染

`/company` 页面的结构图都由这里的脚本生成,风格统一:白底透明、Cycles 渲染、接影面软阴影。

1. `python prep.py <结构文件> <名字> [--iso CHGDIFF.vasp --level 0.008] [--wrap] [--mscale 0.95]` 生成 `<名字>.json`
2. `blender -b -P bl_render.py -- $PWD/<名字>.json $PWD/final/<输出>.png samples=200 w=1600 h=1200 az=30 el=30 [cell=1] [zoom=1.3]`
3. `python towebp.py` 把 final/*.png 裁边、边缘渐隐后转成 `public/company/img/*.webp`(脚本里输出目录写的是 /tmp/NotionNext,换位置要改)

首屏 3D 结构读 `public/company/hero.json`(原子、键、差分电荷等值面网格),由 three.js 在浏览器里画。
