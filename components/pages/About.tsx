export default function About() {
  return (
    <main id="main">
      <section className="page-heading">
        <span className="eyebrow reveal">{'The studio / Our philosophy'}</span>
        <h1 className="reveal">
          {'A sense of place.'}
          <br />
          <em>{'A way of thinking.'}</em>
        </h1>
        <p className="reveal">
          {
            'Art + Architecture. A practice shaped by curiosity, context, and the belief that good design enriches daily life.'
          }
        </p>
      </section>
      <img
        className="wide-image reveal"
        src="/assets/about-image.png"
        alt="A considered balance of built form and nature"
      />
      <section className="editorial section-pad">
        <span className="eyebrow">{'Our philosophy'}</span>
        <div className="reveal">
          <h2>
            {'Minimalism'}
            <br />
            {'with '}
            <em>{'meaning.'}</em>
          </h2>
          <p>
            {
              'At R.O.B Architectural Studio, we believe that space is about the life that happens within it. Our practice brings together the warmth of traditional Kerala architecture and the clarity of contemporary design.'
            }
          </p>
          <p>
            {
              'We work with light, landscape, and honest materials to create spaces that respond to their surroundings. Each decision is guided by how a place will be experienced, lived in, and remembered.'
            }
          </p>
          <div className="signature">
            {'Robin Joseph'}
            <span className="eyebrow">{'Principal Architect & Founder'}</span>
          </div>
        </div>
      </section>
      <section className="project-cta section-pad">
        <div>
          <span className="eyebrow">{'Work with our studio'}</span>
          <h2>
            {"Let's shape "}
            <em>{'your vision.'}</em>
          </h2>
        </div>
        <a
          className="cta "
          href="https://wa.me/918921533894"
          target="_blank"
          rel="noopener noreferrer"
        >
          {'Start a project'}
          <span aria-hidden="true">{'↗'}</span>
        </a>
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
