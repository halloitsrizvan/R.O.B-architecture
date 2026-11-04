import ProjectGrid from '../ProjectGrid';
export default function Index() {
  return (
    <main id="main">
      <section className="hero">
        <img
          className="hero-image"
          src="/assets/hero-banner.jpg"
          alt="Architectural exterior with tropical landscaping"
          fetchPriority="high"
        />
        <div className="hero-shade"></div>
        <div className="hero-content">
          <span className="eyebrow">{'R.O.B Architectural Studio / Kerala'}</span>
          <h1>
            {'Spaces for living.'}
            <br />
            <em>{'Designed to last.'}</em>
          </h1>
          <div className="hero-bottom">
            <a
              className="cta cta-light hero-cta"
              href="https://wa.me/918921533894"
              target="_blank"
              rel="noopener noreferrer"
            >
              {'Start a project '}
              <span aria-hidden="true">{'↗'}</span>
            </a>
          </div>
        </div>
      </section>
      <section id="studio" className="studio-intro section-pad">
        <span className="eyebrow reveal">{'01 / The studio'}</span>
        <div className="studio-statement reveal">
          <h2>
            {'Architecture begins with a place.'}
            <br />
            {'And the people who '}
            <em>{'call it home.'}</em>
          </h2>
          <div className="studio-bottom">
            <p>
              {
                'We are R.O.B, an architectural studio in Kerala exploring the connection between built spaces and everyday life. Through considered proportions, honest materials, and a sensitivity to context, we create places with a quiet sense of belonging.'
              }
            </p>
            <a className="text-link" href="/about.html">
              {'Discover our studio ↗'}
            </a>
          </div>
        </div>
      </section>
      <section className="selected section-pad">
        <div className="section-heading reveal">
          <span className="eyebrow">{'02 / Selected work'}</span>
          <a className="text-link" href="/projects.html">
            {'All projects ↗'}
          </a>
        </div>
        <ProjectGrid featured />
      </section>
      <section className="project-cta chapter-section section-pad">
        <div className="chapter-copy reveal">
          <span className="eyebrow">{'Your next chapter'}</span>
          <h2>
            {'Every great space starts with'}
            <br />
            <em>{'a little possibility.'}</em>
          </h2>
          <a
            className="cta chapter-link"
            href="https://wa.me/918921533894"
            target="_blank"
            rel="noopener noreferrer"
          >
            {'Start your story '}
            <span aria-hidden="true">{'↗'}</span>
          </a>
        </div>
        <div className="chapter-art reveal" aria-hidden="true">
          <svg viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="chapter-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M30 0H0V30" stroke="currentColor" strokeOpacity=".1"></path>
              </pattern>
            </defs>
            <circle cx="300" cy="300" r="275" fill="url(#chapter-grid)"></circle>
            <g className="chapter-orbit" stroke="currentColor">
              <circle cx="300" cy="300" r="255" strokeOpacity=".25"></circle>
              <circle cx="300" cy="300" r="225" strokeDasharray="2 10" strokeOpacity=".4"></circle>
              <circle cx="555" cy="300" r="5" fill="currentColor"></circle>
            </g>
            <g
              className="chapter-plan"
              stroke="currentColor"
              strokeLinecap="square"
              strokeLinejoin="round"
            >
              <path
                d="M150 390V190L300 105 450 190V390L300 478Z"
                fill="#313d32"
                strokeWidth="2"
              ></path>
              <path
                d="M150 290L300 378 450 290M300 378V478M300 105V205M150 190L300 278 450 190M300 278V378"
                strokeOpacity=".45"
              ></path>
              <path
                d="M175 266V205L300 133 425 205V266L300 339Z"
                fill="#dce4b4"
                fillOpacity=".12"
                strokeWidth="2"
              ></path>
              <path
                d="M175 205L300 278 425 205M300 278V339M237 169L361 242M237 242L361 169"
                strokeOpacity=".65"
              ></path>
              <path
                d="M150 390L300 302 450 390M215 352V428M385 352V428"
                strokeDasharray="4 6"
                strokeOpacity=".4"
              ></path>
              <path
                d="M120 190V390M113 190H127M113 390H127M165 420L285 490M160 427L169 413M280 497L289 483"
                strokeOpacity=".4"
              ></path>
              <path d="M300 70V90M290 80H310M480 390H500M490 380V400" strokeOpacity=".6"></path>
            </g>
            <circle cx="300" cy="278" r="7" fill="#dce4b4"></circle>
          </svg>
        </div>
      </section>
      <section className="philosophy">
        <img
          src="/assets/about-image.png"
          alt="Architecture and landscape in conversation"
          loading="lazy"
        />
        <div className="reveal">
          <span className="eyebrow">{'Less, but with meaning'}</span>
          <h2>
            {'Rooted in place.'}
            <br />
            <em>{'Open to possibility.'}</em>
          </h2>
          <a className="text-link" href="/services.html">
            {'Our expertise ↗'}
          </a>
        </div>
      </section>
      <section className="process section-pad">
        <span className="eyebrow">{'Our approach'}</span>
        <div className="process-grid">
          <article className="reveal">
            <span className="eyebrow">{'01'}</span>
            <h3>{'Observe'}</h3>
            <p>{'Listening to you. Understanding the site, its light, and the life around it.'}</p>
          </article>
          <article className="reveal">
            <span className="eyebrow">{'02'}</span>
            <h3>{'Explore'}</h3>
            <p>{'Turning ideas into spatial possibilities through sketches and dialogue.'}</p>
          </article>
          <article className="reveal">
            <span className="eyebrow">{'03'}</span>
            <h3>{'Refine'}</h3>
            <p>
              {'Resolving proportions, materials, and the details that make a place feel right.'}
            </p>
          </article>
          <article className="reveal">
            <span className="eyebrow">{'04'}</span>
            <h3>{'Realise'}</h3>
            <p>{'Bringing the vision together with care, from drawing to built form.'}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
