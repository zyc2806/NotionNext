import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import BLOG from '@/blog.config'
import cv from '@/data/cv.json'

// 把字符串里的 unicode 上下标（₀₁₂…⁻⁺ 等）转换成 <sub>/<sup> 元素，
// 字号和基线由 CSS 控制，这样 TNR / Optima 渲染才会正常。
const SUB_MAP = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' }
const SUP_MAP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '−', '⁺': '+' }
const formatScientific = (text) => {
  if (!text) return text
  const parts = []
  let buf = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    const isSub = SUB_MAP[ch] !== undefined
    const isSup = SUP_MAP[ch] !== undefined
    if (isSub || isSup) {
      if (buf) { parts.push(buf); buf = '' }
      const map = isSub ? SUB_MAP : SUP_MAP
      let run = ''
      while (i < text.length && map[text[i]] !== undefined) {
        run += map[text[i]]
        i++
      }
      parts.push(isSub ? <sub key={parts.length}>{run}</sub> : <sup key={parts.length}>{run}</sup>)
    } else {
      buf += ch
      i++
    }
  }
  if (buf) parts.push(buf)
  return parts
}

// i18n helper: a translatable value can be either a plain string (English-only,
// for legacy entries) or an object { en, zh }. Returns the string for the
// requested lang, falling back to en, then to whatever's there.
const t = (val, lang) => {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') return val[lang] || val.en || val.zh || ''
  return String(val)
}

const UI = {
  en: {
    nav: {
      about: 'About',
      education: 'Education',
      research: 'Research',
      publications: 'Publications',
      awards: 'Awards',
      skills: 'Skills'
    },
    sectionTitles: {
      about: 'About',
      education: 'Education',
      research: 'Research Experience',
      publications: 'Publications',
      awards: 'Awards & Scholarships',
      skills: 'Skills & Interests'
    },
    skillsLabels: {
      interests: 'Research interests',
      computation: 'Computation',
      ml_potentials: 'ML potentials',
      characterization: 'Characterization',
      engineering: 'Engineering',
      programming: 'Programming',
      summary: 'Summary'
    },
    downloadPdf: 'Download PDF',
    backToBlog: '← Back to blog',
    footerPrefix: 'Last updated',
    footerSuffix: '. Built with Next.js · Hosted on Vercel.',
    metaDesc: name => `Curriculum Vitae of ${name.en}, ${name.title}, ${name.affiliation}.`,
    toggleLabel: '中',
    toggleAria: 'Switch to Chinese'
  },
  zh: {
    nav: {
      about: '简介',
      education: '教育经历',
      research: '研究经历',
      publications: '论文发表',
      awards: '奖励荣誉',
      skills: '技能与方向'
    },
    sectionTitles: {
      about: '简介',
      education: '教育经历',
      research: '研究经历',
      publications: '论文发表',
      awards: '奖励与荣誉',
      skills: '技能与研究方向'
    },
    skillsLabels: {
      interests: '研究方向',
      computation: '计算',
      ml_potentials: '机器学习势',
      characterization: '表征',
      engineering: '工程',
      programming: '编程',
      summary: '其它'
    },
    downloadPdf: '下载 PDF',
    backToBlog: '← 返回博客',
    footerPrefix: '最后更新于',
    footerSuffix: '。基于 Next.js 构建 · 由 Vercel 托管。',
    metaDesc: name => `${name.en}（${name.zh}）的个人简历，${name.title}，${name.affiliation}。`,
    toggleLabel: 'EN',
    toggleAria: '切换到英文'
  }
}

const renderPubLegend = lang => {
  if (lang === 'zh') {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 italic">
        <sup>‡</sup> 共同第一作者 · <sup>*</sup> 通讯作者 · <strong className="font-bold text-gray-900 dark:text-white">粗体</strong> = 本人
      </p>
    )
  }
  return (
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 italic">
      <sup>‡</sup> co-first authorship · <sup>*</sup> corresponding author · <strong className="font-bold text-gray-900 dark:text-white">bold</strong> = author
    </p>
  )
}

const CitationInner = ({ p }) => (
  <>
    <em className="not-italic font-semibold">{p.venue}</em>
    {p.volume_pages && <span>, {p.volume_pages}</span>}
    {p.status && <span className="italic"> ({typeof p.status === 'string' ? p.status : (p.status.en || '')})</span>}
    <span> · {p.year}</span>
  </>
)

