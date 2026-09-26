"""首屏石墨烯片:用真实 CoNC 周期结构扩胞,镜像里的 Co-N4 还原成完整石墨烯,
只保留中心位点;按环心取圆形片(只含完整六元环),边缘 C 加 H 封端。"""
import numpy as np, json
from ase import Atoms
from ase.calculators.vasp import VaspChargeDensity
from scipy.spatial import cKDTree
CHG = '/Users/zhangyichen/Desktop/理论计算合作/中南大学-甲苯氧化@CoNC-陈善勇/论文撰写/理论计算绘图数据_0413最新版/a6_CoNC差分电荷密度/CoNC_CHGDIFF.vasp'
R_RING = 18.0
NREP = 7
cd = VaspChargeDensity(CHG); a = cd.atoms[-1]; cell = a.cell.array
syms = a.get_chemical_symbols(); co = syms.index('Co'); zc = a.positions[co, 2]
layer = [i for i in range(len(a)) if abs(a.positions[i, 2] - zc) < 1.2]
ads = [i for i in range(len(a)) if abs(a.positions[i, 2] - zc) >= 1.2]
# 原胞层内原子展开到 3x3 找 Co 周围的 N,求双空位里两个缺失 C 的位置
r3 = a.repeat((3, 3, 1)); P3 = r3.positions; sh = cell[0] + cell[1]
cpos = a.positions[co] + sh
Ns = [P3[i] for i in range(len(r3)) if r3[i].symbol == 'N' and np.linalg.norm(P3[i] - cpos) < 2.5]
miss = []
for i in range(4):
    for j in range(i + 1, 4):
        if 2.2 < np.linalg.norm(Ns[i] - Ns[j]) < 2.75:
            miss.append(((Ns[i] + Ns[j]) / 2 + cpos) / 2 - sh)
print('missing C', len(miss), [round(np.linalg.norm(m - a.positions[co]), 2) for m in miss])
# 构造"完整石墨烯"原胞版本(用于镜像)与带位点版本(用于中心)
base_S = [syms[i] for i in layer]; base_X = a.positions[layer]
pure_S = ['C' if s in ('N',) else s for s in base_S if s != 'Co']
pure_X = np.array([x for s, x in zip(base_S, base_X) if s != 'Co'])
pure_S += ['C'] * len(miss); pure_X = np.vstack([pure_X, miss])
S, X = [], []
h = NREP // 2
for i in range(-h, h + 1):
    for j in range(-h, h + 1):
        off = i * cell[0] + j * cell[1]
        if i == 0 and j == 0:
            S += base_S; X += list(base_X + off)
        else:
            S += pure_S; X += list(pure_X + off)
X = np.array(X); cen = a.positions[co]
P = X[:, :2]; t = cKDTree(P)
centers = []
for i, j in t.query_pairs(2.95):
    d = np.linalg.norm(P[i] - P[j])
    if 2.6 < d < 2.95:
        c = (P[i] + P[j]) / 2
        if np.linalg.norm(c - cen[:2]) < R_RING and len(t.query_ball_point(c, 1.6)) == 6 and not any(np.linalg.norm(c - q) < 0.3 for q in centers):
            centers.append(c)
keep = set()
for c in centers: keep.update(t.query_ball_point(c, 1.6))
keep.update(t.query_ball_point(cen[:2], 3.2))
keep = sorted(keep); X = X[keep]; S = [S[k] for k in keep]
while True:
    tt = cKDTree(X); nb = [len(tt.query_ball_point(x, 1.7)) - 1 for x in X]
    bad = [k for k, v in enumerate(nb) if v <= 1 and S[k] == 'C']
    if not bad: break
    X = np.delete(X, bad, 0); S = [s for k, s in enumerate(S) if k not in bad]
tt = cKDTree(X); H = []
for k, x in enumerate(X):
    if S[k] != 'C': continue
    idx = [j for j in tt.query_ball_point(x, 1.7) if j != k]
    if len(idx) == 2:
        v = 2 * x - X[idx[0]] - X[idx[1]]; v[2] = 0; v /= np.linalg.norm(v); H.append(x + 1.09 * v)
flake = Atoms(S + ['H'] * len(H), positions=np.vstack([X, H])) + a[ads]
flake.write('hero.xyz')
print('atoms', len(flake), 'rings', len(centers), 'H', len(H), {s: S.count(s) for s in set(S)})
from skimage.measure import marching_cubes
data = cd.chg[-1]; meshes = []
for sign, col in ((1, '#19C3E6'), (-1, '#FFB23F')):
    v, f, _, _ = marching_cubes(sign * data, 0.006, step_size=2)
    cart = (v / np.array(data.shape)) @ cell
    # 等值面可能跨周期边界,平移到离 Co 最近的镜像
    fr = np.linalg.solve(cell.T, (cart - cen).T).T; fr[:, :2] -= np.round(fr[:, :2]); cart = fr @ cell + cen
    kk = np.linalg.norm(cart - cen, axis=1) < 7; fk = f[kk[f].all(1)]
    # 平移后跨界的三角形会被拉长,去掉
    e = np.max([np.linalg.norm(cart[fk[:, p]] - cart[fk[:, q]], axis=1) for p, q in ((0, 1), (1, 2), (0, 2))], axis=0)
    fk = fk[e < 1.5]
    u = np.unique(fk); rm = -np.ones(len(cart), int); rm[u] = np.arange(len(u))
    meshes.append({'c': col, 'v': cart[u].round(2).ravel().tolist(), 'f': rm[fk].ravel().tolist()})
json.dump(meshes, open('hero_iso.json', 'w'))
