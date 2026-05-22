import React from 'react';
import { useSeason } from '@/lib/season-context';

interface Particle {
  id: number;
  style: React.CSSProperties;
  content: React.ReactNode;
}

function snowflakeSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="8" y1="1" x2="8" y2="15" stroke="var(--coral)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="8" x2="15" y2="8" stroke="var(--coral)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="2.93" y1="2.93" x2="13.07" y2="13.07" stroke="var(--coral)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="13.07" y1="2.93" x2="2.93" y2="13.07" stroke="var(--coral)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="1.5" fill="var(--coral)"/>
    </svg>
  );
}

function petalSVG() {
  return (
    <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="6" cy="9" rx="5" ry="8" fill="var(--coral)" opacity="0.7" transform="rotate(-20 6 9)"/>
    </svg>
  );
}

function leafSVG() {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 1 C12 4 13 10 7 17 C1 10 2 4 7 1Z" fill="var(--coral)" opacity="0.75"/>
      <line x1="7" y1="3" x2="7" y2="16" stroke="var(--cream)" strokeWidth="0.8" strokeLinecap="round"/>
    </svg>
  );
}

const WINTER_PARTICLES: Particle[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  style: {
    position: 'absolute',
    left: `${8 + i * 11}%`,
    top: '-5%',
    animation: `particle-fall ${12 + i * 1.1}s ${i * 1.4}s infinite linear`,
    pointerEvents: 'none',
    zIndex: 0,
  } as React.CSSProperties,
  content: snowflakeSVG(),
}));

const SPRING_PARTICLES: Particle[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  style: {
    position: 'absolute',
    left: `${5 + i * 12}%`,
    bottom: '-5%',
    animation: `particle-rise ${10 + i * 0.9}s ${i * 1.2}s infinite linear`,
    pointerEvents: 'none',
    zIndex: 0,
  } as React.CSSProperties,
  content: petalSVG(),
}));

const SUMMER_PARTICLES: Particle[] = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  style: {
    position: 'absolute',
    left: `${10 + i * 14}%`,
    top: '15%',
    width: '1.5px',
    height: `${30 + i * 8}px`,
    background: 'var(--mustard)',
    opacity: 0.15,
    animation: `particle-pulse ${4 + i * 0.7}s ${i * 0.9}s infinite ease-in-out`,
    borderRadius: '1px',
    pointerEvents: 'none',
    zIndex: 0,
  } as React.CSSProperties,
  content: null,
}));

const AUTUMN_PARTICLES: Particle[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  style: {
    position: 'absolute',
    left: `${6 + i * 11}%`,
    top: '-5%',
    animation: `particle-spin-fall ${8 + i * 0.9}s ${i * 1.1}s infinite linear`,
    pointerEvents: 'none',
    zIndex: 0,
  } as React.CSSProperties,
  content: leafSVG(),
}));

const SEASON_PARTICLES: Record<string, Particle[]> = {
  winter: WINTER_PARTICLES,
  spring: SPRING_PARTICLES,
  summer: SUMMER_PARTICLES,
  autumn: AUTUMN_PARTICLES,
};

export default function SeasonalParticles() {
  const season = useSeason();
  const particles = SEASON_PARTICLES[season] ?? [];

  return (
    <>
      {particles.map((p) => (
        <div key={p.id} style={p.style} aria-hidden="true">
          {p.content}
        </div>
      ))}
    </>
  );
}
