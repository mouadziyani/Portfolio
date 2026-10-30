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

    /* ---------- Ink sky: falling petals, speed lines when scrolling fast ---------- */
    // Shared with the scroll code below: scroll speed blows the petals, the pointer pushes them away.
    const sky = { wind: 0, px: -9999, py: -9999 };
    if (finePointer) addEventListener('pointermove', e => { sky.px = e.clientX; sky.py = e.clientY; }, { passive: true });
    const canvas = document.querySelector('#sky');
    if (canvas && canvas.getContext && !reduce) {
        const ctx = canvas.getContext('2d');
        let w = 0, h = 0, petals = [], running = true;
        const rand = (a, b) => a + Math.random() * (b - a);
        const inks = ['#d92632', '#d92632', '#d92632', '#121212', '#fffdf8'];
        function makePetal(fromTop) {
            return {
                x: rand(-50, w + 50), y: fromTop ? rand(-h, -20) : rand(0, h),
                r: rand(5, 10), vy: rand(0.35, 0.9), vx: rand(-0.3, 0.5),
                rot: rand(0, Math.PI * 2), vr: rand(-0.02, 0.02), flip: rand(0, Math.PI * 2), vf: rand(0.01, 0.04),
                color: inks[(Math.random() * inks.length) | 0]
            };
        }
        function resize() {
            const dpr = Math.min(devicePixelRatio || 1, 2);
            w = innerWidth; h = innerHeight;
            canvas.width = w * dpr; canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            petals = Array.from({ length: Math.min(30, Math.round(w / 50)) }, () => makePetal(false));
        }
        function drawPetal(p) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(Math.cos(p.flip), 1);
            ctx.beginPath();
            ctx.moveTo(0, -p.r);
            ctx.bezierCurveTo(p.r, -p.r * 0.6, p.r * 0.8, p.r * 0.7, 0, p.r);
            ctx.bezierCurveTo(-p.r * 0.8, p.r * 0.7, -p.r, -p.r * 0.6, 0, -p.r);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.85;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#121212';
            ctx.stroke();
            ctx.restore();
        }
        function draw(t) {
            ctx.clearRect(0, 0, w, h);
            const speed = Math.abs(sky.wind);
            if (speed > 1.5) { // manga speed lines while the reader races through the page
                ctx.strokeStyle = 'rgba(18,18,18,.22)';
                ctx.lineCap = 'round';
                const n = Math.round(speed * 3);
                for (let i = 0; i < n; i++) {
                    const x = Math.random() * w, y = Math.random() * h, len = rand(40, 140) * speed / 6;
                    ctx.lineWidth = rand(1, 3);
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
                }
            }
            sky.wind *= 0.94;
            for (const p of petals) {
                const dx = p.x - sky.px, dy = p.y - sky.py, d2 = dx * dx + dy * dy;
                if (d2 < 12000) { const f = (12000 - d2) / 12000 * 4, d = Math.sqrt(d2) || 1; p.x += dx / d * f; p.y += dy / d * f; p.vr += 0.004; }
                p.y += p.vy - sky.wind; p.x += p.vx + Math.sin(t * 0.001 + p.flip) * 0.35;
                p.rot += p.vr; p.flip += p.vf + speed * 0.02;
                if (p.y < -h - 40) p.y = h + 10; // blown far above by fast scrolling: re-enter from below
                if (p.y > h + 20 || p.x > w + 60 || p.x < -60) Object.assign(p, makePetal(true));
                drawPetal(p);
            }
        }
        function loop(t) {
            if (!running) return;
            draw(t);
            requestAnimationFrame(loop);
        }
        resize();
        let resizeTimer;
        addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
        requestAnimationFrame(loop);
        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(loop);
        });
    }

    /* ---------- Bail out gracefully: reduced motion or missing libraries ---------- */
    const intro = document.querySelector('#intro');
    function dismissIntro() {
        root.classList.remove('play-intro');
        if (intro) intro.hidden = true;
    }
    if (reduce || !window.gsap || !window.ScrollTrigger) { dismissIntro(); return; }

    gsap.registerPlugin(ScrollTrigger);
    root.classList.add('motion');

    /* ---------- Smooth scrolling (Lenis) wired into GSAP's ticker ---------- */
    let lenis = null;
    if (window.Lenis) {
        lenis = new Lenis({ lerp: 0.09 });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(time => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        window.lenis = lenis;
        document.addEventListener('click', event => {
            const link = event.target.closest('a[href^="#"]');
            if (!link || link.hash.length < 2) return;
            const target = document.querySelector(link.hash);
            if (!target) return;
            event.preventDefault();
            lenis.scrollTo(link.hash === '#home' ? 0 : target, { offset: link.hash === '#main' ? 0 : -70, duration: 1.4 });
            history.pushState(null, '', link.hash);
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
            target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
        });
    }

    gsap.to('.scroll-progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    const impact = document.querySelector('.impact');
    const flash = (strength = 0.6) => gsap.fromTo(impact, { opacity: strength, scale: 1.1 }, { opacity: 0, scale: 1, duration: 0.55, ease: 'power2.out' });

    });
})();
