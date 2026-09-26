import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import co from '@/data/company.json'

// 化学式里的 unicode 下标转成 <sub>
const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' }
const chem = (s) => {
  const out = []
  let buf = ''
  let sub = ''
  for (const ch of s) {
    if (SUB[ch]) {
      if (buf) { out.push(buf); buf = '' }
      sub += SUB[ch]
    } else {
      if (sub) { out.push(<sub key={out.length}>{sub}</sub>); sub = '' }
      buf += ch
    }
  }
  if (sub) out.push(<sub key={out.length}>{sub}</sub>)
  if (buf) out.push(buf)
  return out
}

const Mark = ({ size = 34 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <defs>
      <linearGradient id="zsg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2F5BFF" />
        <stop offset="1" stopColor="#14C8D8" />
      </linearGradient>
    </defs>
    <path d="M32 6 L54.5 19 L54.5 45 L32 58 L9.5 45 L9.5 19 Z" fill="none" stroke="url(#zsg)" strokeWidth="4" strokeLinejoin="round" />
    <g stroke="url(#zsg)" strokeWidth="3.2" strokeLinecap="round">
      <line x1="32" y1="32" x2="32" y2="10" />
      <line x1="32" y1="32" x2="51" y2="43" />
      <line x1="32" y1="32" x2="13" y2="43" />
    </g>
    <circle cx="32" cy="32" r="7.5" fill="url(#zsg)" />
    <circle cx="32" cy="32" r="3" fill="#fff" />
    <circle cx="54.5" cy="19" r="3.6" fill="#2F5BFF" />
    <circle cx="9.5" cy="19" r="3.6" fill="#14C8D8" />
    <circle cx="32" cy="58" r="3.6" fill="#1E8FEA" />
  </svg>
)

// 首屏可拖动的 3D 结构(three.js 从 public 自托管加载)
function Hero3D() {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let stop = false
    let cleanup = () => {}
    const base = '/company/three/'
    Promise.all([
      import(/* webpackIgnore: true */ base + 'three.module.min.js'),
      import(/* webpackIgnore: true */ base + 'OrbitControls.js'),
      import(/* webpackIgnore: true */ base + 'RoomEnvironment.js'),
      fetch('/company/hero.json').then(r => r.json())
    ]).then(([THREE, { OrbitControls }, { RoomEnvironment }, S]) => {
      if (stop || !ref.current) return
      const el = ref.current
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.05
      el.appendChild(renderer.domElement)
      const scene = new THREE.Scene()
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 1000)
      const group = new THREE.Group()
      scene.add(group)

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
      // 原子: 按颜色+半径分组用 InstancedMesh
      const groups = {}
      S.atoms.forEach(a => { const k = a.c + '|' + a.r; (groups[k] = groups[k] || []).push(a) })
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
      // 键
      const cyl = new THREE.CylinderGeometry(0.12, 0.12, 1, 16, 1)
      const bgroups = {}
      const up = new THREE.Vector3(0, 1, 0)
      S.bonds.forEach(([i, j]) => {
        const a = new THREE.Vector3(...S.atoms[i].p).sub(ctr)
        const b = new THREE.Vector3(...S.atoms[j].p).sub(ctr)
        const mid = a.clone().add(b).multiplyScalar(0.5);
        [[a, mid, S.atoms[i].c], [mid, b, S.atoms[j].c]].forEach(([s, e, c]) => {
          (bgroups[c] = bgroups[c] || []).push([s, e])
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
      // 等值面(可选)
      ;(S.isoMesh || []).forEach(m => {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(m.v.map((x, i) => x - ctr.getComponent(i % 3)), 3))
        g.setIndex(m.f)
        g.computeVertexNormals()
        group.add(new THREE.Mesh(g, mat(m.c, { transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide, roughness: 0.15 })))
      })
      group.rotation.x = S.tilt || -1.05

      let R = 0
      S.atoms.forEach(a => { R = Math.max(R, new THREE.Vector3(...a.p).sub(ctr).length()) })
      const controls = new OrbitControls(cam, renderer.domElement)
      controls.enableZoom = false
      controls.enablePan = false
      controls.enableDamping = true
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.7
      // 手机上不接管触摸,免得页面划不动
      if (window.matchMedia('(pointer: coarse)').matches) {
        controls.enableRotate = false
        renderer.domElement.style.touchAction = 'pan-y'
      }
      const fit = () => {
        const w = el.clientWidth
        const h = el.clientHeight
        renderer.setSize(w, h)
        cam.aspect = w / h
        const fov = cam.fov * Math.PI / 180
        const dist = R / Math.sin(Math.min(fov, fov * cam.aspect) / 2) * (S.zoom || 0.82)
        cam.position.set(0, dist * 0.35, dist)
        cam.lookAt(0, 0, 0)
        if (w > 900) cam.setViewOffset(w, h, -w * 0.12, 0, w, h)
        else cam.clearViewOffset()
        cam.updateProjectionMatrix()
      }
      fit()
      window.addEventListener('resize', fit)
      let raf
      const loop = () => { controls.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop) }
      loop()
      setReady(true)
      cleanup = () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', fit)
        renderer.dispose()
        el.innerHTML = ''
      }
    }).catch(() => {})
    return () => { stop = true; cleanup() }
  }, [])
  return (
    <div className={'zs-hero3d' + (ready ? ' on' : '')}>
      <img className="zs-hero-fallback" src="/company/img/hero.webp" alt="" />
      <div ref={ref} className="zs-hero-canvas" />
    </div>
  )
}

