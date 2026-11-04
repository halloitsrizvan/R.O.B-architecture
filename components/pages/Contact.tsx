import ContactForm from '../ContactForm';
export default function Contact() {
  return (
    <main id="main">
      <section className="page-heading">
        <span className="eyebrow reveal">{'Contact / Start a conversation'}</span>
        <h1 className="reveal">
          {'Good spaces start'}
          <br />
          {'with '}
          <em>{'a conversation.'}</em>
        </h1>
      </section>
      <section className="contact-grid section-pad">
        <div className="contact-info reveal">
          <span className="eyebrow">{'Find us'}</span>
          <p>
            {'R.O.B Architectural Studio'}
            <br />
            {'Peravoor, Kannur, Kerala'}
            <br />
            {'India, 670673'}
          </p>
          <span className="eyebrow">{'Write to us'}</span>
          <a href="mailto:robarchstudio@gmail.com">{'robarchstudio@gmail.com ↗'}</a>
          <p className="contact-note">{'Architecture · Interiors · Landscape'}</p>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
