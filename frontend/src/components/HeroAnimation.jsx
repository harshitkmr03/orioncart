import React, { useEffect, useRef, useState } from 'react';

// This component shows background video(s) that cross-fade and fall back to a gradient
import hero2 from '../assets/hero2.svg';

// use only video2 now
const videoSources = ['/video2.mp4'];

const HeroAnimation = () => {
    const [active, setActive] = useState(0);
    const refs = useRef([]);

    // cycle videos
    useEffect(() => {
        const id = setInterval(() => setActive(a => (a + 1) % videoSources.length), 9000);
        return () => clearInterval(id);
    }, []);

    // Try to autoplay the active video with the current muted state (always muted now)
    useEffect(() => {
        // pause all but the active video; attempt to play the active one
        refs.current.forEach((v, idx) => {
            if (!v) return;
            if (idx === active) {
                v.muted = true; // Always muted
                const p = v.play();
                if (p && typeof p.then === 'function') {
                    p.catch(() => {
                        // Autoplay failed, try again muted (redundant but safe)
                        try { v.muted = true; v.play(); } catch (e) { }
                    });
                }
            } else {
                try { v.pause(); v.currentTime = 0; } catch (e) { /* ignore */ }
            }
        });
    }, [active]);

    return (
        <div className="absolute inset-0 overflow-hidden bg-transparent">
            {/* Background video layers */}
            {/* bring the video layer forward so it's visible under the overlay text */}
            <div className="absolute inset-0 z-0">
                {videoSources.map((src, i) => (
                    <video
                        key={src}
                        ref={el => (refs.current[i] = el)}
                        src={src}
                        className={`hero-video absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === active ? 'opacity-100 z-0' : 'opacity-0 z-[-1]'}`}
                        poster={hero2}
                        loop
                        playsInline
                        muted={true}
                        autoPlay
                        preload="metadata"
                        aria-hidden="true"
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroAnimation;