function Counter({ value, suffix }) {
  const ref = useRef(null)
  const [n, setN] = useState(value)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    setN(0)
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 1400)
        setN(Math.round(value * (1 - Math.pow(1 - k, 3))))
        if (k < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value])
  return <span ref={ref}>{n}{suffix}</span>
}

function Contact() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    try {
      navigator.clipboard.writeText(co.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (e) {}
  }
  return (
    <aside className="zs-float" aria-label="联系方式">
      <div className="zs-float-head"><span className="zs-dot" />计算咨询</div>
      <p className="zs-float-t">评估不收费，按计算量报价</p>
      <button className="zs-float-mail" onClick={copy} title="点击复制">
        <span>{co.email}</span>
        <em>{copied ? '已复制' : '复制'}</em>
      </button>
      <a className="zs-float-btn" href={'mailto:' + co.email + '?subject=' + encodeURIComponent('计算需求咨询')}>发邮件咨询</a>
      <p className="zs-float-s">点邮箱可复制</p>
    </aside>
  )
}

const Title = ({ no, id }) => (
  <div className="zs-title reveal">
    <span className="zs-no">{no} · {co.sections[id][0]}</span>
    <h2>{co.sections[id][1]}</h2>
  </div>
)

export default function Company() {
  useEffect(() => {
    const els = document.querySelectorAll('.zs-root .reveal')
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return }
    const io = new IntersectionObserver((es) => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [])

  return (
    <div className="zs-root">
      <Head>
        <title>{co.short} · 第一性原理与分子动力学计算服务</title>
        <meta name="description" content="北京智算分子科技有限公司提供 DFT、从头算分子动力学、机器学习势函数计算服务，覆盖催化、电子结构、电池材料与分子计算。清华博士亲自计算，可开发票。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/company/mark.svg" />
      </Head>

      <header className="zs-nav">
        <a className="zs-brand" href="#top">
          <Mark />
          <span className="zs-brand-t"><b>{co.short}</b><i>{co.en}</i></span>
        </a>
        <nav>
          <a href="#services">计算服务</a>
          <a href="#why">特点</a>
          <a href="#cases">案例</a>
          <a href="#about">关于</a>
          <a className="zs-nav-cta" href={'mailto:' + co.email}>联系我们</a>
        </nav>
      </header>

      <section className="zs-hero" id="top">
        <div className="zs-grid-bg" />
        <div className="zs-orb zs-orb1" />
        <div className="zs-orb zs-orb2" />
        <div className="zs-hero-in">
          <div className="zs-hero-text">
            <p className="zs-eyebrow">{co.hero.eyebrow}</p>
            <h1>{co.hero.title.slice(0, -1).map(t => <span key={t} className="zs-h1l">{t}</span>)}<span className="zs-grad zs-h1l">{co.hero.title[co.hero.title.length - 1]}</span></h1>
            <p className="zs-lead">{co.hero.lead}</p>
            <div className="zs-tags">
              {co.hero.tags.map((t, i) => <span key={t} className="zs-tag"><i>0{i + 1}</i>{t}</span>)}
            </div>
            <div className="zs-hero-cta">
              <a className="zs-btn" href="#services">能算什么</a>
              <a className="zs-btn ghost" href={'mailto:' + co.email}>发邮件咨询</a>
            </div>
          </div>
          <Hero3D />
        </div>
        <div className="zs-stats">
          {co.stats.map(s => (
            <div key={s.label} className="zs-stat">
              <b><Counter value={s.value} suffix={s.suffix} /></b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="zs-strip" id="schools">
        <p className="zs-strip-t">{co.schoolsTitle}</p>
        <div className="zs-marquee">
          <div className="zs-track">
            {[0, 1].map(k => co.schools.map(x => (
              <div key={k + x.name} className={'zs-school' + (x.wide ? ' wide' : '')} aria-hidden={k === 1}>
                <img src={'/company/logos/' + x.logo} alt={k ? '' : x.name} />
                <span>{x.name}</span>
              </div>
            )))}
          </div>
        </div>
      </section>

      <section className="zs-sec" id="services">
        <Title no="01" id="services" />
        <div className="zs-svc">
          {co.services.map((s, i) => (
            <article key={s.key} className="zs-card reveal" style={{ transitionDelay: (i % 3) * 80 + 'ms' }}>
              <div className="zs-card-img"><img src={s.img} alt={s.title} loading="lazy" /></div>
              <div className="zs-card-body">
                <div className="zs-card-h"><h3>{s.title}</h3><span>{s.en}</span></div>
                <ul>{s.items.map(it => <li key={it}>{chem(it)}</li>)}</ul>
                <div className="zs-soft">{s.soft.map(x => <span key={x}>{x}</span>)}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="zs-sec zs-why-wrap" id="why">
        <Title no="02" id="why" />
        <div className="zs-why">
          {co.advantages.map((a, i) => (
            <div key={a.no} className={'zs-why-c reveal' + (i < 3 ? ' key' : '')} style={{ transitionDelay: i * 80 + 'ms' }}>
              <span className="zs-why-no">{a.no}</span>
              <h3>{a.title}</h3>
              <p>{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="zs-sec" id="cases">
        <Title no="03" id="cases" />
        <div className="zs-gallery reveal">
          <div className="zs-gtrack">
            {[0, 1].map(k => co.cases.map(c => (
              <figure key={k + c.title} className="zs-case" aria-hidden={k === 1}>
                <img src={c.img} alt={k ? '' : c.title} loading="lazy" />
                <figcaption><span>{c.tag}</span><b>{chem(c.title)}</b></figcaption>
              </figure>
            )))}
          </div>
        </div>
      </section>

      <section className="zs-sec" id="about">
        <Title no="04" id="about" />
        <div className="zs-founder reveal">
          <div className="zs-badge">
            <Mark size={56} />
            <b>清华大学</b>
            <span>化学工程 · 博士</span>
          </div>
          <div>
            <h3>{co.founder.role}</h3>
            <ul>{co.founder.lines.map(l => <li key={l}>{l}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="zs-sec">
        <Title no="05" id="steps" />
        <ol className="zs-steps">
          {co.steps.map((s, i) => (
            <li key={s.title} className="reveal" style={{ transitionDelay: i * 90 + 'ms' }}>
              <span>STEP {i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="zs-cta reveal">
          <div>
            <h3>{co.cta.title}</h3>
            <p>{co.cta.text}</p>
          </div>
          <a className="zs-btn" href={'mailto:' + co.email + '?subject=' + encodeURIComponent('计算需求咨询')}>{co.email}</a>
        </div>
      </section>

      <footer className="zs-foot">
        <div className="zs-foot-in">
          <div className="zs-brand"><Mark size={28} /><span className="zs-brand-t"><b>{co.name}</b><i>{co.en} Co., Ltd.</i></span></div>
          <div className="zs-foot-r">
            <span>统一社会信用代码 {co.creditCode}</span>
            <span>联系邮箱 {co.email}</span>
          </div>
        </div>
        <p className="zs-copy">© {new Date().getFullYear()} {co.name}</p>
      </footer>

      <Contact />

      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </div>
  )
}

const CSS = `
        .zs-root {
          --ink: #0b1b33; --sub: #52627a; --mute: #8a97aa; --line: #e6ebf2; --soft: #f5f8fc;
          --b1: #2f5bff; --b2: #14c8d8; --grad: linear-gradient(120deg, #2f5bff 0%, #1e8fea 50%, #14c8d8 100%);
          background: #fff; color: var(--ink); min-height: 100vh; overflow-x: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
          -webkit-font-smoothing: antialiased; line-height: 1.6;
        }
        .zs-root * { box-sizing: border-box; }
        .zs-root a { color: inherit; text-decoration: none; }
        .zs-root h1, .zs-root h2, .zs-root h3, .zs-root p, .zs-root ul, .zs-root ol, .zs-root figure { margin: 0; padding: 0; }
        .zs-root h1, .zs-root h2, .zs-root h3, .zs-root b { font-weight: 700; }
        .zs-root ul, .zs-root ol { list-style: none; }
        .zs-root sub { font-size: .7em; vertical-align: baseline; position: relative; top: .25em; }
        .zs-mono, .zs-eyebrow, .zs-no, .zs-en, .zs-soft span, .zs-steps span, .zs-why-no, .zs-case figcaption span, .zs-card-h span {
          font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace; letter-spacing: .04em;
        }

        .zs-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between;
          padding: 14px clamp(16px, 4vw, 56px); background: rgba(255,255,255,.72); backdrop-filter: saturate(1.6) blur(14px);
          -webkit-backdrop-filter: saturate(1.6) blur(14px); border-bottom: 1px solid rgba(230,235,242,.7); }
        .zs-brand { display: flex; align-items: center; gap: 10px; }
        .zs-brand-t { display: flex; flex-direction: column; line-height: 1.15; }
        .zs-brand-t b { font-size: 17px; letter-spacing: .08em; }
        .zs-brand-t i { font-style: normal; font-size: 10.5px; color: var(--mute); letter-spacing: .06em; }
        .zs-nav nav { display: flex; align-items: center; gap: 28px; font-size: 14.5px; color: var(--sub); }
        .zs-nav nav a:hover { color: var(--ink); }
        .zs-nav-cta { padding: 7px 16px; border-radius: 999px; background: var(--ink); color: #fff !important; }

        .zs-hero { position: relative; padding: 100px clamp(16px, 5vw, 72px) 40px; overflow: hidden; }
        .zs-grid-bg { position: absolute; inset: 0; background-image: radial-gradient(rgba(47,91,255,.16) 1px, transparent 1.2px);
          background-size: 22px 22px; mask-image: radial-gradient(ellipse 70% 60% at 65% 40%, #000 20%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 65% 40%, #000 20%, transparent 75%); pointer-events: none; }
        .zs-orb { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; opacity: .5; }
        .zs-orb1 { width: 520px; height: 520px; right: -120px; top: 40px; background: radial-gradient(circle, rgba(20,200,216,.35), transparent 65%); animation: zsFloat 14s ease-in-out infinite; }
        .zs-orb2 { width: 420px; height: 420px; right: 280px; top: 260px; background: radial-gradient(circle, rgba(47,91,255,.22), transparent 65%); animation: zsFloat 18s ease-in-out infinite reverse; }
        @keyframes zsFloat { 50% { transform: translate(-30px, 24px); } }
        .zs-hero-in { position: relative; max-width: 1240px; margin: 0 auto; min-height: 560px; display: flex; align-items: center; }
        .zs-hero-text { position: relative; z-index: 2; max-width: 600px; pointer-events: none; }
        .zs-hero-text a, .zs-hero-text .zs-tag { pointer-events: auto; }
        .zs-eyebrow { font-size: 12.5px; color: var(--b1); margin-bottom: 20px; display: inline-flex; align-items: center; gap: 10px; }
        .zs-eyebrow::before { content: ""; width: 28px; height: 1.5px; background: var(--grad); }
        .zs-h1l { display: block; white-space: nowrap; }
        .zs-hero h1 { font-size: clamp(28px, 3.7vw, 54px); line-height: 1.16; font-weight: 700; letter-spacing: .01em; }
        .zs-grad { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .zs-lead { margin-top: 22px; font-size: 16.5px; color: var(--sub); max-width: 34em; }
        .zs-tags { display: flex; gap: 12px; margin-top: 28px; flex-wrap: wrap; }
        .zs-tag { display: inline-flex; align-items: center; gap: 10px; padding: 9px 18px 9px 10px; border: 1px solid var(--line); border-radius: 12px;
          background: rgba(255,255,255,.8); font-weight: 600; font-size: 16px; box-shadow: 0 1px 0 rgba(11,27,51,.03); }
        .zs-tag i { font-style: normal; font-family: "SF Mono", Menlo, monospace; font-size: 11px; color: #fff; background: var(--grad); border-radius: 7px; padding: 3px 6px; }
        .zs-hero-cta { display: flex; gap: 12px; margin-top: 34px; flex-wrap: wrap; }
        .zs-btn { display: inline-flex; align-items: center; justify-content: center; padding: 13px 26px; border-radius: 12px; font-weight: 600; font-size: 15px;
          background: var(--ink); color: #fff !important; transition: transform .2s, box-shadow .2s; box-shadow: 0 10px 30px -12px rgba(47,91,255,.55); }
        .zs-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 36px -12px rgba(47,91,255,.7); }
        .zs-btn.ghost { background: #fff; color: var(--ink) !important; border: 1px solid var(--line); box-shadow: none; }

        .zs-hero3d { position: absolute; z-index: 1; top: 50%; right: -12vw; transform: translateY(-50%); width: min(100vw, 1400px); height: 940px; }
        .zs-hero3d .zs-hero-canvas, .zs-hero3d .zs-hero-fallback {
          mask-image: linear-gradient(90deg, transparent 8%, rgba(0,0,0,.18) 26%, rgba(0,0,0,.55) 40%, #000 52%), linear-gradient(180deg, transparent 0%, #000 12%, #000 76%, transparent 96%);
          -webkit-mask-image: linear-gradient(90deg, transparent 8%, rgba(0,0,0,.18) 26%, rgba(0,0,0,.55) 40%, #000 52%), linear-gradient(180deg, transparent 0%, #000 12%, #000 76%, transparent 96%);
          mask-composite: intersect; -webkit-mask-composite: source-in; }
        .zs-lead { text-shadow: 0 0 10px #fff, 0 0 4px #fff; }
        .zs-hero-canvas, .zs-hero-fallback { position: absolute; inset: 0; width: 100%; height: 100%; }
        .zs-hero-fallback { object-fit: contain; transition: opacity .8s; }
        .zs-hero-canvas { opacity: 0; transition: opacity .8s; cursor: grab; }
        .zs-hero3d.on .zs-hero-canvas { opacity: 1; }
        .zs-hero3d.on .zs-hero-fallback { opacity: 0; }
        .zs-hero-hint-unused { position: absolute; bottom: 6%; left: 50%; transform: translateX(-50%); font-size: 12px; color: var(--mute); letter-spacing: .1em;
          padding: 5px 12px; border: 1px solid var(--line); border-radius: 999px; background: rgba(255,255,255,.8); white-space: nowrap; }

        .zs-stats { position: relative; z-index: 2; max-width: 1240px; margin: 36px auto 0; display: grid; grid-template-columns: repeat(3, 1fr);
          border: 1px solid var(--line); border-radius: 18px; background: rgba(255,255,255,.85); backdrop-filter: blur(8px); }
        .zs-stat { padding: 24px 28px; border-left: 1px solid var(--line); }
        .zs-stat:first-child { border-left: 0; }
        .zs-stat b { display: block; font-size: 38px; font-weight: 700; line-height: 1.1; background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent;
          font-family: "SF Pro Display", -apple-system, "Helvetica Neue", sans-serif; font-variant-numeric: tabular-nums; }
        .zs-stat > span { font-size: 14px; color: var(--sub); }

        .zs-sec { max-width: 1240px; margin: 0 auto; padding: 110px clamp(16px, 5vw, 72px) 0; box-sizing: content-box; }
        .zs-title { margin-bottom: 44px; max-width: 760px; }
        .zs-no { display: inline-block; font-size: 12.5px; color: var(--b1); margin-bottom: 14px; }
        .zs-title h2 { font-size: clamp(24px, 2.8vw, 36px); font-weight: 700; line-height: 1.3; letter-spacing: -.005em; }
        .zs-en { font-size: 13px; color: var(--mute); text-transform: uppercase; }

        .zs-svc { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        .zs-card { border: 1px solid var(--line); border-radius: 20px; overflow: hidden; background: #fff; transition: transform .35s, box-shadow .35s, border-color .35s, opacity .7s; position: relative; }
        .zs-card:hover { transform: translateY(-6px); border-color: rgba(47,91,255,.35); box-shadow: 0 28px 60px -30px rgba(30,70,160,.35); }
        .zs-card-img { aspect-ratio: 4 / 3; background: radial-gradient(ellipse at 50% 60%, #f3f7fd 0%, #fff 70%); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .zs-card-img img { width: 100%; height: 100%; object-fit: contain; transition: transform .6s; }
        .zs-card:hover .zs-card-img img { transform: scale(1.05); }
        .zs-card-body { padding: 22px 24px 24px; border-top: 1px solid var(--line); }
        .zs-card-h { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 14px; }
        .zs-card-h h3 { font-size: 19px; }
        .zs-card-h span { font-size: 11px; color: var(--mute); text-transform: uppercase; }
        .zs-card li { position: relative; padding-left: 16px; font-size: 14.5px; color: var(--sub); line-height: 1.95; }
        .zs-card li::before { content: ""; position: absolute; left: 0; top: .82em; width: 6px; height: 6px; border-radius: 2px; background: var(--grad); }
        .zs-soft { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
        .zs-soft span { font-size: 11.5px; padding: 3px 9px; border-radius: 6px; background: var(--soft); color: #34507e; border: 1px solid #e3eaf5; }

        .zs-why { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .zs-why-c { position: relative; padding: 30px 26px 30px; border-radius: 20px; border: 1px solid var(--line); background: #fff; overflow: hidden; transition: opacity .7s, transform .7s; }
        .zs-why-c.key { background: linear-gradient(160deg, #f4f8ff 0%, #fff 60%); }
        .zs-why-c::after { content: ""; position: absolute; left: 0; top: 0; right: 0; height: 3px; background: var(--grad); opacity: .9; }
        .zs-why-no { font-size: 13px; color: var(--mute); }
        .zs-why-c h3 { font-size: 30px; margin: 10px 0 12px; }
        .zs-why-c p { font-size: 14.5px; color: var(--sub); }

        .zs-gallery { overflow: hidden; margin: 0 calc(-1 * clamp(16px, 5vw, 72px)); padding: 6px 0 10px;
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
        .zs-gtrack { display: flex; gap: 20px; width: max-content; animation: zsScroll 70s linear infinite; }
        .zs-gallery:hover .zs-gtrack { animation-play-state: paused; }
        .zs-case { position: relative; flex: none; width: 400px; aspect-ratio: 4 / 3.4; border-radius: 22px; overflow: hidden; border: 1px solid var(--line);
          background: radial-gradient(ellipse at 50% 55%, #f2f6fc 0%, #fff 72%); }
        .zs-case img { width: 100%; height: 100%; object-fit: contain; display: block; transition: transform .8s; padding: 12px 12px 56px; box-sizing: border-box; }
        .zs-case:hover img { transform: scale(1.05); }
        .zs-case figcaption { position: absolute; left: 0; bottom: 0; right: 0; display: flex; flex-direction: column; gap: 3px; padding: 40px 22px 18px;
          background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.88) 45%, #fff 100%); }
        .zs-case figcaption span { font-size: 11.5px; color: var(--b1); }
        .zs-case figcaption b { font-size: 17px; }

        .zs-strip { padding: 64px 0 0; }
        .zs-strip-t { text-align: center; font-size: 13.5px; color: var(--mute); margin-bottom: 22px !important; }
        .zs-marquee { overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
        .zs-track { display: flex; gap: 14px; width: max-content; animation: zsScroll 48s linear infinite; }
        .zs-marquee:hover .zs-track { animation-play-state: paused; }
        @keyframes zsScroll { to { transform: translateX(-50%); } }
        .zs-track .zs-school { flex: none; width: 150px; }
        .zs-school.wide img { width: 110px; }
        .zs-schools { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
        .zs-school { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 22px 10px 16px; border: 1px solid var(--line); border-radius: 16px; background: #fff; transition: all .3s; }
        .zs-school img { width: 64px; height: 64px; object-fit: contain; filter: grayscale(1); opacity: .62; transition: all .35s; }
        .zs-school span { font-size: 13px; color: var(--sub); text-align: center; }
        .zs-school:hover { border-color: rgba(47,91,255,.3); box-shadow: 0 14px 30px -20px rgba(30,70,160,.4); }
        .zs-school:hover img { filter: none; opacity: 1; }
        .zs-note { font-size: 12.5px; color: var(--mute); margin-top: 16px; }

        .zs-badge { aspect-ratio: 1 / 1; border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
          background: radial-gradient(circle at 30% 20%, #1c3a7a 0%, #0b1b33 70%); color: #fff; position: relative; overflow: hidden; }
        .zs-badge::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.14) 1px, transparent 1.2px); background-size: 16px 16px; }
        .zs-badge > * { position: relative; }
        .zs-badge b { font-size: 26px; letter-spacing: .12em; margin-top: 10px; }
        .zs-badge span { font-size: 14px; color: #9fb4d8; letter-spacing: .1em; }
        .zs-founder { display: grid; grid-template-columns: 240px 1fr; gap: 48px; align-items: center; padding: 36px; border: 1px solid var(--line); border-radius: 24px;
          background: linear-gradient(135deg, #f6f9ff 0%, #fff 55%); }
        .zs-founder h3 { font-size: 22px; display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
        .zs-founder h3 span { font-size: 14px; color: var(--b1); font-weight: 500; }
        .zs-founder li { font-size: 15.5px; color: var(--sub); padding: 8px 0 8px 22px; border-bottom: 1px dashed var(--line); position: relative; }
        .zs-founder li::before { content: ""; position: absolute; left: 2px; top: 1.05em; width: 8px; height: 8px; border: 2px solid var(--b2); border-radius: 50%; }
        .zs-link { display: inline-block; margin-top: 20px; color: var(--b1) !important; font-weight: 600; }

        .zs-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; counter-reset: s; border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }
        .zs-steps li { padding: 28px 26px; border-left: 1px solid var(--line); position: relative; transition: opacity .7s, transform .7s; }
        .zs-steps li:first-child { border-left: 0; }
        .zs-steps span { font-size: 12px; color: var(--b1); }
        .zs-steps h3 { font-size: 20px; margin: 8px 0 6px; }
        .zs-steps p { font-size: 14px; color: var(--sub); }
        .zs-cta { margin-top: 28px; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; padding: 36px 40px; border-radius: 24px;
          background: #0b1b33; color: #fff; position: relative; overflow: hidden; transition: opacity .7s, transform .7s; }
        .zs-cta::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.12) 1px, transparent 1.2px); background-size: 20px 20px;
          mask-image: linear-gradient(90deg, transparent, #000); -webkit-mask-image: linear-gradient(90deg, transparent, #000); }
        .zs-cta::after { content: ""; position: absolute; right: -80px; top: -120px; width: 360px; height: 360px; border-radius: 50%; background: radial-gradient(circle, rgba(20,200,216,.45), transparent 65%); }
        .zs-cta > * { position: relative; z-index: 1; }
        .zs-cta h3 { font-size: 24px; }
        .zs-cta p { color: #a9b6cc; margin-top: 6px; font-size: 14.5px; }
        .zs-cta .zs-btn { background: #fff; color: var(--ink) !important; }

        .zs-foot { margin-top: 110px; border-top: 1px solid var(--line); background: var(--soft); padding: 40px clamp(16px, 5vw, 72px) 28px; }
        .zs-foot-in { max-width: 1240px; margin: 0 auto; display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .zs-foot-r { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--sub); text-align: right; }
        .zs-partners { color: var(--mute); font-size: 12px; margin-top: 6px; }
        .zs-copy { max-width: 1240px; margin: 22px auto 0; font-size: 12px; color: var(--mute); }

        .zs-float { position: fixed; right: 22px; bottom: 22px; z-index: 50; width: 232px; padding: 18px; border-radius: 18px;
          background: rgba(255,255,255,.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid var(--line);
          box-shadow: 0 24px 60px -24px rgba(20,50,120,.35); }
        .zs-float::before { content: ""; position: absolute; left: 0; top: 18px; bottom: 18px; width: 3px; border-radius: 0 3px 3px 0; background: var(--grad); }
        .zs-float-head { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; }
        .zs-dot { width: 8px; height: 8px; border-radius: 50%; background: #20c07a; box-shadow: 0 0 0 0 rgba(32,192,122,.6); animation: zsPulse 2s infinite; }
        @keyframes zsPulse { 70% { box-shadow: 0 0 0 8px rgba(32,192,122,0); } 100% { box-shadow: 0 0 0 0 rgba(32,192,122,0); } }
        .zs-float-t { font-size: 12.5px; color: var(--sub); margin: 4px 0 12px !important; }
        .zs-float-mail { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 9px 10px; border-radius: 10px; border: 1px dashed #c9d5ea;
          background: var(--soft); cursor: pointer; font-size: 12.5px; color: var(--ink); font-family: "SF Mono", Menlo, monospace; }
        .zs-float-mail em { font-style: normal; font-size: 11px; color: var(--b1); flex: none; font-family: -apple-system, "PingFang SC", sans-serif; }
        .zs-float-btn { display: block; text-align: center; margin-top: 10px; padding: 10px; border-radius: 10px; background: var(--grad); color: #fff !important; font-weight: 600; font-size: 14px; }
        .zs-float-s { font-size: 11.5px; color: var(--mute); margin-top: 10px !important; text-align: center; }

        .reveal { opacity: 0; transform: translateY(26px); }
        .reveal.in { opacity: 1; transform: none; transition: opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1); }
        .zs-card.reveal.in:hover { transform: translateY(-6px); }
        @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; } .zs-orb, .zs-track, .zs-gtrack { animation: none; } .zs-gallery { overflow-x: auto; } }

                @media (max-width: 1600px) { .zs-float { width: 214px; padding: 14px; } .zs-float-s { display: none; } }
        @media (pointer: coarse) { .zs-hero-hint-unused { display: none; } }
        @media (max-width: 960px) {
          .zs-nav nav a:not(.zs-nav-cta) { display: none; }
          .zs-hero { padding-top: 96px; }
          .zs-hero-in { display: block; min-height: 0; }
          .zs-hero-text { pointer-events: auto; }
          .zs-hero3d { position: relative; top: auto; right: auto; transform: none; width: 100%; max-width: 560px; height: auto; aspect-ratio: 1 / 1; margin: 0 auto; }
          .zs-hero3d .zs-hero-canvas, .zs-hero3d .zs-hero-fallback { mask-image: none; -webkit-mask-image: none; }
          .zs-svc { grid-template-columns: repeat(2, 1fr); }
          .zs-why { grid-template-columns: repeat(2, 1fr); }
          .zs-case { width: 300px; }
          .zs-founder { grid-template-columns: 1fr; gap: 24px; padding: 22px; }
          .zs-badge { max-width: 220px; }
          .zs-steps { grid-template-columns: repeat(2, 1fr); }
          .zs-steps li:nth-child(3) { border-left: 0; }
          .zs-steps li:nth-child(n+3) { border-top: 1px solid var(--line); }
        }
        @media (max-width: 640px) {
          .zs-sec { padding-top: 76px; }
          .zs-svc, .zs-why { grid-template-columns: 1fr; }
          .zs-stat { padding: 16px 12px; }
          .zs-stat > span { font-size: 12.5px; }
          .zs-stat b { font-size: 26px; }
          .zs-schools { grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .zs-track .zs-school { width: 118px; }
          .zs-school img { width: 48px; height: 48px; }
          .zs-school span { font-size: 11.5px; }
          .zs-steps { grid-template-columns: 1fr; }
          .zs-steps li { border-left: 0 !important; border-top: 1px solid var(--line); }
          .zs-steps li:first-child { border-top: 0; }
          .zs-cta { padding: 26px 22px; }
          .zs-foot { padding-bottom: 96px; }
          .zs-foot-r { text-align: left; }
          .zs-float { left: 12px; right: 12px; bottom: 12px; width: auto; padding: 10px 12px; display: flex; align-items: center; gap: 10px; }
          .zs-float::before, .zs-float-t, .zs-float-s, .zs-float-head { display: none; }
          .zs-float-mail { flex: 1; min-width: 0; }
          .zs-float-mail span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .zs-float-btn { margin-top: 0; padding: 9px 14px; flex: none; }
        }
      `

export async function getStaticProps() {
  return { props: {} }
}
