import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import co from '@/data/company.json'
import Hero3D from '@/components/CompanyHero3D'

const chem = text => text.split(/([₀-₉]+)/u).map((part, index) => index % 2
  ? <sub key={index}>{part.replace(/[₀-₉]/gu, ch => String(ch.charCodeAt(0) - 0x2080))}</sub>
  : part)

const Title = ({ number, id }) => (
  <div className="zs-title"><p className="zs-kicker">{number} / {co.sections[id][0]}</p><h2>{co.sections[id][1]}</h2></div>
)

const METHODS = [
  { key: '研究问题', label: '01 / 课题与模型', title: '根据研究问题，明确模型假设。', text: '沟通研究体系、目标性质与实验线索，明确对照体系、模型假设和边界条件，让计算方案对应具体的研究问题。', img: '/company/img/catalysis.webp', caption: '原子尺度结构模型示意' },
  { key: '计算方法', label: '02 / 计算与验证', title: '依据模型与采样条件，选择计算方法。', text: 'DFT 结果需结合泛函、结构模型与参数收敛评估；AIMD 分析受模拟时间与采样条件限制；机器学习势需针对目标体系验证能量、力及相关性质。', img: '/company/img/electronic.webp', caption: '电子结构与活性位点的模型示意' },
  { key: '数据交付', label: '03 / 方法与数据', title: '记录计算设置，交付约定数据。', text: '按双方约定交付结构、输入输出文件、分析数据与方法说明，记录计算条件与处理步骤。结合实验和文献讨论模型支持的解释、方法局限及待验证问题。', img: '/company/img/mlp.webp', caption: '多原子体系的模型示意' }
]

function installMethodObserver(root, setActive) {
  if (!root || !window.IntersectionObserver) return () => {}
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(Number(entry.target.dataset.methodIndex))
    })
  }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 })
  root.querySelectorAll('[data-method-index]').forEach(element => observer.observe(element))
  return () => observer.disconnect()
}

function installScrollReveal(root) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (!root || media.matches || !window.IntersectionObserver) return () => {}
  const items = root.querySelectorAll('.zs-title, .zs-service, .zs-principles article, .zs-cases figure, .zs-about, .zs-collaboration, .zs-steps li, .zs-contact')
  const show = element => element.classList.add('zs-shown')
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        show(entry.target)
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.08, rootMargin: '0px 0px -28px 0px' })
  items.forEach((element, index) => {
    if (element.getBoundingClientRect().top < window.innerHeight - 28) return
    element.classList.add('zs-reveal')
    element.style.setProperty('--reveal-delay', `${index % 3 * 55}ms`)
    observer.observe(element)
  })
  const preferenceChanged = () => {
    if (media.matches) {
      items.forEach(show)
      observer.disconnect()
    }
  }
  media.addEventListener('change', preferenceChanged)
  return () => {
    observer.disconnect()
    media.removeEventListener('change', preferenceChanged)
  }
}

