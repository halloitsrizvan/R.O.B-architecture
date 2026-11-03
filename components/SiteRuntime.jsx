'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initMotion } from '../lib/motion';
import { initInteractions } from '../lib/interactions';

export default function SiteRuntime({ bodyClass }) {
  useEffect(() => {
    document.body.className = bodyClass;
    const stopMotion = initMotion(gsap, ScrollTrigger);
    const stopInteractions = initInteractions();
    return () => {
      stopInteractions();
      stopMotion();
      document.body.className = '';
      document.documentElement.classList.remove('intro-pending', 'motion-ready');
    };
  }, [bodyClass]);
  return null;
}
