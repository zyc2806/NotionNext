"""blender -b -P bl_render.py -- scene.json out.png [key=val ...]
key: az el (度) lens w h samples dof(0/1) focus(atom idx 或 'center') fstop shadow(0/1) margin bond(1/0) iso_alpha
"""
import bpy, json, sys, math
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
O = dict(cell=0, az=35, el=28, lens=60, w=1600, h=1200, samples=160, dof=1, fstop=2.8, shadow=1, margin=1.08,
         bond=1, iso_alpha=0.5, roll=0, focus='center', zoom=1.0, pos_col='#19C3E6', neg_col='#FFB23F', bondr=0.13)
for kv in argv[2:]:
    k, v = kv.split('=', 1)
    O[k] = v if k in ('focus', 'pos_col', 'neg_col', 'cell_col') else float(v)
S = json.load(open(SRC))

def hex2rgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c] + [1]

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception as e:
    print('GPU fail', e)
sc.cycles.samples = int(O['samples']); sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.render.resolution_x, sc.render.resolution_y = int(O['w']), int(O['h'])
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'

# 世界光:柔和白
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = 0.55

mats = {}
def mat(color, rough=0.28, coat=0.6, alpha=1.0, emit=0.0):
    key = (color, rough, coat, alpha, emit)
    if key in mats: return mats[key]
    m = bpy.data.materials.new('m%d' % len(mats)); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = hex2rgb(color)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = 0.08
    p.inputs['Specular IOR Level'].default_value = 0.6
    if emit:
        p.inputs['Emission Color'].default_value = hex2rgb(color); p.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
    mats[key] = m; return m

A = S['atoms']
P = [Vector(a['p']) for a in A]
ctr = sum(P, Vector()) / len(P)

# 原子:按(元素,半径)共享网格,用链接复制提速
proto = {}
coll = bpy.data.collections.new('mol'); sc.collection.children.link(coll)
for a, p in zip(A, P):
    key = (a['s'], a['r'])
    if key not in proto:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=a['r'])
        o = bpy.context.object; bpy.ops.object.shade_smooth()
        o.data.materials.append(mat(a['c'])); proto[key] = o
        bpy.context.scene.collection.objects.unlink(o); coll.objects.link(o)
        o.location = p - ctr
    else:
        o = proto[key].copy(); o.location = p - ctr; coll.objects.link(o)

# 键:半截各取原子色
if O['bond'] and S['bonds']:
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=O['bondr'], depth=1)
    cyl = bpy.context.object; bpy.ops.object.shade_smooth()
    sc.collection.objects.unlink(cyl)
    for i, j in S['bonds']:
        a, b = P[i] - ctr, P[j] - ctr
        for (s, e, col) in ((a, (a + b) / 2, A[i]['c']), ((a + b) / 2, b, A[j]['c'])):
            d = e - s; L = d.length
            if L < 1e-3: continue
            o = cyl.copy(); o.data = cyl.data.copy() if False else cyl.data
            o.location = (s + e) / 2
            o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
            o.scale = (1, 1, L)
            o['col'] = col
            coll.objects.link(o)
    # 每种颜色一份网格材质
    cmesh = {}
    for o in list(coll.objects):
        if 'col' in o.keys():
            c = o['col']
            if c not in cmesh:
                me = cyl.data.copy(); me.materials.clear(); me.materials.append(mat(c)); cmesh[c] = me
            o.data = cmesh[c]

# 等值面
for iso in S.get('iso', []):
    bpy.ops.wm.obj_import(filepath=iso['file'], forward_axis='Y', up_axis='Z')
    o = bpy.context.selected_objects[0]
    o.location = -ctr
    bpy.ops.object.shade_smooth()
    col = O['pos_col'] if iso['kind'] == 'pos' else O['neg_col']
    o.data.materials.clear(); o.data.materials.append(mat(col, rough=0.15, coat=1.0, alpha=O['iso_alpha'], emit=0.15))

# 晶胞框线
if O.get('cell', 0) and S.get('cell'):
    import itertools
    C = [Vector(v) for v in S['cell']]
    o0 = Vector(S.get('origin', [0, 0, 0]))
    corners = {}
    for f in itertools.product((0, 1), repeat=3):
        corners[f] = o0 + C[0] * f[0] + C[1] * f[1] + C[2] * f[2] - ctr
    cm = mat(O.get('cell_col', '#2F5BFF'), rough=0.3, coat=0.0, emit=1.2)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=O.get('cell_r', 0.06), depth=1)
    ce = bpy.context.object; sc.collection.objects.unlink(ce); ce.data.materials.append(cm)
    for f, p in corners.items():
        for ax in range(3):
            if f[ax] == 0:
                g = list(f); g[ax] = 1; q = corners[tuple(g)]
                o = ce.copy(); d = q - p; o.location = (p + q) / 2
                o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
                o.scale = (1, 1, d.length); coll.objects.link(o)

# 相机
az, el = math.radians(O['az']), math.radians(O['el'])
dirv = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
cam_d = bpy.data.cameras.new('C'); cam_d.lens = O['lens']
cam = bpy.data.objects.new('C', cam_d); sc.collection.objects.link(cam); sc.camera = cam
up = Vector((0, 0, 1))
fwd = -dirv
right = fwd.cross(up).normalized(); upv = right.cross(fwd).normalized()
if O['roll']:
    r = math.radians(O['roll']); right, upv = right * math.cos(r) + upv * math.sin(r), upv * math.cos(r) - right * math.sin(r)
rot = Matrix((right, upv, -fwd)).transposed()
cam.rotation_euler = rot.to_euler()
# 依包围投影求距离
pts = [p - ctr for p in P]
if O['cell'] and S.get('cell'):
    import itertools
    C3 = [Vector(v) for v in S['cell']]
    for f in itertools.product((0, 1), repeat=3):
        pts.append(C3[0] * f[0] + C3[1] * f[1] + C3[2] * f[2] - ctr)
sw = cam_d.sensor_width
fx = sw / cam_d.lens / 2
aspect = O['w'] / O['h']
fy = fx / aspect if aspect >= 1 else fx
if aspect < 1: fx = fx * aspect
dist = 0
for p in pts:
    x, y, z = p.dot(right), p.dot(upv), p.dot(dirv)
    rr = 1.0
    dist = max(dist, (abs(x) + rr) / fx * O['margin'] + z, (abs(y) + rr) / fy * O['margin'] + z)
dist /= O['zoom']
cam.location = dirv * dist
if O['dof']:
    cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = O['fstop']
    if O['focus'] == 'center': cam_d.dof.focus_distance = dist
    else: cam_d.dof.focus_distance = (cam.location - pts[int(O['focus'])]).length

# 灯光:主柔光 + 轮廓光 + 补光
def area(name, loc, energy, size, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc
    d = -Vector(loc).normalized(); o.rotation_euler = Vector((0, 0, -1)).rotation_difference(d).to_euler()
R = dist
area('key', dirv * R * 0.6 + upv * R * 0.8 + right * R * 0.6, 900 * (R / 20) ** 2, R * 0.5)
area('rim', -dirv * R * 0.7 + upv * R * 0.5, 700 * (R / 20) ** 2, R * 0.4, (0.75, 0.88, 1.0))
area('fill', dirv * R * 0.5 - right * R * 0.8, 250 * (R / 20) ** 2, R * 0.6)

# 接影面
if O['shadow']:
    zmin = min(p.z for p in pts) - max(a['r'] for a in A) - 0.05
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, zmin))
    pl = bpy.context.object; pl.is_shadow_catcher = True

sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('WROTE', OUT)
