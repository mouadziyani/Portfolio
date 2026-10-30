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

    /* ---------- Hero: the panels of page one slam in ---------- */
    let heroChars = [];
    if (window.SplitType) {
        heroChars = new SplitType('.hero-name .split', { types: 'chars' }).chars || [];
        new SplitType('.hero-title', { types: 'words, chars' });
    }
    const heroPanels = gsap.utils.toArray('.manga-page .panel');
    const heroSet = () => {
        gsap.set(heroPanels, { autoAlpha: 0, scale: 1.25, rotate: i => [-4, 5, -6, 4][i] });
        gsap.set(heroChars.length ? heroChars : '.hero-name .split', { yPercent: 120, rotate: 10 });
        gsap.set(['.p-title .eyebrow', '.katakana', '.hero-description', '.hero-actions', '.p-title .socials', '.hero-bottom'], { autoAlpha: 0, y: 30 });
        gsap.set('.hero-title', { autoAlpha: 0, x: -40 });
        gsap.set(['.bubble-hero', '.sfx-don', '.sfx-menace'], { autoAlpha: 0, scale: 0 });
        gsap.set('.power-list li', { autoAlpha: 0, x: -20 });
        gsap.set('.sun', { scale: 0 });
    };
    const heroPlay = () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.to(heroPanels, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.7, stagger: 0.14, ease: 'back.out(1.7)' }, 0)
          .add(() => flash(0.5), 0.05)
          .to('.manga-page', { keyframes: { x: [-9, 8, -6, 4, -2, 0] }, duration: 0.45, ease: 'none' }, 0.1)
          .to('.sun', { scale: 1, duration: 1.2, ease: 'elastic.out(1, 0.5)' }, 0.35)
          .to(heroChars.length ? heroChars : '.hero-name .split', { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.04 }, 0.3)
          .to('.p-title .eyebrow', { autoAlpha: 1, y: 0, duration: 0.9 }, 0.4)
          .to('.katakana', { autoAlpha: 1, y: 0, duration: 1 }, 0.75)
          .to('.hero-title', { autoAlpha: 1, x: 0, duration: 0.8 }, 0.85)
          .from('.hero-title .char', { autoAlpha: 0, duration: 0.01, stagger: 0.04, ease: 'none' }, 0.95)
          .to(['.hero-description', '.hero-actions', '.p-title .socials', '.hero-bottom'], { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1 }, 1)
          .to('.bubble-hero', { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'back.out(2.5)' }, 0.9)
          .to('.sfx-don', { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(3)' }, 1.1)
          .add(() => flash(0.35), 1.1)
          .to('.sfx-menace', { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.4)' }, 1.3)
          .to('.power-list li', { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.07 }, 1.1);
        return tl;
    };
    heroSet();

    /* ---------- Opening sequence (once per session, skippable) ---------- */
    let seen = false;
    try { seen = sessionStorage.getItem('mz-intro') === '1'; } catch (e) { /* storage unavailable */ }
    if (intro && !seen) {
        intro.hidden = false;
        intro.style.animation = 'none'; // JS owns the intro now; cancel the CSS failsafe
        lenis && lenis.stop();
        const counter = intro.querySelector('#intro-count');
        const count = { v: 0 };
        const tl = gsap.timeline({ onComplete: finish });
        tl.from('.ip1', { xPercent: -130, rotate: -8, duration: 0.6, ease: 'back.out(1.6)' }, 0.1)
          .from('.ip2', { scale: 2.4, autoAlpha: 0, duration: 0.5, ease: 'expo.out' }, 0.55)
          .to('.intro-stage', { keyframes: { x: [-12, 10, -7, 5, -2, 0] }, duration: 0.4, ease: 'none' }, 0.6)
          .from('.ip3', { xPercent: 130, rotate: 8, duration: 0.6, ease: 'back.out(1.6)' }, 0.9)
          .to(count, { v: 100, duration: 2, ease: 'power2.inOut', onUpdate: () => { counter.textContent = String(Math.round(count.v)).padStart(3, '0'); } }, 0)
          .to('.intro-sun', { scale: 1, duration: 0.7, ease: 'expo.in' }, 2.1)
          .to(intro, { autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, 2.8);
        const onKey = e => { if (e.key === 'Escape') finish(); };
        function finish() {
            if (intro.hidden) return;
            removeEventListener('keydown', onKey);
            tl.kill();
            dismissIntro();
            try { sessionStorage.setItem('mz-intro', '1'); } catch (e) { /* ignore */ }
            lenis && lenis.start();
            heroPlay();
        }
        intro.querySelector('#intro-skip').addEventListener('click', finish);
        addEventListener('keydown', onKey);
    } else {
        dismissIntro();
        heroPlay();
    }

    /* ---------- Hero depth: panels drift apart as the page turns ---------- */
    gsap.matchMedia().add('(min-width: 961px)', () => { // stacked mobile panels would drift into the next block
        gsap.utils.toArray('[data-depth]').forEach(panel => {
            gsap.to(panel, {
                y: () => innerHeight * parseFloat(panel.dataset.depth), ease: 'none',
                scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
            });
        });
    });
    gsap.to('.p-portrait .portrait-img', {
        scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    if (finePointer) {
        const ix = gsap.quickTo('.p-portrait .portrait-img', 'x', { duration: 1, ease: 'power3' });
        const iy = gsap.quickTo('.p-portrait .portrait-img', 'y', { duration: 1, ease: 'power3' });
        const sx = gsap.quickTo('.sun', 'x', { duration: 1.2, ease: 'power3' });
        const sy = gsap.quickTo('.sun', 'y', { duration: 1.2, ease: 'power3' });
        addEventListener('pointermove', e => {
            const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
            ix(nx * -18); iy(ny * -12); sx(nx * 26); sy(ny * 20);
        }, { passive: true });
    }

    /* ---------- Tapes run faster with scroll velocity ---------- */
    const loops = [];
    document.querySelectorAll('.marquee').forEach(m => {
        const tracks = m.querySelectorAll('.marquee-track');
        tracks.forEach(t => { t.style.animation = 'none'; });
        loops.push(m.classList.contains('reverse')
            ? gsap.fromTo(tracks, { xPercent: -100 }, { xPercent: 0, ease: 'none', duration: 30, repeat: -1 })
            : gsap.to(tracks, { xPercent: -100, ease: 'none', duration: 34, repeat: -1 }));
    });

    /* ---------- Scroll speed: wind, speed lines, cards lean, tapes accelerate ---------- */
    const skewSet = gsap.quickTo(gsap.utils.toArray('.timeline-item, .highlights div, .learning'), 'skewY', { duration: 0.5, ease: 'power3' });
    let settle;
    ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: self => {
            const v = self.getVelocity();
            sky.wind = gsap.utils.clamp(-14, 14, v / 160);
            skewSet(gsap.utils.clamp(-5, 5, v / -400));
            const boost = 1 + Math.min(6, Math.abs(v) / 300);
            loops.forEach(l => gsap.to(l, { timeScale: boost, duration: 0.2, overwrite: true }));
            clearTimeout(settle);
            settle = setTimeout(() => {
                skewSet(0);
                loops.forEach(l => gsap.to(l, { timeScale: 1, duration: 1 }));
            }, 140);
        }
    });

    /* ---------- Chapter titles: word-by-word curtain reveal ---------- */
    // Custom splitter so the red accent words move as one piece and keep their ink shadow.
    function splitWords(el) {
        const wrap = node => {
            const outer = document.createElement('span');
            outer.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'wi';
            inner.appendChild(node);
            outer.appendChild(inner);
            return outer;
        };
        [...el.childNodes].forEach(node => {
            if (node.nodeType === 3) {
                const frag = document.createDocumentFragment();
                node.textContent.split(/(\s+)/).forEach(part => {
                    if (!part) return;
                    frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(part) : wrap(document.createTextNode(part)));
                });
                node.replaceWith(frag);
            } else if (node.nodeType === 1 && node.tagName !== 'BR') {
                const placeholder = document.createComment('');
                node.replaceWith(placeholder);
                placeholder.replaceWith(wrap(node));
            }
        });
        return el.querySelectorAll('.wi');
    }
    gsap.utils.toArray('.split-title').forEach(title => {
        gsap.from(splitWords(title), {
            yPercent: 120, rotate: 8, duration: 1, ease: 'back.out(1.6)', stagger: 0.07,
            scrollTrigger: { trigger: title, start: 'top 85%', once: true }
        });
    });

    /* ---------- Chapter openings: scrambled subtitle, brush slash, impact frame ---------- */
    const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01<>/{}#';
    function scramble(el) {
        const final = el.textContent;
        const state = { p: 0 };
        el.setAttribute('aria-label', final.trim());
        gsap.to(state, {
            p: 1, duration: 1, ease: 'power2.out',
            onUpdate: () => {
                const n = Math.floor(final.length * state.p);
                let out = final.slice(0, n);
                for (let i = n; i < final.length; i++) out += final[i] === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0];
                el.textContent = out;
            },
            onComplete: () => { el.textContent = final; el.removeAttribute('aria-label'); }
        });
    }
    document.querySelectorAll('.section .section-heading').forEach(heading => {
        const eyebrow = heading.querySelector('.eyebrow');
        let label = null;
        if (eyebrow) { // wrap the plain subtitle text so it can be scrambled without touching the badges
            const text = [...eyebrow.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
            if (text) {
                label = document.createElement('span');
                label.textContent = text.textContent;
                text.replaceWith(label);
            }
        }
        const slash = document.createElement('span');
        slash.className = 'slash';
        slash.setAttribute('aria-hidden', 'true');
        (heading.querySelector('.split-title') || heading.firstElementChild).after(slash);
        gsap.set(slash, { scaleX: 0 });
        ScrollTrigger.create({
            trigger: heading, start: 'top 80%', once: true,
            onEnter: () => {
                if (label) scramble(label);
                gsap.to(slash, { scaleX: 1, duration: 0.45, ease: 'expo.out', delay: 0.3 });
                gsap.delayedCall(0.3, () => flash(0.45));
            }
        });
    });

    /* ---------- Generic reveals ---------- */
    gsap.set('.reveal', { autoAlpha: 0, y: 40 });
    ScrollTrigger.batch('.reveal', {
        start: 'top 88%', once: true,
        onEnter: batch => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'back.out(1.4)', stagger: 0.08, overwrite: 'auto' })
    });

    /* ---------- Giant chapter kanji drift at their own depth ---------- */
    gsap.utils.toArray('.bg-kanji').forEach(k => {
        gsap.fromTo(k, { yPercent: -15 }, {
            yPercent: 25, ease: 'none',
            scrollTrigger: { trigger: k.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
        });
    });

    /* ---------- About: panel wipe, camera push, counters, dialogue ---------- */
    gsap.fromTo('.portrait-frame', { clipPath: 'inset(0% 100% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut',
        scrollTrigger: { trigger: '.portrait-frame', start: 'top 80%', once: true }
    });
    gsap.fromTo('.portrait-frame img', { scale: 1.75 }, {
        scale: 1.45, ease: 'none',
        scrollTrigger: { trigger: '.portrait-frame', start: 'top bottom', end: 'bottom top', scrub: true }
    });
    gsap.from('.portrait-kanji', {
        autoAlpha: 0, y: -60, duration: 0.8, ease: 'back.out(2)', delay: 0.9,
        scrollTrigger: { trigger: '.portrait-frame', start: 'top 80%', once: true }
    });
    document.querySelectorAll('.count').forEach(el => {
        const n = { v: 0 }, to = Number(el.dataset.to), pad = Number(el.dataset.pad || 0);
        gsap.to(n, {
            v: to, duration: 1.6, ease: 'power2.out',
            onUpdate: () => { el.textContent = String(Math.round(n.v)).padStart(pad, '0'); },
            scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        });
    });
    const dialogue = document.querySelector('.dialogue-text');
    if (dialogue && window.SplitType) {
        gsap.from(new SplitType(dialogue, { types: 'words, chars' }).chars, {
            autoAlpha: 0, duration: 0.01, stagger: 0.028, ease: 'none',
            scrollTrigger: { trigger: '.dialogue', start: 'top 85%', once: true }
        });
    }

    /* ---------- Skills: the ability deck is dealt and each card unlocks ---------- */
    const cards = gsap.utils.toArray('.skill-group');
    const deck = gsap.timeline({ scrollTrigger: { trigger: '.skills-grid', start: 'top 80%', once: true } });
    deck.from(cards, { y: 160, rotateX: -50, rotateZ: i => (i - 2) * 6, scale: 0.8, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.13 });
    cards.forEach((card, i) => {
        const stamp = document.createElement('span');
        stamp.className = 'unlock-stamp';
        stamp.setAttribute('aria-hidden', 'true');
        stamp.textContent = 'Unlocked!';
        card.appendChild(stamp);
        const at = 0.5 + i * 0.13;
        deck.call(() => card.classList.add('unlocked'), null, at)
            .from(card.querySelectorAll('.chips span'), { scale: 0, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'back.out(2.5)' }, at)
            .fromTo(stamp, { autoAlpha: 0, scale: 2.6, rotate: -25 }, { autoAlpha: 1, scale: 1, rotate: -8, duration: 0.4, ease: 'back.out(3)' }, at + 0.2)
            .to(stamp, { autoAlpha: 0, y: -12, duration: 0.5, ease: 'power2.in' }, at + 1.8);
    });
    deck.from('.orbit', { scale: 0, rotate: -180, duration: 1.4, ease: 'expo.out' }, 0.5)
        .from('.phone', { y: 60, rotate: -20, autoAlpha: 0, duration: 1.1, ease: 'back.out(1.8)' }, 0.7)
        .from('.browser', { scaleY: 0, transformOrigin: 'top', duration: 0.7, ease: 'expo.out' }, 0.6);

    /* ---------- 3D tilt with moving screentone, magnetic buttons ---------- */
    if (finePointer) {
        document.querySelectorAll('.tilt').forEach(card => {
            const rx = gsap.quickTo(card, 'rotateX', { duration: 0.6, ease: 'power3' });
            const ry = gsap.quickTo(card, 'rotateY', { duration: 0.6, ease: 'power3' });
            card.addEventListener('pointermove', e => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
                rx((0.5 - py) * 10); ry((px - 0.5) * 12);
                card.style.setProperty('--mx', `${px * 100}%`);
                card.style.setProperty('--my', `${py * 100}%`);
            });
            card.addEventListener('pointerleave', () => { rx(0); ry(0); });
        });
        document.querySelectorAll('.magnetic').forEach(btn => {
            const mx = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
            const my = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
            btn.addEventListener('pointermove', e => {
                const r = btn.getBoundingClientRect();
                mx((e.clientX - r.left - r.width / 2) * 0.25);
                my((e.clientY - r.top - r.height / 2) * 0.35);
            });
            btn.addEventListener('pointerleave', () => { mx(0); my(0); });
        });
    }

    /* ---------- Projects: pinned horizontal reel of panels on wide screens ---------- */
    const mm = gsap.matchMedia();
    const section = document.querySelector('.projects-section');
    const pin = document.querySelector('.projects-pin');
    const track = document.querySelector('.projects-track');
    mm.add('(min-width: 1024px) and (min-height: 620px)', () => {
        section.classList.add('is-horizontal');
        const distance = () => track.scrollWidth - innerWidth;
        const tween = gsap.to(track, {
            x: () => -distance(), ease: 'none',
            scrollTrigger: {
                trigger: pin, pin: true, scrub: 1, start: 'top top',
                end: () => '+=' + distance(), invalidateOnRefresh: true, anticipatePin: 1
            }
        });
        gsap.utils.toArray('.project').forEach(card => {
            gsap.from(card.querySelector('.project-visual img'), {
                xPercent: -10, scale: 1.2, ease: 'none',
                scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
            });
            gsap.from(card.querySelector('.project-number'), {
                scale: 0, rotate: -40, ease: 'back.out(3)', duration: 0.6,
                scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 75%', toggleActions: 'play none none reverse' }
            });
            gsap.from(card, {
                rotate: 3, y: 40, ease: 'none',
                scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'left 40%', scrub: true }
            });
        });
        // Keep keyboard users oriented: focusing a link in an off-screen panel scrolls the reel to it.
        const onFocus = e => {
            const card = e.target.closest('.project');
            if (!card) return;
            pin.scrollLeft = 0;
            const st = tween.scrollTrigger;
            const progress = gsap.utils.clamp(0, 1, (card.offsetLeft - innerWidth * 0.1) / distance());
            const y = st.start + (st.end - st.start) * progress;
            lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y);
        };
        track.addEventListener('focusin', onFocus);
        return () => {
            section.classList.remove('is-horizontal');
            track.removeEventListener('focusin', onFocus);
        };
    });
    mm.add('(max-width: 1023px), (max-height: 619px)', () => {
        gsap.utils.toArray('.project').forEach((card, i) => {
            gsap.from(card, {
                y: 80, rotate: i % 2 ? 3 : -3, autoAlpha: 0, duration: 1, ease: 'back.out(1.4)',
                scrollTrigger: { trigger: card, start: 'top 88%', once: true }
            });
        });
    });

    /* ---------- Journey: red line inks itself down the timeline ---------- */
    gsap.fromTo('.timeline-beam', { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 60%', scrub: true }
    });
    gsap.utils.toArray('.timeline-item').forEach((item, i) => {
        gsap.from(item, {
            x: 80, rotate: i % 2 ? 2 : -2, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.5)',
            scrollTrigger: { trigger: item, start: 'top 85%', once: true }
        });
    });

    /* ---------- Finale ---------- */
    gsap.from('.form-bubble', {
        scale: 0, rotate: -30, duration: 0.7, ease: 'back.out(3)',
        scrollTrigger: { trigger: '.form-panel', start: 'top 80%', once: true }
    });
    gsap.from('.tbc', {
        xPercent: -140, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: '.tbc', start: 'top 95%', once: true }
    });
    gsap.from('.credits p', {
        y: 60, autoAlpha: 0, duration: 1, stagger: 0.12, ease: 'back.out(1.6)',
        scrollTrigger: { trigger: '.credits', start: 'top 90%', once: true }
    });

    /* ---------- Navbar hides when diving down, returns when scrolling up ---------- */
    const navbar = document.querySelector('#navbar');
    ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: self => {
            const menuOpen = document.querySelector('#mobile-menu-btn')?.getAttribute('aria-expanded') === 'true';
            const hide = self.direction === 1 && self.scroll() > 500 && !menuOpen && !navbar.contains(document.activeElement);
            navbar.classList.toggle('hide', hide);
        }
    });
})();
