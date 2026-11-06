export default function Intro() {
  return (
    <>
      <div className="intro is-active" aria-hidden="true">
        <img src="/logo.png" alt="" loading="eager" decoding="async" />
      </div>
      <noscript>
        <style>{'.intro { display: none !important; }'}</style>
      </noscript>
    </>
  );
}
