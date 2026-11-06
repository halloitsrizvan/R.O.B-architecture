import PortfolioImage from '../PortfolioImage';

export default function Services() {
  return (
    <main id="main">
      <section className="page-heading">
        <span className="eyebrow reveal">{'Expertise / What we do'}</span>
        <h1 className="reveal">
          {'One vision.'}
          <br />
          <em>{'Every dimension.'}</em>
        </h1>
        <p className="reveal">
          {
            'From the first line on paper to the spaces in between, we approach every scale with the same care.'
          }
        </p>
      </section>
      <section className="service-list section-pad">
        <article className="service-row reveal">
          <div>
            <span className="eyebrow">{'01 / Architecture'}</span>
            <h2>{'Buildings that belong.'}</h2>
            <p>
              {
                'We shape homes and built environments around people, climate, and context. Form and function find a natural balance through careful planning and considered material choices.'
              }
            </p>
            <a
              className="text-link"
              href="https://wa.me/918921533894"
              target="_blank"
              rel="noopener noreferrer"
            >
              {'Discuss your project ↗'}
            </a>
          </div>
          <PortfolioImage
            image={{ src: '/assets/image2.jpg', alt: 'Architecture by R.O.B Studio' }}
            sizes="(max-width: 800px) 90vw, 45vw"
          />
        </article>
        <article className="service-row reveal">
          <div>
            <span className="eyebrow">{'02 / Interior design'}</span>
            <h2>{'Life, from the inside.'}</h2>
            <p>
              {
                'Thoughtful interiors bring texture, light, and everyday rituals together. We create a coherent experience through spatial planning, material palettes, furniture, and details.'
              }
            </p>
            <a
              className="text-link"
              href="https://wa.me/918921533894"
              target="_blank"
              rel="noopener noreferrer"
            >
              {'Discuss your project ↗'}
            </a>
          </div>
          <PortfolioImage
            image={{ src: '/assets/image5.jpg', alt: 'Interior design by R.O.B Studio' }}
            sizes="(max-width: 800px) 90vw, 45vw"
          />
        </article>
        <article className="service-row reveal">
          <div>
            <span className="eyebrow">{'03 / Landscape design'}</span>
            <h2>{'Room for nature.'}</h2>
            <p>
              {
                'Outdoor spaces extend the life of a building. We explore planting, pathways, and gathering places that connect architecture to its natural setting.'
              }
            </p>
            <a
              className="text-link"
              href="https://wa.me/918921533894"
              target="_blank"
              rel="noopener noreferrer"
            >
              {'Discuss your project ↗'}
            </a>
          </div>
          <PortfolioImage
            image={{ src: '/assets/image1.jpg', alt: 'Landscape design by R.O.B Studio' }}
            sizes="(max-width: 800px) 90vw, 45vw"
          />
        </article>
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
