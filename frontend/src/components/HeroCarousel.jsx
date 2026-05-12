import React, { useEffect, useRef, useState } from 'react';
import hero1 from '../assets/hero1.svg';
import hero2 from '../assets/hero2.svg';
import hero3 from '../assets/hero3.svg';

// Candidate video filename groups to support common naming (handles the files with spaces that exist in `public/`)
const videoCandidates = [
  ['/video1.mp4', '/video 1 .mp4', '/video%201%20.mp4'],
  ['/video2.mp4', '/video 2 .mp4', '/video%202%20.mp4']
];

// Default image slides are used as a fallback if videos are not present
const imageSlides = [
  { type: 'image', src: hero1 },
  { type: 'image', src: hero2 },
  { type: 'image', src: hero3 }
];

const AppBadges = () => (
  <div className="mt-6 flex items-center justify-center gap-4">
    <a href="#" className="inline-flex items-center gap-3 bg-black/80 text-white px-4 py-2 rounded-lg border border-white/20 text-sm shadow-lg hover:opacity-95 transition">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6.5C3 4.57 4.57 3 6.5 3h11C19.43 3 21 4.57 21 6.5v11c0 1.93-1.57 3.5-3.5 3.5h-11C4.57 21 3 19.43 3 17.5v-11z" stroke="#fff" strokeWidth="1.2"/></svg>
      <span>Get it on Google Play</span>
    </a>

    <a href="#" className="inline-flex items-center gap-3 bg-black/80 text-white px-4 py-2 rounded-lg border border-white/20 text-sm shadow-lg hover:opacity-95 transition">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16.365 1.43c.02.14.09.295.24.46.145.18.28.28.44.45.87.94 1.32 2.14 1.32 3.38 0 2.02-.83 4.1-2.33 5.38-.5.44-1.06.83-1.66 1.1-.8.37-1.6.5-2.37.5-.18 0-.35 0-.52-.02-.18-.02-.36-.05-.54-.08-.04-.01-.12-.02-.24-.04-.64-.11-1.28-.33-1.9-.66C6.9 14.12 5.2 12.1 5.2 8.69c0-2.4.86-4.48 2.44-6.01C8.61.61 10.4 0 12.53 0c1.82 0 3 .44 3.84 1.18.39.34.63.72.72 1.25z" stroke="#fff" strokeWidth="0.8"/></svg>
      <span>Download on the App Store</span>
    </a>
  </div>
);

const HeroCarousel = ({ overlayChildren }) => {
  const [index, setIndex] = useState(0);
  const [slides, setSlides] = useState(imageSlides);
  const [muted, setMuted] = useState(false); // user asked videos not muted by default
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const videoRefs = useRef([]);

  // On mount try to detect if video files exist in /public and use them first
  useEffect(() => {
    let cancelled = false;

    async function checkVideos() {
      try {
        // For each candidate group (video1, video2) check each candidate path and pick the first existing path
        const checks = await Promise.all(videoCandidates.map(async (group) => {
          for (const p of group) {
            try {
              const r = await fetch(p, { method: 'HEAD' });
              if (r.ok) return p; // return the first available path
            } catch (err) {
              try {
                const rr = await fetch(p, { method: 'GET' });
                if (rr.ok) return p;
              } catch (e) {
                // continue to next candidate
              }
            }
          }
          return null;
        }));

        if (!cancelled) {
          const availableVideos = checks
            .filter(Boolean)
            .map(p => ({ type: 'video', src: p }));

          // prefer available videos (in candidate order) and then append image fallbacks
          setSlides([...availableVideos, ...imageSlides]);
        }
      } catch (err) {
        // if anything goes wrong, just leave the image slides
        if (!cancelled) setSlides(imageSlides);
      }
    }

    checkVideos();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % slides.length), 4200);
    return () => clearInterval(t);
  }, [slides]);

  // When active slide changes, try to play the video with current muted state.
  useEffect(() => {
    const active = slides[index];
    if (active && active.type === 'video') {
      const el = videoRefs.current[index];
      if (!el) return;

      // Ensure muted property is applied
      el.muted = muted;

      // Try to play; if autoplay with sound is blocked, fallback to muted playback and show control
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          // Autoplay with sound blocked by browser — fall back to muted autoplay
          setAutoplayBlocked(true);
          setMuted(true);
          // try to play muted
          try { el.muted = true; el.play(); } catch (e) { /* ignore */ }
        });
      }
    }
  }, [index, slides, muted]);

  return (
    <header className="relative w-full select-none">
      <div className="hero-carousel h-[420px] md:h-[560px] lg:h-[720px] overflow-hidden rounded-3xl shadow-xl">
        {/* Mute / Unmute control (visible when there are any video slides) */}
        {slides.some(s => s.type === 'video') && (
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
            {autoplayBlocked && (
              <div className="text-xs text-white/80 px-3 py-1 bg-black/40 rounded-full border border-white/10">Autoplay blocked — click to allow sound</div>
            )}
            <button
              className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center border border-white/20 text-white hover:bg-black/60 transition-shadow shadow-lg"
              onClick={() => {
                const nextMuted = !muted;
                setMuted(nextMuted);
                // apply change to all video refs
                videoRefs.current.forEach(v => { if (v) v.muted = nextMuted; });
                // if unmuting, attempt to play active video (user gesture) — should succeed
                const el = videoRefs.current[index];
                if (el && !nextMuted) {
                  el.play().catch(() => {
                    // if still fails, mark autoplay blocked and re-mute so playback continues
                    setAutoplayBlocked(true);
                    setMuted(true);
                    videoRefs.current.forEach(v => { if (v) v.muted = true; });
                  });
                }
              }}
              aria-label={muted ? 'Unmute video' : 'Mute video'}
            >
              {muted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 9v6h4l5 5V4L9 9H5z" fill="#fff"/><path d="M19.07 4.93l-1.41 1.41L20.59 9l-2.93 2.66 1.41 1.41L22 10.41 19.07 7.48z" fill="#fff" opacity="0.9"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 9v6h4l5 5V4L9 9H5z" fill="#fff"/><path d="M16.5 7.5c1.39 1.39 2.25 3.25 2.25 5.25s-.86 3.86-2.25 5.25" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
          </div>
        )}
        {slides.map((s, i) => (
          <div key={i} className={`hero-slide absolute inset-0 transition-opacity duration-1000 ${i === index ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} aria-hidden={i === index ? 'false' : 'true'}>
            {s.type === 'video' ? (
              <video
                ref={(el) => { videoRefs.current[i] = el }}
                className="w-full h-full object-cover"
                src={s.src}
                autoPlay
                muted={muted}
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
              />
            ) : (
              <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${s.src})` }} />
            )}
          </div>
        ))}

        {/* subtle overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent mix-blend-multiply" />

        {/* content */}
        <div className="absolute inset-0 flex items-center justify-center px-6 md:px-12">
          <div className="text-center text-white max-w-3xl">
            <div className="text-sm md:text-base uppercase font-semibold tracking-widest opacity-90 mb-4">Shop smarter, delivered faster</div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight drop-shadow-xl">Shop Smarter, Delivered Faster</h1>
            <p className="mt-4 text-sm md:text-lg text-white/90">Connect with neighborhood shops and get everything — groceries, medicine & more — delivered quickly.</p>

            {overlayChildren}

            <AppBadges />

            {/* subtle scroll indicator */}
            <div className="mt-8 text-xs text-white/80">Scroll down ▾</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroCarousel;
