"""从 CoNC 周期胞切一片只含完整六元环的圆形石墨烯片,边缘 C 加 H 封端。"""
import numpy as np, json
from ase import Atoms
from ase.calculators.vasp import VaspChargeDensity
from scipy.spatial import cKDTree
CHG = '/Users/zhangyichen/Desktop/理论计算合作/中南大学-甲苯氧化@CoNC-陈善勇/论文撰写/理论计算绘图数据_0413最新版/a6_CoNC差分电荷密度/CoNC_CHGDIFF.vasp'
a = VaspChargeDensity(CHG).atoms[-1]
syms = a.get_chemical_symbols(); co = syms.index('Co'); zc = a.positions[co, 2]
R_RING = 12.5   # 取环心在这个半径内的环
r = a.repeat((5, 5, 1)); n = len(a)
mid = 12  # 5x5 中心像
cen = r.positions[co + mid * n]
rs = r.get_chemical_symbols()
layer = np.where(np.abs(r.positions[:, 2] - zc) < 1.2)[0]
ads = [i for i in range(len(r)) if i // n == mid and abs(r.positions[i, 2] - zc) >= 1.2]
P = r.positions[layer]; t = cKDTree(P[:, :2])
# 其他像的 Co 及其 N 视为缺陷,中心以外的环心若靠近它们就不要
other_co = [r.positions[co + k * n] for k in range(25) if k != mid]
# 找环心:对位原子对 (2.84 Å) 的中点,周围 1.5 Å 内正好 6 个原子
pairs = t.query_pairs(2.95)
cand = []
for i, j in pairs:
    d = np.linalg.norm(P[i, :2] - P[j, :2])
    if 2.6 < d < 2.95: cand.append((P[i, :2] + P[j, :2]) / 2)
cand = np.array(cand)
centers = []
for c in cand:
    if any(np.linalg.norm(c - q) < 0.3 for q in centers): continue
    idx = t.query_ball_point(c, 1.6)
    if len(idx) == 6 and np.linalg.norm(c - cen[:2]) < R_RING and min(np.linalg.norm(c - o[:2]) for o in other_co) > 3.2:
        centers.append(c)
keep = set()
for c in centers: keep.update(t.query_ball_point(c, 1.6))
# Co-N4 周围 3.2 Å 内的原子(含五元环/N)全部保留
keep.update(t.query_ball_point(cen[:2], 3.2))
keep = sorted(keep)
S = [rs[layer[i]] for i in keep]; X = P[keep]
# 其他像残留的 N 换成 C
for k, (s, x) in enumerate(zip(S, X)):
    if s == 'N' and np.linalg.norm(x - cen) > 3: S[k] = 'C'
# 反复剔除只有 1 个近邻的悬挂原子
while True:
    tt = cKDTree(X); nb = [len(tt.query_ball_point(x, 1.7)) - 1 for x in X]
    bad = [k for k, v in enumerate(nb) if v <= 1 and S[k] == 'C']
    if not bad: break
    X = np.delete(X, bad, 0); S = [s for k, s in enumerate(S) if k not in bad]
# 边缘 C(2 个近邻)沿外法向加 H
tt = cKDTree(X); H = []
for k, x in enumerate(X):
    if S[k] != 'C': continue
    idx = [j for j in tt.query_ball_point(x, 1.7) if j != k]
    if len(idx) == 2:
        v = 2 * x - X[idx[0]] - X[idx[1]]; v[2] = 0; v /= np.linalg.norm(v)
        H.append(x + 1.09 * v)
flake = Atoms(S + ['H'] * len(H), positions=np.vstack([X, H]))
flake += r[ads]
flake.write('hero.xyz')
print('atoms', len(flake), 'rings', len(centers), 'H', len(H))
# 等值面(平移到中心像)
data = VaspChargeDensity(CHG).chg[-1]; cell = a.cell.array
from skimage.measure import marching_cubes
shift = cen - a.positions[co]
meshes = []
for sign, col in ((1, '#19C3E6'), (-1, '#FFB23F')):
    v, f, _, _ = marching_cubes(sign * data, 0.006, step_size=2)
    cart = (v / np.array(data.shape)) @ cell
    kk = np.linalg.norm(cart - a.positions[co], axis=1) < 7; fk = f[kk[f].all(1)]
    u = np.unique(fk); rm = -np.ones(len(cart), int); rm[u] = np.arange(len(u))
    meshes.append({'c': col, 'v': (cart[u] + shift).round(2).ravel().tolist(), 'f': rm[fk].ravel().tolist()})
json.dump(meshes, open('hero_iso.json', 'w'))
