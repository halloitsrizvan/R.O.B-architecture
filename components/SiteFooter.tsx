export default function SiteFooter() {
  return (
    <footer>
      <div className="footer-top">
        <a className="footer-name" href="/index.html">
          {'R.O.B'}
          <span>{'ARCHITECTURAL STUDIO'}</span>
        </a>
        <div>
          <span className="eyebrow">{'Visit the studio'}</span>
          <p>
            {'Peravoor, Kannur, Kerala'}
            <br />
            {'India, 670673'}
          </p>
        </div>
        <div>
          <span className="eyebrow">{'New inquiries'}</span>
          <a href="mailto:robarchstudio@gmail.com">{'robarchstudio@gmail.com ↗'}</a>
        </div>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        <span>{'R'}</span>
        <span>{'O'}</span>
        <span>{'B'}</span>
      </div>
      <div className="footer-bottom">
        <span>{'© 2026 R.O.B Architectural Studio'}</span>
        <span>{'Art + Architecture · Interior + Landscape'}</span>
        <a href="#top">{'Back to top ↑'}</a>
      </div>
    </footer>
  );
}
