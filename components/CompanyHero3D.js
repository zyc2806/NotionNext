import { useEffect, useRef, useState } from 'react'

// Recovered from the repository's original Hero3D, using the same local model and Three.js modules.
function addAtoms(THREE, S, group, ctr, mat) {
  // 原子: 按颜色+半径分组用 InstancedMesh
  const groups = {}
  S.atoms.forEach(a => { const k = a.c + '|' + a.r; groups[k] ||= []; groups[k].push(a) })
  const sph = new THREE.SphereGeometry(1, 40, 24)
  const m4 = new THREE.Matrix4()
  Object.entries(groups).forEach(([k, arr]) => {
    const [c, r] = k.split('|')
    const im = new THREE.InstancedMesh(sph, mat(c), arr.length)
    arr.forEach((a, i) => {
      m4.makeScale(+r, +r, +r).setPosition(new THREE.Vector3(...a.p).sub(ctr))
      im.setMatrixAt(i, m4)
    })
    group.add(im)
  })
}
function addBonds(THREE, S, group, ctr, mat) {
  const m4 = new THREE.Matrix4()
  // 键
  const cyl = new THREE.CylinderGeometry(0.12, 0.12, 1, 16, 1)
  const bgroups = {}
  const up = new THREE.Vector3(0, 1, 0)
  S.bonds.forEach(([i, j]) => {
    const a = new THREE.Vector3(...S.atoms[i].p).sub(ctr)
    const b = new THREE.Vector3(...S.atoms[j].p).sub(ctr)
    const mid = a.clone().add(b).multiplyScalar(0.5);
    [[a, mid, S.atoms[i].c], [mid, b, S.atoms[j].c]].forEach(([s, e, c]) => {
      bgroups[c] ||= []; bgroups[c].push([s, e])
    })
  })
  Object.entries(bgroups).forEach(([c, arr]) => {
    const im = new THREE.InstancedMesh(cyl, mat(c), arr.length)
    arr.forEach(([s, e], i) => {
      const d = e.clone().sub(s)
      const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize())
      m4.compose(s.clone().add(e).multiplyScalar(0.5), q, new THREE.Vector3(1, d.length(), 1))
      im.setMatrixAt(i, m4)
    })
    group.add(im)
  })
}
function addIsosurfaces(THREE, S, group, ctr, mat) {
  // 等值面(可选)
  ;(S.isoMesh || []).forEach(m => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(m.v.map((x, i) => x - ctr.getComponent(i % 3)), 3))
    g.setIndex(m.f)
    g.computeVertexNormals()
    group.add(new THREE.Mesh(g, mat(m.c, { transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide, roughness: 0.15 })))
  })
}
function buildModel(THREE, S) {
  const group = new THREE.Group()
  const ctr = new THREE.Vector3()
  S.atoms.forEach(a => ctr.add(new THREE.Vector3(...a.p)))
  ctr.divideScalar(S.atoms.length)
  const matCache = {}
  const mat = (c, extra = {}) => {
    const k = c + JSON.stringify(extra)
    if (!matCache[k]) {
      matCache[k] = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c), roughness: 0.3, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.12, ...extra })
    }
    return matCache[k]
  }

  addAtoms(THREE, S, group, ctr, mat)
  addBonds(THREE, S, group, ctr, mat)
  addIsosurfaces(THREE, S, group, ctr, mat)
  group.rotation.x = S.tilt ?? -1.05
  const radius = Math.max(...S.atoms.map(a => new THREE.Vector3(...a.p).sub(ctr).length()))
  return { group, radius }
}