export default function Company() {
  const rootRef = useRef(null)
  const [activeMethod, setActiveMethod] = useState(0)
  useEffect(() => installScrollReveal(rootRef.current), [])
  useEffect(() => installMethodObserver(rootRef.current, setActiveMethod), [])
  const selectMethod = index => {
    setActiveMethod(index)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    rootRef.current.querySelector(`[data-method-index="${index}"]`).scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }
  return (
    <div className="zs-root" ref={rootRef}>
      <Head>
        <title>{co.short} · 面向催化与材料研究的原子尺度模拟</title>
        <meta name="description" content="围绕催化与材料研究问题开展 DFT、AIMD 与机器学习势计算，讨论模型、参数收敛和数据验证，交付可复核的结构、数据与方法说明。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/company/mark.svg" />
      </Head>
      <header className="zs-nav">
        <a className="zs-brand" href="#top" aria-label={co.name}><img src="/company/mark.svg" alt="" width="36" height="36" /><span><b>{co.short}</b><small>{co.en}</small></span></a>
        <nav aria-label="公司页导航"><a href="#services">研究方法</a><a href="#cases">研究图版</a><a href="#about">研究背景</a><a href="#contact" className="zs-nav-contact">合作咨询 ↗</a></nav>
      </header>
      <main>
        <section className="zs-hero zs-container" id="top" aria-labelledby="company-heading">
          <div className="zs-hero-text">
            <p className="zs-kicker">{co.hero.eyebrow}</p>
            <h1 id="company-heading">{co.hero.title.map(line => <span key={line}>{line}</span>)}</h1>
            <p className="zs-hero-en">{co.hero.en}</p><p className="zs-lead">{co.hero.lead}</p>
            <div className="zs-actions"><a className="zs-button" href="#services">了解研究方法</a><a className="zs-text-link" href="#contact">讨论研究问题 ↗</a></div>
          </div>
          <figure className="zs-hero-figure"><div className="zs-figure-label"><span>ATOMISTIC MODEL</span><span>01</span></div><Hero3D /><figcaption><span>结构 · 电子 · 反应</span><span>原子尺度模型示意</span></figcaption></figure>
          <dl className="zs-methods">{co.hero.tags.map(tag => <div key={tag.t}><dt>{tag.t}</dt><dd>{tag.d}</dd></div>)}</dl>
        </section>
        <section className="zs-section zs-container" id="services">
          <Title number="01" id="services" />
          <div className="zs-story">
            <div className="zs-story-media">
              <div className="zs-story-controls" aria-label="研究方法导航">{METHODS.map((method, index) => <button key={method.key} aria-pressed={activeMethod === index} onClick={() => selectMethod(index)}>{method.key}</button>)}</div>
              <div className="zs-story-image">{METHODS.map((method, index) => <img key={method.key} className={'zs-story-layer' + (activeMethod === index ? ' is-active' : '')} src={method.img} alt={activeMethod === index ? method.caption : ''} aria-hidden={activeMethod !== index} width="600" height="600" />)}</div>
              <p className="zs-story-caption"><span>{METHODS[activeMethod].caption}</span><span>0{activeMethod + 1} / 03</span></p>
            </div>
            <div className="zs-story-chapters">{METHODS.map((method, index) => <article key={method.key} data-method-index={index}><p className="zs-kicker">{method.label}</p><img className="zs-story-mobile-image" src={method.img} alt={method.caption} width="240" height="240" loading="lazy" /><h3>{method.title}</h3><p>{method.text}</p></article>)}</div>
          </div>
          <div className="zs-service-heading"><h3>计算方向与分析内容</h3><p>具体方法、模型与分析范围根据研究问题协商确定。</p></div>
          <div className="zs-services">{co.services.map(service => <article className="zs-service" key={service.key}>
            <div className="zs-service-top"><div><p className="zs-english">{service.en}</p><h3>{service.title}</h3></div><img src={service.img} alt="" loading="lazy" width="100" height="100" /></div>
            <ul>{service.items.map(item => <li key={item}>{chem(item)}</li>)}</ul>
            <div className="zs-software" aria-label="方法工具">{service.soft.map(tool => <span key={tool}>{tool}</span>)}</div>
          </article>)}</div>
          <p className="zs-method-note">{co.methodNote}</p>
        </section>
        <section className="zs-section zs-container" id="why"><Title number="02" id="why" /><div className="zs-principles">{co.advantages.map(item => <article key={item.no}><span className="zs-number">{item.no}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
        <section className="zs-section zs-container" id="cases"><Title number="03" id="cases" /><p className="zs-intro">{co.caseNote}</p><div className="zs-cases">{co.cases.map((item, index) => <figure key={item.img}>
          <div className="zs-case-image"><span className="zs-case-number">{String(index + 1).padStart(2, '0')}</span><img src={item.img} alt={item.title} loading="lazy" width="480" height="360" /></div>
          <figcaption><p className="zs-english">{item.tag}</p><h3>{chem(item.title)}</h3></figcaption>
        </figure>)}</div></section>
        <section className="zs-section zs-container" id="about"><Title number="04" id="about" /><div className="zs-about">
          <div className="zs-about-label"><p className="zs-kicker">RESEARCH BACKGROUND</p><h3>理论计算<br />与实验研究</h3><Link href="/cv"><a className="zs-text-link">查看个人学术履历 ↗</a></Link></div>
          <div><p className="zs-role">{co.founder.role}</p><ul>{co.founder.lines.map(line => <li key={line}>{line}</li>)}</ul></div>
        </div></section>
        <section className="zs-section zs-container" id="contact"><Title number="05" id="steps" /><p className="zs-collaboration">{co.collaboration}</p>
          <ol className="zs-steps">{co.steps.map((step, index) => <li key={step.title}><span className="zs-number">0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
          <div className="zs-contact"><div><h3>{co.cta.title}</h3><p>{co.cta.text}</p><p className="zs-commercial">{co.commercialNote}</p></div><a className="zs-contact-mail" href={'mailto:' + co.email + '?subject=' + encodeURIComponent('计算研究与合作咨询')}><span>联系邮箱</span><b>{co.email}</b><span>邮件咨询 ↗</span></a></div>
          <p className="zs-license">{co.licenseNote}</p>
        </section>
      </main>
      <footer className="zs-footer"><div className="zs-container"><div><b>{co.name}</b><p>{co.en}</p></div><div><p>统一社会信用代码 {co.creditCode}</p><p>© {new Date().getFullYear()} {co.name}</p></div></div></footer>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </div>
  )
}

const CSS = `
.zs-model-stage { position:relative; height:330px; }
.zs-model-fallback { position:absolute; inset:0; width:100%; height:100% !important; object-fit:contain; }
.zs-model-canvas { position:absolute; inset:0; }
.zs-model-canvas canvas { width:100%; height:100%; display:block; }
.zs-hero3d.ready .zs-model-fallback { visibility:hidden; }
.zs-model-tools { display:flex; justify-content:center; flex-wrap:wrap; gap:8px; padding:10px 16px 0; }
.zs-model-tools button { border:1px solid var(--line); border-radius:999px; background:#fff; color:var(--ink); padding:7px 14px; font:inherit; font-size:12px; cursor:pointer; }
.zs-model-tools button[aria-pressed="true"] { background:var(--ink); color:#fff; }
.zs-model-tools button:disabled { opacity:.5; cursor:default; }
.zs-root .zs-model-help { font-size:11px; color:var(--muted); padding:10px 16px 14px; min-height:42px; }
@media(max-width:600px) { .zs-model-stage { height:290px; } }
@media print { .zs-model-canvas,.zs-model-tools,.zs-model-help { display:none; } .zs-hero3d.ready .zs-model-fallback { visibility:visible; } }

html:has(.zs-root) { scroll-behavior:smooth; scroll-padding-top:112px; }
.zs-root { --ink:#1d1d1f; --body:#5b5c62; --muted:#74757c; --line:rgba(25,30,40,.10); --paper:#f5f5f7; --blue:#285b91; color:var(--ink); background:#fff; font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Helvetica Neue",sans-serif; line-height:1.75; -webkit-font-smoothing:antialiased; }
.zs-root *, .zs-root *::before, .zs-root *::after { box-sizing:border-box; }
.zs-root h1,.zs-root h2,.zs-root h3,.zs-root p,.zs-root figure,.zs-root dl,.zs-root dd,.zs-root ul,.zs-root ol { margin:0; }
.zs-root ul,.zs-root ol { padding:0; list-style:none; }
.zs-root a { color:inherit; text-decoration:none; }
.zs-root a:focus-visible,.zs-root button:focus-visible { outline:3px solid #8eb8e5; outline-offset:5px; }
.zs-root h1,.zs-root h2,.zs-root h3 { font-weight:650; letter-spacing:-.04em; text-wrap:balance; }
.zs-root sub { font-size:.72em; vertical-align:sub; line-height:0; }
.zs-container { width:min(1160px,calc(100% - 96px)); margin:0 auto; }
.zs-nav { position:sticky; top:0; z-index:20; min-height:76px; padding:14px max(32px,calc((100% - 1240px)/2)); display:flex; justify-content:space-between; align-items:center; gap:24px; background:rgba(255,255,255,.86); -webkit-backdrop-filter:blur(20px) saturate(140%); backdrop-filter:blur(20px) saturate(140%); border-bottom:1px solid var(--line); }
.zs-brand { display:flex; align-items:center; gap:10px; flex-shrink:0; }
.zs-brand img { width:30px; height:30px; }
.zs-brand b { display:block; font-size:20px; letter-spacing:.04em; line-height:1.4; font-weight:650; }
.zs-brand small { display:block; font-size:9px; letter-spacing:.025em; color:var(--muted); }
.zs-nav nav { display:flex; gap:30px; align-items:center; font-size:12px; font-weight:500; }
.zs-nav nav a { transition:color .25s ease; }
.zs-nav nav a:hover { color:var(--blue); }
.zs-nav-contact { background:var(--ink); color:#fff !important; padding:8px 15px; border-radius:999px; }
.zs-hero { text-align:center; padding:64px 0 86px; }
.zs-hero-text { animation:zsHeroEnter 1s cubic-bezier(.16,1,.3,1) both; }
.zs-kicker { font-size:12px; font-weight:500; color:var(--muted); letter-spacing:.08em; }
.zs-hero h1 { margin-top:20px; line-height:1.14; }
.zs-hero h1 span { display:block; }
.zs-hero h1 span:first-child { font-size:clamp(28px,3.4vw,48px); color:#54545a; font-weight:550; margin-bottom:10px; }
.zs-hero h1 span:last-child { font-size:clamp(46px,6.5vw,86px); font-weight:700; letter-spacing:-.065em; }
.zs-root .zs-hero-en { font-family:Georgia,serif; font-size:16px; color:var(--muted); margin-top:20px; }
.zs-root .zs-lead { font-size:17px; line-height:1.85; color:var(--body); max-width:820px; margin:24px auto 0; }
.zs-actions { display:flex; justify-content:center; align-items:center; gap:26px; margin-top:27px; font-size:14px; }
.zs-button { background:var(--ink); color:#fff !important; padding:12px 24px; border-radius:999px; transition:background .25s ease,box-shadow .25s ease,transform .25s ease; }
.zs-button:hover { background:#35363c; transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.12); }
.zs-text-link { color:var(--blue) !important; font-size:14px; transition:color .25s ease; }
.zs-text-link:hover { color:#173854 !important; }
.zs-hero-figure { margin:42px auto 0 !important; max-width:1000px; position:relative; border:1px solid var(--line); border-radius:30px; overflow:hidden; background:radial-gradient(ellipse at 50% 80%,#eef1f4,#f7f7f9 65%); box-shadow:0 24px 75px -50px rgba(30,45,70,.32); animation:zsHeroEnter 1.3s .12s cubic-bezier(.16,1,.3,1) both; }
.zs-figure-label { display:flex; justify-content:space-between; padding:17px 24px; font-size:10px; letter-spacing:.13em; color:var(--muted); }
.zs-hero-figure img { width:100%; height:330px; object-fit:contain; display:block; padding:0 20px; }
.zs-hero-figure figcaption { display:flex; justify-content:space-between; padding:14px 24px; gap:12px; font-size:11px; color:var(--muted); border-top:1px solid rgba(25,30,40,.06); }
.zs-methods { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; max-width:820px; margin:36px auto 0 !important; }
.zs-methods > div { border-right:1px solid var(--line); }
.zs-methods > div:last-child { border:0; }
.zs-methods dt { font-size:23px; font-weight:650; letter-spacing:-.02em; }
.zs-methods dd { font-size:12px; color:var(--muted); margin-top:5px; }
.zs-section { padding:84px 0 96px; border-top:1px solid var(--line); scroll-margin-top:104px; }
.zs-title { max-width:920px; margin-bottom:48px; }
.zs-title h2 { font-size:clamp(32px,4vw,54px); line-height:1.25; margin-top:12px; }
.zs-story { display:grid; grid-template-columns:1.1fr 1fr; gap:80px; align-items:start; margin:24px 0 86px; }
.zs-story-media { position:sticky; top:108px; padding:22px; background:var(--paper); border:1px solid var(--line); border-radius:28px; }
.zs-story-controls { display:flex; justify-content:center; gap:4px; margin:auto; padding:5px; background:#e7e8ec; border-radius:999px; width:fit-content; }
.zs-story-controls button { border:0; padding:9px 16px; border-radius:999px; background:transparent; color:#62636a; font-size:12px; cursor:pointer; font-family:inherit; transition:background .35s ease,color .35s ease,box-shadow .35s ease; }
.zs-story-controls button[aria-pressed="true"] { background:#fff; color:var(--ink); box-shadow:0 2px 8px rgba(0,0,0,.06); }
.zs-story-image { position:relative; height:340px; margin:12px 0; }
.zs-story-layer { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:12px; opacity:0; transform:translate3d(0,14px,0) scale(.98); transition:opacity .9s cubic-bezier(.22,1,.36,1),transform 1.1s cubic-bezier(.22,1,.36,1); pointer-events:none; }
.zs-story-layer.is-active { opacity:1; transform:translate3d(0,0,0) scale(1); }
.zs-story-caption { display:flex; justify-content:space-between; gap:12px; font-size:11px; color:var(--muted); border-top:1px solid var(--line); padding-top:15px; }
.zs-story-chapters article { min-height:310px; display:flex; flex-direction:column; justify-content:center; padding:38px 0; border-bottom:1px solid var(--line); scroll-margin-top:130px; }
.zs-story-chapters article:first-child { padding-top:0; }
.zs-story-chapters article:last-child { border:0; }
.zs-story-chapters h3 { font-size:32px; line-height:1.45; margin:16px 0; max-width:440px; }
.zs-story-chapters article > p:last-child { font-size:16px; line-height:1.95; color:var(--body); }
.zs-story-mobile-image { display:none; }
.zs-service-heading { margin-bottom:28px; display:flex; align-items:baseline; justify-content:space-between; gap:24px; }
.zs-service-heading h3 { font-size:28px; }
.zs-service-heading p { font-size:13px; color:var(--muted); }
.zs-services { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }
.zs-service { padding:25px; background:var(--paper); border:1px solid transparent; border-radius:24px; display:flex; flex-direction:column; transition:border-color .3s ease,box-shadow .3s ease; }
.zs-service:hover { border-color:rgba(80,100,125,.18); box-shadow:0 14px 35px -25px rgba(30,40,55,.3); }
.zs-service-top { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:94px; margin-bottom:14px; }
.zs-english { font-family:Georgia,serif; font-size:11px; color:var(--muted); line-height:1.6; }
.zs-service-top h3 { font-size:20px; margin-top:6px; }
.zs-service-top img { width:76px; height:76px; object-fit:contain; }
.zs-service li { font-size:13px; color:var(--body); padding-left:12px; position:relative; margin:6px 0; }
.zs-service li::before { content:"·"; position:absolute; left:0; }
.zs-software { display:flex; flex-wrap:wrap; gap:6px; margin-top:auto; padding-top:22px; }
.zs-software span { background:rgba(255,255,255,.7); border:1px solid rgba(0,0,0,.04); font-size:10px; color:var(--body); padding:3px 8px; border-radius:6px; }
.zs-root .zs-method-note { font-size:12px; line-height:1.9; color:var(--muted); margin-top:22px; }
.zs-principles { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:32px; }
.zs-principles article { border-top:2px solid #32343b; padding-top:20px; }
.zs-number { font-size:12px; color:var(--muted); font-variant-numeric:tabular-nums; }
.zs-principles h3,.zs-steps h3 { font-size:23px; margin:12px 0; }
.zs-principles p,.zs-steps p { font-size:14px; line-height:1.9; color:var(--body); }
.zs-root .zs-intro { max-width:730px; font-size:16px; line-height:1.95; color:var(--body); margin:-16px 0 36px; }
.zs-cases { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:36px 26px; }
.zs-cases figure { min-width:0; border:1px solid var(--line); border-radius:24px; overflow:hidden; }
.zs-case-image { background:var(--paper); position:relative; overflow:hidden; }
.zs-case-number { position:absolute; top:20px; left:24px; z-index:1; font:12px Georgia,serif; color:var(--muted); }
.zs-case-image img { display:block; width:100%; height:auto; aspect-ratio:1.55; object-fit:contain; padding:26px 24px; transition:transform .8s cubic-bezier(.22,1,.36,1); }
.zs-cases figure:hover .zs-case-image img { transform:scale(1.025); }
.zs-cases figcaption { padding:22px 26px 24px; border-top:1px solid var(--line); }
.zs-cases h3 { font-size:19px; line-height:1.5; margin-top:8px; letter-spacing:-.015em; font-weight:600; }
.zs-about { display:grid; grid-template-columns:1fr 1.5fr; gap:70px; padding:48px; background:var(--paper); border-radius:28px; }
.zs-about-label h3 { font-size:37px; line-height:1.4; margin:20px 0 26px; }
.zs-role { font-size:12px; color:var(--muted); margin-bottom:12px !important; }
.zs-about li { padding:15px 0; border-bottom:1px solid var(--line); font-size:15px; line-height:1.9; color:var(--body); }
.zs-about li:first-child { font-size:18px; color:var(--ink); font-weight:600; }
.zs-about li:last-child { border:0; }
.zs-collaboration { font-size:20px; max-width:900px; line-height:1.8; color:var(--body); margin-bottom:42px !important; }
.zs-steps { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:30px; }
.zs-steps li { border-top:1px solid var(--line); padding-top:20px; }
.zs-contact { display:grid; grid-template-columns:1.5fr 1fr; gap:60px; padding:45px; margin-top:50px; border-radius:28px; background:#1d1f24; color:#fff; }
.zs-contact h3 { font-size:29px; line-height:1.4; margin-bottom:18px; }
.zs-contact p { color:#d2d4db; font-size:14px; line-height:1.95; }
.zs-root .zs-commercial { font-size:12px; color:#a7acb7; margin-top:20px; }
.zs-contact-mail { display:flex; flex-direction:column; justify-content:center; align-items:flex-start; gap:12px; border-left:1px solid #41444d; padding-left:36px; overflow-wrap:anywhere; }
.zs-contact-mail span { font-size:12px; color:#b9bdc8; }
.zs-contact-mail b { font-size:20px; font-weight:500; letter-spacing:-.025em; }
.zs-root .zs-license { font-size:12px; color:#62636b; line-height:1.95; margin-top:24px; }
.zs-footer { padding:34px 0; border-top:1px solid var(--line); background:var(--paper); }
.zs-footer .zs-container { display:flex; justify-content:space-between; gap:24px; font-size:11px; color:var(--muted); }
.zs-footer b { font-size:14px; color:var(--ink); font-weight:550; }
.zs-reveal { opacity:0; transform:translate3d(0,30px,0); transition:opacity .85s cubic-bezier(.16,1,.3,1),transform .95s cubic-bezier(.16,1,.3,1); transition-delay:var(--reveal-delay,0ms); }
.zs-reveal.zs-shown { opacity:1; transform:translate3d(0,0,0); }
@keyframes zsHeroEnter { from { opacity:0; transform:translate3d(0,18px,0); } to { opacity:1; transform:translate3d(0,0,0); } }
@media(max-width:1000px) { .zs-container { width:calc(100% - 64px); } .zs-nav { padding:14px 32px; } .zs-nav nav { gap:20px; } .zs-story { gap:36px; } .zs-story-chapters h3 { font-size:28px; } .zs-story-media { padding:18px; } .zs-story-image { height:300px; } .zs-story-controls button { padding:8px 10px; } .zs-services { grid-template-columns:repeat(2,minmax(0,1fr)); } .zs-principles,.zs-steps { grid-template-columns:repeat(2,minmax(0,1fr)); } .zs-about { gap:36px; padding:32px; } .zs-contact { gap:30px; padding:32px; } }
@media(max-width:700px) { html:has(.zs-root) { scroll-padding-top:128px; } .zs-container { width:calc(100% - 40px); } .zs-nav { padding:12px 20px; flex-wrap:wrap; gap:12px; } .zs-brand b { font-size:19px; } .zs-nav nav { width:100%; justify-content:space-between; gap:12px; font-size:11px; } .zs-nav-contact { padding:6px 11px; } .zs-hero { padding:38px 0 52px; } .zs-hero h1 { margin-top:18px; } .zs-hero h1 span:first-child { font-size:25px; letter-spacing:-.045em; } .zs-hero h1 span:last-child { font-size:47px; } .zs-hero .zs-kicker { font-size:10px; letter-spacing:.03em; } .zs-root .zs-hero-en { font-size:13px; max-width:320px; margin:18px auto 0; } .zs-root .zs-lead { font-size:14px; line-height:1.9; margin-top:20px; text-align:left; } .zs-actions { margin-top:24px; gap:20px; font-size:12px; } .zs-button { padding:11px 19px; } .zs-text-link { font-size:12px; } .zs-hero-figure { margin-top:30px !important; border-radius:22px; } .zs-hero-figure img { height:230px; padding:0 8px; } .zs-figure-label { padding:13px 16px; font-size:8px; } .zs-hero-figure figcaption { padding:12px 16px; font-size:9px; } .zs-methods { gap:8px; margin-top:26px !important; } .zs-methods dt { font-size:19px; } .zs-methods dd { font-size:10px; } .zs-section { padding:54px 0 62px; scroll-margin-top:122px; } .zs-title { margin-bottom:32px; } .zs-title h2 { font-size:32px; line-height:1.4; } .zs-story { display:block; margin:0 0 48px; } .zs-story-media { display:none; } .zs-story-chapters article { min-height:0; padding:32px 0; } .zs-story-chapters article:first-child { padding-top:0; } .zs-story-mobile-image { display:block; width:100%; height:190px; object-fit:contain; padding:8px; background:var(--paper); border-radius:22px; margin-top:20px; } .zs-story-chapters h3 { font-size:27px; margin-top:22px; } .zs-story-chapters article > p:last-child { font-size:14px; } .zs-service-heading { display:block; } .zs-service-heading h3 { font-size:24px; } .zs-service-heading p { margin-top:8px; } .zs-services { grid-template-columns:1fr; gap:16px; } .zs-service { padding:23px; border-radius:20px; } .zs-principles,.zs-steps { gap:28px 22px; } .zs-principles h3,.zs-steps h3 { font-size:20px; } .zs-principles p,.zs-steps p { font-size:13px; } .zs-root .zs-intro { font-size:14px; margin-top:-8px; } .zs-cases { grid-template-columns:1fr; gap:24px; } .zs-cases figure { border-radius:20px; } .zs-case-image img { aspect-ratio:1.45; padding:24px 20px; } .zs-cases figcaption { padding:18px 20px 21px; } .zs-cases h3 { font-size:17px; } .zs-about { grid-template-columns:1fr; gap:28px; padding:25px; border-radius:22px; } .zs-about-label h3 { font-size:30px; } .zs-about li { font-size:14px; } .zs-about li:first-child { font-size:17px; } .zs-collaboration { font-size:17px; margin-bottom:30px !important; } .zs-contact { grid-template-columns:1fr; padding:26px; border-radius:22px; gap:25px; margin-top:35px; } .zs-contact h3 { font-size:25px; } .zs-contact-mail { border-left:0; border-top:1px solid #41444d; padding-left:0; padding-top:25px; } .zs-contact-mail b { font-size:18px; } .zs-footer .zs-container { flex-direction:column; gap:16px; } }
@media(prefers-reduced-motion:reduce) { html:has(.zs-root) { scroll-behavior:auto; } .zs-root *, .zs-root *::before,.zs-root *::after { animation:none !important; transition:none !important; scroll-behavior:auto !important; } .zs-reveal { opacity:1; transform:none; } .zs-story-layer { transform:none; } .zs-button:hover,.zs-cases figure:hover img { transform:none; } }
@media print { html,body,#__next { background:#fff !important; scroll-behavior:auto !important; } @page { size:A4; margin:14mm; } .zs-root *, .zs-root *::before,.zs-root *::after { animation:none !important; transition:none !important; } .zs-reveal { opacity:1 !important; transform:none !important; } .zs-container { width:100%; } .zs-nav { position:static; padding:0 0 14px; min-height:0; background:#fff; } .zs-nav nav,.zs-actions { display:none; } .zs-hero { padding:24px 0 30px; } .zs-hero h1 span:first-child { font-size:24px; } .zs-hero h1 span:last-child { font-size:43px; } .zs-root .zs-lead { font-size:11px; margin-top:14px; } .zs-root .zs-hero-en { font-size:11px; } .zs-hero-figure { margin-top:22px !important; border-radius:16px; } .zs-hero-figure img { height:200px; } .zs-methods { margin-top:20px !important; } .zs-methods dt { font-size:18px; } .zs-methods dd { font-size:10px; } .zs-section { padding:28px 0; } .zs-title { margin-bottom:24px; break-inside:avoid; break-after:avoid; } .zs-title h2 { font-size:28px; } .zs-story { display:block; margin-bottom:30px; } .zs-story-media { display:none; } .zs-story-chapters article { min-height:0; padding:18px 0; break-inside:avoid; display:block; } .zs-story-chapters h3 { font-size:21px; margin:8px 0; } .zs-story-chapters article > p:last-child { font-size:11px; } .zs-story-mobile-image { display:block; float:right; width:140px; height:110px; object-fit:contain; padding:8px; margin:0 0 14px 20px; } .zs-services { grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; } .zs-service-heading h3 { font-size:22px; } .zs-service-heading p { font-size:10px; } .zs-service { padding:16px; break-inside:avoid; } .zs-service li,.zs-principles p,.zs-steps p { font-size:11px; } .zs-principles,.zs-steps { grid-template-columns:repeat(2,minmax(0,1fr)); } .zs-cases { grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; } .zs-cases figure { break-inside:avoid; } .zs-cases h3 { font-size:14px; } .zs-case-image img { padding:20px 14px; } .zs-cases figcaption { padding:12px 16px; } .zs-about { padding:24px; gap:28px; break-inside:avoid; } .zs-about-label h3 { font-size:26px; } .zs-about li { font-size:11px; } .zs-about li:first-child { font-size:13px; } .zs-collaboration { font-size:13px; } .zs-contact { padding:24px; gap:30px; background:#f5f5f7; color:var(--ink); break-inside:avoid; } .zs-contact h3 { font-size:22px; } .zs-contact p,.zs-contact-mail span,.zs-root .zs-commercial { color:var(--body); font-size:11px; } .zs-contact-mail { border-color:var(--line); padding-left:24px; } .zs-contact-mail b { font-size:14px; } .zs-root .zs-license { font-size:10px; } .zs-footer { padding:20px 0; } }
`

export async function getStaticProps() {
  return { props: {} }
}