const renderCitationLine = p => {
  if (!p.doi) {
    return <CitationInner p={p} />
  }
  return (
    <a
      href={`https://doi.org/${p.doi}`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline decoration-purple-700/60 dark:decoration-purple-300/60 underline-offset-2"
    >
      <CitationInner p={p} />
    </a>
  )
}

const renderTitle = (p, lang) => {
  const titleNodes = formatScientific(t(p.title, lang))
  if (!p.doi) {
    return titleNodes
  }
  return (
    <a
      href={`https://doi.org/${p.doi}`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline decoration-purple-700/60 dark:decoration-purple-300/60 underline-offset-2"
    >
      {titleNodes}
      <span aria-hidden="true" className="ml-1.5 inline-block text-gray-400 dark:text-gray-500 text-[0.85em] align-baseline">↗</span>
    </a>
  )
}

const renderAuthors = authors =>
  authors.map((a, i) => {
    const sup = `${a.co_first ? '‡' : ''}${a.corresponding ? '*' : ''}`
    const cls = a.self
      ? 'font-bold text-gray-900 dark:text-white'
      : 'text-gray-700 dark:text-gray-300'
    return (
      <span key={i}>
        <span className={cls}>{a.name}</span>
        {sup && <sup>{sup}</sup>}
        {i < authors.length - 1 ? '; ' : ''}
      </span>
    )
  })

const Section = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24 mb-14">
    <h2 className="text-2xl font-bold tracking-wide text-purple-700 dark:text-purple-300 mb-5 pb-2 border-b-2 border-purple-700/30 dark:border-purple-300/30">
      {title}
    </h2>
    {children}
  </section>
)

export default function CV() {
  const { profile, education, research, publications, awards, skills, summary } = cv

  // Default 'en' on the server / first render to keep SSR markup stable.
  // After hydration, restore the user's last choice from localStorage.
  const [lang, setLang] = useState('en')
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('cv_lang')
      if (saved === 'en' || saved === 'zh') setLang(saved)
    } catch (e) { /* localStorage unavailable */ }
  }, [])
  const toggleLang = () => {
    const next = lang === 'en' ? 'zh' : 'en'
    setLang(next)
    try { window.localStorage.setItem('cv_lang', next) } catch (e) { /* noop */ }
  }
  const ui = UI[lang]

  // group publications by year, descending
  const pubsByYear = publications.reduce((acc, p) => {
    const k = p.year
    acc[k] = acc[k] || []
    acc[k].push(p)
    return acc
  }, {})
  const years = Object.keys(pubsByYear).map(Number).sort((a, b) => b - a)

  const photoSrc = profile.photo || BLOG.AVATAR || '/avatar.svg'
  const titleStr = t(profile.title, lang)
  const affStr = t(profile.affiliation, lang)
  const metaDesc = ui.metaDesc({
    en: profile.name,
    zh: profile.name_zh || '',
    title: titleStr,
    affiliation: affStr
  })

  return (
    <>
      <Head>
        <title>{`CV | ${profile.name}`}</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={`CV | ${profile.name}`} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={`${profile.links?.website || ''}/cv`} />
      </Head>

      <style>{`
        .cv-root, .cv-root .font-serif {
          font-family: 'Times New Roman', 'Times', 'Liberation Serif', 'Songti SC', serif;
        }
        .cv-root .font-sans {
          font-family: 'Optima LT Pro', 'Optima', 'Optima Nova', 'Avenir Next', 'Avenir', 'Segoe UI', system-ui, sans-serif;
          letter-spacing: 0.01em;
        }
        .cv-root h1, .cv-root h2, .cv-root h3 {
          font-family: 'Optima LT Pro', 'Optima', 'Optima Nova', 'Avenir Next', 'Avenir', 'Segoe UI', system-ui, sans-serif;
          letter-spacing: 0.015em;
        }
        .cv-root sub, .cv-root sup {
          font-size: 0.72em;
          line-height: 0;
          position: relative;
          vertical-align: baseline;
        }
        .cv-root sup { top: -0.5em; }
        .cv-root sub { bottom: -0.25em; }
        .cv-lang-fab {
          position: fixed;
          right: 1.5rem;
          bottom: 1.5rem;
          z-index: 50;
          width: 3rem;
          height: 3rem;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: 'Optima LT Pro', 'Optima', 'Avenir Next', 'Segoe UI', system-ui, sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          letter-spacing: 0.02em;
          color: #fff;
          background: #6d28d9;
          box-shadow: 0 8px 24px rgba(109, 40, 217, 0.32), 0 2px 6px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }
        .cv-lang-fab:hover {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 12px 32px rgba(109, 40, 217, 0.38), 0 4px 8px rgba(0, 0, 0, 0.14);
        }
        .cv-lang-fab:active { transform: scale(0.96); }
        @media (prefers-color-scheme: dark) {
          .cv-lang-fab { background: #c4b5fd; color: #1f2937; }
        }
      `}</style>
      <main className="cv-root min-h-screen bg-white dark:bg-night text-gray-800 dark:text-gray-200 font-serif">
        <div className="max-w-6xl mx-auto px-6 py-10 lg:py-16 lg:flex lg:gap-12">
          {/* Sidebar */}
          <aside className="lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-10 lg:self-start mb-10 lg:mb-0">
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              {photoSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoSrc}
                  alt={profile.name}
                  className="w-44 h-auto rounded-lg object-contain bg-white ring-1 ring-gray-200 dark:ring-gray-700 mb-5"
                />
              )}
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {profile.name}
                {profile.name_zh && (
                  <span className="block text-base font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                    {profile.name_zh}
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                {titleStr}
                <br />
                {affStr}
              </p>
              {profile.tagline && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
                  {t(profile.tagline, lang)}
                </p>
              )}

              <hr className="w-12 my-5 border-gray-300 dark:border-gray-700" />

              <nav className="text-sm space-y-1.5 font-sans w-full">
                {[
                  ['about', ui.nav.about],
                  ['education', ui.nav.education],
                  ['research', ui.nav.research],
                  ['publications', ui.nav.publications],
                  ['awards', ui.nav.awards],
                  ['skills', ui.nav.skills]
                ].map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="block text-gray-600 dark:text-gray-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </nav>

              <hr className="w-12 my-5 border-gray-300 dark:border-gray-700" />

              <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1.5 font-sans w-full break-all">
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-2 hover:text-purple-700 dark:hover:text-purple-300">
                    <i className="fas fa-envelope w-4" /> {profile.email}
                  </a>
                )}
                {profile.links?.github && (
                  <a href={profile.links.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-purple-700 dark:hover:text-purple-300">
                    <i className="fab fa-github w-4" /> GitHub
                  </a>
                )}
                {profile.links?.google_scholar && (
                  <a href={profile.links.google_scholar} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-purple-700 dark:hover:text-purple-300">
                    <i className="fas fa-graduation-cap w-4" /> Google Scholar
                  </a>
                )}
                {profile.links?.orcid && (
                  <a href={profile.links.orcid} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-purple-700 dark:hover:text-purple-300">
                    <i className="fab fa-orcid w-4" /> ORCID
                  </a>
                )}
                {profile.address && (
                  <span className="flex items-start gap-2">
                    <i className="fas fa-map-marker-alt w-4 mt-0.5" />
                    <span>{t(profile.address, lang)}</span>
                  </span>
                )}
              </div>

              {profile.cv_pdf && (
                <a
                  href={profile.cv_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  download="Zhang_Yichen_CV.pdf"
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase border border-purple-700 dark:border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-700 hover:text-white dark:hover:bg-purple-300 dark:hover:text-gray-900 transition-colors font-sans"
                >
                  <i className="fas fa-file-pdf" /> {ui.downloadPdf}
                </a>
              )}

              <Link href="/" className="mt-4 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-sans">
                {ui.backToBlog}
              </Link>
            </div>
          </aside>

          {/* Main content */}
          <article className="flex-1 min-w-0">
            <Section id="about" title={ui.sectionTitles.about}>
              <p className="leading-relaxed text-[15px] text-gray-700 dark:text-gray-300">
                {t(profile.bio, lang)}
              </p>
            </Section>

            <Section id="education" title={ui.sectionTitles.education}>
              <ul className="space-y-5">
                {education.map((e, i) => (
                  <li key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{t(e.school, lang)}</div>
                      <div className="text-[15px] text-gray-700 dark:text-gray-300">{t(e.degree, lang)}</div>
                      {e.details && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t(e.details, lang)}</div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500 font-sans whitespace-nowrap sm:ml-4">
                      {t(e.date, lang)}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            {research?.length > 0 && (
              <Section id="research" title={ui.sectionTitles.research}>
                <ul className="space-y-5">
                  {research.map((r, i) => (
                    <li key={i}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                        <div className="font-semibold text-gray-900 dark:text-white">{t(r.title, lang)}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-500 font-sans whitespace-nowrap sm:ml-4">
                          {t(r.date, lang)}
                        </div>
                      </div>
                      <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed mt-1">
                        {formatScientific(t(r.description, lang))}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section id="publications" title={ui.sectionTitles.publications}>
              {renderPubLegend(lang)}
              {years.map(year => (
                <div key={year} className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 font-sans">
                    {year}
                  </h3>
                  <ol className="space-y-5 list-none">
                    {pubsByYear[year].map((p, i) => (
                      <li key={i} className="pl-5 border-l-2 border-gray-200 dark:border-gray-700 hover:border-purple-700 dark:hover:border-purple-300 transition-colors">
                        <div className="text-[15px] font-medium text-gray-900 dark:text-white leading-snug">
                          {renderTitle(p, lang)}
                        </div>
                        <div className="text-sm mt-1 leading-relaxed">
                          {renderAuthors(p.authors)}
                        </div>
                        <div className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                          {renderCitationLine({ ...p, status: t(p.status, lang) })}
                        </div>
                        {p.highlight && (
                          <p className="text-sm mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                            {formatScientific(t(p.highlight, lang))}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </Section>

            <Section id="awards" title={ui.sectionTitles.awards}>
              <ul className="space-y-3">
                {awards.map((a, i) => (
                  <li key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                    <div>
                      <div className="text-[15px] text-gray-800 dark:text-gray-200">{t(a.title, lang)}</div>
                      {a.org && <div className="text-sm text-gray-500 dark:text-gray-400">{t(a.org, lang)}</div>}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500 font-sans whitespace-nowrap sm:ml-4">
                      {t(a.date, lang)}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="skills" title={ui.sectionTitles.skills}>
              {skills.research_interests?.length > 0 && (
                <div className="mb-5">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 font-sans uppercase tracking-wider text-xs">
                    {ui.skillsLabels.interests}
                  </div>
                  <ul className="list-disc list-inside text-[15px] text-gray-700 dark:text-gray-300 space-y-1">
                    {skills.research_interests.map((s, i) => <li key={i}>{t(s, lang)}</li>)}
                  </ul>
                </div>
              )}
              {[
                [ui.skillsLabels.computation, skills.computation],
                [ui.skillsLabels.ml_potentials, skills.ml_potentials],
                [ui.skillsLabels.characterization, skills.characterization],
                [ui.skillsLabels.engineering, skills.engineering],
                [ui.skillsLabels.programming, skills.programming]
              ].filter(([, items]) => items?.length > 0).map(([label, items]) => (
                <div key={label} className="mb-3 flex flex-col sm:flex-row sm:gap-4">
                  <div className="sm:w-40 text-sm font-semibold text-gray-700 dark:text-gray-300 font-sans uppercase tracking-wider text-xs pt-0.5">
                    {label}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded font-sans">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {summary?.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 font-sans uppercase tracking-wider text-xs">
                    {ui.skillsLabels.summary}
                  </div>
                  <ul className="list-disc list-inside text-[15px] text-gray-700 dark:text-gray-300 space-y-1.5">
                    {summary.map((s, i) => <li key={i}>{t(s, lang)}</li>)}
                  </ul>
                </div>
              )}
            </Section>

            <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 font-sans">
              {ui.footerPrefix} {new Date().getFullYear()}{ui.footerSuffix}
            </footer>
          </article>
        </div>

        <button
          type="button"
          onClick={toggleLang}
          aria-label={ui.toggleAria}
          title={ui.toggleAria}
          className="cv-lang-fab"
        >
          {ui.toggleLabel}
        </button>
      </main>
    </>
  )
}

export async function getStaticProps() {
  return { props: {}, revalidate: BLOG.NEXT_REVALIDATE_SECOND }
}
