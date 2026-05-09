import Head from 'next/head'
import Link from 'next/link'
import BLOG from '@/blog.config'
import cv from '@/data/cv.json'

const renderVenue = p => {
  if (!p.doi) {
    return <em className="not-italic font-semibold text-purple-700 dark:text-purple-300">{p.venue}</em>
  }
  return (
    <a
      href={`https://doi.org/${p.doi}`}
      target="_blank"
      rel="noopener noreferrer"
      className="not-italic font-semibold text-purple-700 dark:text-purple-300 hover:underline"
    >
      {p.venue}
    </a>
  )
}

const renderAuthors = authors =>
  authors.map((a, i) => {
    const sup = `${a.co_first ? '‡' : ''}${a.corresponding ? '*' : ''}`
    const cls = a.self
      ? 'font-semibold text-purple-700 dark:text-purple-300 underline decoration-dotted underline-offset-2'
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
    <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-purple-700 dark:text-purple-300 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
      {title}
    </h2>
    {children}
  </section>
)

export default function CV() {
  const { profile, education, publications, awards, skills, summary } = cv

  // group publications by year, descending
  const pubsByYear = publications.reduce((acc, p) => {
    const k = p.year
    acc[k] = acc[k] || []
    acc[k].push(p)
    return acc
  }, {})
  const years = Object.keys(pubsByYear).map(Number).sort((a, b) => b - a)

  const photoSrc = profile.photo || BLOG.AVATAR || '/avatar.svg'

  return (
    <>
      <Head>
        <title>{`CV | ${profile.name}`}</title>
        <meta name="description" content={`Curriculum Vitae of ${profile.name}, ${profile.title}, ${profile.affiliation}.`} />
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
                {profile.title}
                <br />
                {profile.affiliation}
              </p>
              {profile.tagline && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
                  {profile.tagline}
                </p>
              )}

              <hr className="w-12 my-5 border-gray-300 dark:border-gray-700" />

              <nav className="text-sm space-y-1.5 font-sans w-full">
                {[
                  ['about', 'About'],
                  ['education', 'Education'],
                  ['publications', 'Publications'],
                  ['awards', 'Awards'],
                  ['skills', 'Skills']
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
                    <span>{profile.address}</span>
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
                  <i className="fas fa-file-pdf" /> Download PDF
                </a>
              )}

              <Link href="/" className="mt-4 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-sans">
                ← Back to blog
              </Link>
            </div>
          </aside>

          {/* Main content */}
          <article className="flex-1 min-w-0">
            <Section id="about" title="About">
              <p className="leading-relaxed text-[15px] text-gray-700 dark:text-gray-300">
                {profile.bio}
              </p>
            </Section>

            <Section id="education" title="Education">
              <ul className="space-y-5">
                {education.map((e, i) => (
                  <li key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{e.school}</div>
                      <div className="text-[15px] text-gray-700 dark:text-gray-300">{e.degree}</div>
                      {e.details && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{e.details}</div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500 font-sans whitespace-nowrap sm:ml-4">
                      {e.date}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="publications" title="Publications">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 italic">
                <sup>‡</sup> co-first authorship · <sup>*</sup> corresponding author · <span className="font-semibold text-purple-700 dark:text-purple-300 underline decoration-dotted">underlined</span> = author
              </p>
              {years.map(year => (
                <div key={year} className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 font-sans">
                    {year}
                  </h3>
                  <ol className="space-y-5 list-none">
                    {pubsByYear[year].map((p, i) => (
                      <li key={i} className="pl-5 border-l-2 border-gray-200 dark:border-gray-700 hover:border-purple-700 dark:hover:border-purple-300 transition-colors">
                        <div className="text-[15px] font-medium text-gray-900 dark:text-white leading-snug">
                          {p.title}
                        </div>
                        <div className="text-sm mt-1 leading-relaxed">
                          {renderAuthors(p.authors)}
                        </div>
                        <div className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                          {renderVenue(p)}
                          {p.volume_pages && <span>, {p.volume_pages}</span>}
                          {p.status && <span className="italic"> ({p.status})</span>}
                          <span> · {p.year}</span>
                          {p.doi && (
                            <a
                              href={`https://doi.org/${p.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-xs text-gray-500 dark:text-gray-500 hover:text-purple-700 dark:hover:text-purple-300"
                            >
                              [DOI]
                            </a>
                          )}
                        </div>
                        {p.highlight && (
                          <p className="text-sm mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                            {p.highlight}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </Section>

            <Section id="awards" title="Awards & Scholarships">
              <ul className="space-y-3">
                {awards.map((a, i) => (
                  <li key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                    <div>
                      <div className="text-[15px] text-gray-800 dark:text-gray-200">{a.title}</div>
                      {a.org && <div className="text-sm text-gray-500 dark:text-gray-400">{a.org}</div>}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500 font-sans whitespace-nowrap sm:ml-4">
                      {a.date}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="skills" title="Skills & Interests">
              {skills.research_interests?.length > 0 && (
                <div className="mb-5">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 font-sans uppercase tracking-wider text-xs">
                    Research interests
                  </div>
                  <ul className="list-disc list-inside text-[15px] text-gray-700 dark:text-gray-300 space-y-1">
                    {skills.research_interests.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {[
                ['Computation', skills.computation],
                ['Characterization', skills.characterization],
                ['Engineering', skills.engineering],
                ['Programming', skills.programming]
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
                    Summary
                  </div>
                  <ul className="list-disc list-inside text-[15px] text-gray-700 dark:text-gray-300 space-y-1.5">
                    {summary.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </Section>

            <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 font-sans">
              Last updated {new Date().getFullYear()}. Built with Next.js · Hosted on Vercel.
            </footer>
          </article>
        </div>
      </main>
    </>
  )
}

export async function getStaticProps() {
  return { props: {}, revalidate: BLOG.NEXT_REVALIDATE_SECOND }
}
