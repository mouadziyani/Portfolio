'use strict';
// Manga motion layer: everything here is progressive enhancement. Without JS, without the
// CDN libraries, or with reduced motion, the page stays fully readable and usable.
(() => {
    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------- Tape marquees: duplicate each track for a seamless loop ---------- */
    if (!reduce) {
        document.querySelectorAll('.marquee').forEach(marquee => {
            const clone = marquee.firstElementChild.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            marquee.appendChild(clone);
        });
    }

    });
})();
