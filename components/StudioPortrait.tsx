'use client';

import Image from 'next/image';
import { useState, type PointerEvent } from 'react';
import studioPortrait from '../public/assets/studio-portrait.png';

const sizes = '(max-width: 540px) 90vw, (max-width: 800px) 400px, (max-width: 1400px) 30vw, 400px';

export default function StudioPortrait() {
  const [revealing, setRevealing] = useState(false);

  function moveReveal(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') return;
    const frame = event.currentTarget;
    const bounds = frame.getBoundingClientRect();
    frame.style.setProperty('--portrait-x', `${event.clientX - bounds.left}px`);
    frame.style.setProperty('--portrait-y', `${event.clientY - bounds.top}px`);
  }

  return (
    <div
      className="philosophy-portrait"
      data-revealing={revealing}
      onPointerEnter={(event) => {
        if (event.pointerType === 'touch') return;
        moveReveal(event);
        setRevealing(true);
      }}
      onPointerMove={moveReveal}
      onPointerLeave={() => setRevealing(false)}
      onPointerCancel={() => setRevealing(false)}
    >
      <Image
        className="portrait-monochrome"
        src={studioPortrait}
        alt="Portrait of a man in a black shirt, seated beside greenery"
        sizes={sizes}
        placeholder="blur"
        draggable={false}
      />
      <Image
        className="portrait-color"
        src={studioPortrait}
        alt=""
        aria-hidden="true"
        fill
        sizes={sizes}
        draggable={false}
      />
    </div>
  );
}