function mountModel(el, THREE, OrbitControls, RoomEnvironment, S) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  el.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.04)
  room.dispose()
  scene.environment = environment.texture
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 1000)
  const { group, radius } = buildModel(THREE, S)
  scene.add(group)
  const controls = new OrbitControls(cam, renderer.domElement)
  controls.enablePan = false
  controls.enableDamping = false
  controls.autoRotate = false
  controls.minDistance = radius * 1.2
  controls.maxDistance = radius * 12
  const render = () => renderer.render(scene, cam)
  const setInteractive = enabled => {
    controls.enabled = enabled
    renderer.domElement.style.touchAction = enabled ? 'none' : 'pan-y'
    renderer.domElement.setAttribute('aria-label', enabled ? '三维原子模型：拖动旋转，滚轮或双指缩放' : '三维原子模型：交互关闭，可正常滚动页面')
    el.dataset.interactive = String(enabled)
  }
  const reset = () => {
    const fov = cam.fov * Math.PI / 180
    const dist = radius / Math.sin(Math.min(fov, fov * cam.aspect) / 2) * (S.zoom || 0.82)
    cam.position.set(0, dist * 0.35, dist)
    controls.target.set(0, 0, 0)
    cam.lookAt(0, 0, 0)
    controls.update()
    render()
  }
  const resize = () => {
    const w = el.clientWidth; const h = el.clientHeight
    renderer.setSize(w, h)
    cam.aspect = w / h
    cam.updateProjectionMatrix()
    reset()
  }
  const zoom = factor => {
    const offset = cam.position.clone().sub(controls.target)
    const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance)
    cam.position.copy(controls.target).add(offset.setLength(distance))
    controls.update()
    render()
  }
  controls.addEventListener('change', render)
  setInteractive(false)
  const observer = new ResizeObserver(resize)
  observer.observe(el)
  resize()
  return {
    setInteractive,
    zoom,
    reset,
    dispose() {
      observer.disconnect()
      controls.dispose()
      const geometries = new Set(); const materials = new Set()
      group.traverse(object => {
        if (object.geometry) { geometries.add(object.geometry) }
        if (object.material) { materials.add(object.material) }
      })
      geometries.forEach(g => g.dispose())
      materials.forEach(m => m.dispose())
      environment.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }
}

export default function Hero3D() {
  const ref = useRef(null); const model = useRef(null)
  const [status, setStatus] = useState('loading')
  const [interactive, setInteractive] = useState(false)
  useEffect(() => {
    let stopped = false
    const base = '/company/three/'
    Promise.all([
      import(/* webpackIgnore: true */ base + 'three.module.min.js'),
      import(/* webpackIgnore: true */ base + 'OrbitControls.js'),
      import(/* webpackIgnore: true */ base + 'RoomEnvironment.js'),
      fetch('/company/hero.json').then(r => {
        if (!r.ok) { throw Error('Model data unavailable') }
        return r.json()
      })
    ]).then(([THREE, { OrbitControls }, { RoomEnvironment }, S]) => {
      if (stopped) return
      model.current = mountModel(ref.current, THREE, OrbitControls, RoomEnvironment, S)
      setStatus('ready')
    }).catch(() => { if (!stopped) setStatus('error') })
    return () => { stopped = true; model.current?.dispose(); model.current = null }
  }, [])
  const toggle = () => {
    const enabled = !interactive
    model.current?.setInteractive(enabled)
    setInteractive(enabled)
  }
  const leave = event => {
    if (event.key === 'Escape' && interactive) {
      model.current?.setInteractive(false)
      setInteractive(false)
    }
  }
  let help = '启用交互后可拖动旋转、滚轮或双指缩放；＋／− 按钮可直接缩放。'
  if (interactive) help = '拖动旋转 · 滚轮或双指缩放 · 退出交互后滚动页面（Esc）'
  if (status === 'error') help = '三维模型暂不可用，显示静态预览。'
  return <div className={'zs-hero3d ' + status} onKeyDown={leave}>
    <div className="zs-model-stage">
      <img className="zs-model-fallback" src="/company/img/hero.webp" alt="原有原子结构与等值面模型的静态预览" width="800" height="800" />
      <div ref={ref} className="zs-model-canvas" data-interactive="false" />
    </div>
    <div className="zs-model-tools" aria-label="三维模型操作">
      <button type="button" onClick={toggle} disabled={status !== 'ready'} aria-pressed={interactive}>{interactive ? '退出交互' : '启用三维交互'}</button>
      <button type="button" aria-label="放大模型" disabled={status !== 'ready'} onClick={() => model.current?.zoom(0.85)}>＋</button>
      <button type="button" aria-label="缩小模型" disabled={status !== 'ready'} onClick={() => model.current?.zoom(1.18)}>−</button>
      <button type="button" disabled={status !== 'ready'} onClick={() => model.current?.reset()}>复位</button>
    </div>
    <p className="zs-model-help" role="status">{help}</p>
  </div>
}
