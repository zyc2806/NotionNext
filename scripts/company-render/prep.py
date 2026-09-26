"""结构 -> scene.json(原子/键/可选等值面 obj),供 Blender 渲染。
用法: python prep.py <结构文件> <输出前缀> [--iso CUBE_OR_CHGDIFF --level 0.002] [--sel 'z>5'] [--rep 2,2,1]
"""
import argparse, json, numpy as np
from ase.io import read
from ase.neighborlist import natural_cutoffs, NeighborList

# 统一品牌调色:低饱和、和白底页面协调
COL = {
 'H': '#F4F6FA', 'C': '#3A4250', 'N': '#3F7BFF', 'O': '#FF5A5F', 'S': '#F2C14E', 'P': '#F28C38',
 'F': '#7FD8BE', 'Cl': '#5FD3A0', 'Br': '#E8A13A', 'Se': '#E3A857', 'B': '#F7A8A8',
 'Li': '#B18CFF', 'Na': '#9B7BFF', 'K': '#8A6BEE', 'Mg': '#6EDC8C', 'Ca': '#88D48A',
 'Fe': '#E07A3F', 'Co': '#3FB8D9', 'Ni': '#5DCC9A', 'Cu': '#D98A5A', 'Zn': '#8E9CB8', 'Mn': '#B06FD1',
 'Cr': '#6C8AE0', 'Mo': '#4FB3A9', 'W': '#5A7FA8', 'V': '#A5A9B4', 'Ti': '#9FB3C8', 'Zr': '#7FC7C0',
 'Pt': '#C9CFD8', 'Ru': '#2FA39A', 'Ir': '#3E8FD6', 'Au': '#F5C451', 'Ag': '#D0D6DF', 'Pd': '#8FB0D9',
 'In': '#A67DB8', 'Pb': '#4A5568', 'Bi': '#B85C8A', 'Te': '#C98A3C', 'Ta': '#5C9FD1', 'Y': '#7ED3E0', 'Al': '#AEB9C9',
 'Si': '#E6B86A', 'Ga': '#C69A9A', 'Cs': '#6E5BC4', 'Sn': '#8C9BAE', 'Ce': '#E8D37A', 'Eu': '#F07CA0',
}
RAD = {'H': 0.26}
NONMET = set('H B C N O F P S Cl Se Br I Si Te'.split())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--index', default='-1')
    ap.add_argument('--fmt', default=None)
    ap.add_argument('--rep', default='1,1,1')
    ap.add_argument('--wrap', action='store_true')
    ap.add_argument('--sel', default=None, help='python 表达式,变量 x y z sym')
    ap.add_argument('--iso', default=None); ap.add_argument('--level', type=float, default=0.002)
    ap.add_argument('--scale', type=float, default=0.42)
    ap.add_argument('--zshift', type=float, default=0.0)
    ap.add_argument('--mscale', type=float, default=0.6)
    a = ap.parse_args()
    at = read(a.src, index=a.index, format=a.fmt)
    if a.wrap: at.wrap()
    rep = tuple(int(x) for x in a.rep.split(','))
    if rep != (1, 1, 1): at = at.repeat(rep)
    if a.sel:
        keep = []
        for i, (p, s) in enumerate(zip(at.positions, at.get_chemical_symbols())):
            x, y, z = p
            if eval(a.sel): keep.append(i)
        at = at[keep]
    nl = NeighborList([c * 1.08 for c in natural_cutoffs(at)], self_interaction=False, bothways=False, skin=0)
    nl.update(at)
    bonds = []
    pos = at.positions
    syms0 = at.get_chemical_symbols()
    for i in range(len(at)):
        idx, off = nl.get_neighbors(i)
        for j, o in zip(idx, off):
            if np.any(o != 0): continue  # 不画跨界键
            if syms0[i] not in NONMET and syms0[j] not in NONMET: continue  # 金属-金属不画键
            bonds.append([int(i), int(j)])
    syms = at.get_chemical_symbols()
    from ase.data import covalent_radii, atomic_numbers
    atoms = [{'s': s, 'p': [round(float(v), 4) for v in p],
              'r': round(RAD.get(s, covalent_radii[atomic_numbers[s]] * (a.scale if s in NONMET else a.mscale)), 3),
              'c': COL.get(s, '#9AA5B5')} for s, p in zip(syms, pos)]
    scene = {'atoms': atoms, 'bonds': bonds, 'cell': at.cell.array.tolist(), 'origin': [0, 0, 0]}
    if a.iso:
        scene['iso'] = iso_meshes(a.iso, a.level, a.out, a.zshift)
    json.dump(scene, open(a.out + '.json', 'w'))
    print(len(atoms), 'atoms', len(bonds), 'bonds', {s: syms.count(s) for s in set(syms)})

def iso_meshes(path, level, out, zshift=0.0):
    from skimage.measure import marching_cubes
    if path.endswith('.cube'):
        from ase.io.cube import read_cube_data
        data, at = read_cube_data(path); cell = at.cell.array
    else:
        from ase.calculators.vasp import VaspChargeDensity
        cd = VaspChargeDensity(path); data = cd.chg[-1]; cell = cd.atoms[-1].cell.array
    n = np.array(data.shape)
    res = []
    for sign, name in ((1, 'pos'), (-1, 'neg')):
        d = sign * data
        if d.max() < level: continue
        v, f, _, _ = marching_cubes(d, level)
        frac = v / n
        frac[:, 2] = (frac[:, 2] - zshift) % 1
        cart = frac @ cell
        fn = f'{out}_{name}.obj'
        with open(fn, 'w') as fo:
            for p in cart: fo.write('v %.4f %.4f %.4f\n' % tuple(p))
            for t in f: fo.write('f %d %d %d\n' % tuple(t + 1))
        res.append({'file': fn, 'kind': name})
    return res

if __name__ == '__main__':
    main()
