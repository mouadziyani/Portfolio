'use strict';
// Manga sound layer: every sound is synthesized live with the Web Audio API, so there are no
// audio files to load. Browsers only allow audio after a user gesture, so nothing plays until
// the reader clicks, taps or presses a key. The choice is remembered in localStorage.
(() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    const toggle = document.querySelector('#sound-toggle');
    if (!AC) return; // callers use window.mzSound?.play(), so they stay silent

    let enabled = true;
    try { enabled = localStorage.getItem('mz-sound') !== 'off'; } catch (e) { /* storage unavailable */ }
    let ctx = null, master = null, noiseBuffer = null;

    function unlock() {
        if (!ctx) {
            ctx = new AC();
            const comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -14;
            comp.ratio.value = 4;
            master = ctx.createGain();
            master.gain.value = 0.5;
            master.connect(comp).connect(ctx.destination);
            noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') ctx.resume();
    }

    /* ---------- Building blocks ---------- */
    // A pitched voice with a sharp attack and an exponential decay.
    function tone({ type = 'sine', from, to = from, at = 0, dur = 0.2, vol = 0.3 }) {
        const t = ctx.currentTime + at;
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(from, t);
        if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }
    // Filtered noise: drum skins, swishes, paper and wind.
    function noise({ type = 'bandpass', from = 1000, to = from, q = 1, at = 0, dur = 0.2, vol = 0.3, attack = 0.005 }) {
        const t = ctx.currentTime + at;
        const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
        src.buffer = noiseBuffer;
        src.loop = true;
        filter.type = type;
        filter.Q.value = q;
        filter.frequency.setValueAtTime(from, t);
        if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(vol, t + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filter).connect(gain).connect(master);
        src.start(t, Math.random() * 0.5);
        src.stop(t + dur + 0.05);
    }

    // A plucked string (koto / shamisen): bright sawtooth whose filter closes quickly.
    function pluck({ from, at = 0, dur = 0.8, vol = 0.22 }) {
        const t = ctx.currentTime + at;
        const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(from, t);
        filter.type = 'lowpass';
        filter.Q.value = 2;
        filter.frequency.setValueAtTime(from * 8, t);
        filter.frequency.exponentialRampToValueAtTime(from, t + dur * 0.5);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(vol, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(filter).connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }
    // Inharmonic partials ring like struck metal: blades, anvils, bells.
    function metal(from, { at = 0, dur = 0.6, vol = 0.06, ratios = [1, 2.76, 5.4, 8.93] } = {}) {
        ratios.forEach((r, i) => tone({ from: from * r, at, dur: dur / (1 + i * 0.5), vol: vol / (1 + i * 0.6) }));
    }
    const vary = () => 0.92 + Math.random() * 0.16; // small pitch drift so repeats never sound copy-pasted

    // In-sen scale (D Eb G A C): the classic Japanese pentatonic colour.
    const inSen = [293.66, 311.13, 392, 440, 523.25, 587.33, 622.25, 783.99, 880, 1046.5, 1174.66];
    const pick = list => list[(Math.random() * list.length) | 0];

    /* ---------- Clicks: every chapter has its own set of three sounds, played in turn ---------- */
    const clickSets = {
        home: [ // Prologue — a fight scene
            () => { const p = vary(); // punch
                tone({ from: 180 * p, to: 50, dur: 0.16, vol: 0.55 });
                noise({ type: 'lowpass', from: 3000, to: 300, dur: 0.08, vol: 0.4 }); },
            () => { // katana slash: swish then the blade rings
                noise({ type: 'highpass', from: 2000, to: 9000, dur: 0.18, vol: 0.25, attack: 0.04 });
                metal(1800 * vary(), { at: 0.05, dur: 0.5, vol: 0.05 }); },
            () => { const p = vary(); // taiko
                tone({ from: 160 * p, to: 45, dur: 0.4, vol: 0.6 });
                tone({ type: 'triangle', from: 320 * p, to: 100, dur: 0.1, vol: 0.2 });
                noise({ type: 'lowpass', from: 1600, to: 200, dur: 0.14, vol: 0.3 }); }
        ],
        about: [ // Ch. 01 — the story is told in speech bubbles
            () => { const f = pick(inSen.slice(5)); // RPG dialogue blips
                tone({ type: 'square', from: f, dur: 0.05, vol: 0.06 });
                tone({ type: 'square', from: f * 1.335, at: 0.065, dur: 0.05, vol: 0.06 }); },
            () => { // page flip
                noise({ type: 'highpass', from: 1500, to: 4500, dur: 0.22, vol: 0.18, attack: 0.1 });
                noise({ from: 800, at: 0.15, dur: 0.08, vol: 0.12 }); },
            () => tone({ from: 300 * vary(), to: 1200, dur: 0.12, vol: 0.25 }) // speech bubble pop
        ],
        skills: [ // Ch. 02 — power-ups, arcade style
            () => { // coin
                tone({ type: 'square', from: 988, dur: 0.07, vol: 0.06 });
                tone({ type: 'square', from: 1319, at: 0.07, dur: 0.25, vol: 0.06 }); },
            () => [5, 7, 9].forEach((n, i) => tone({ type: 'square', from: inSen[n] * vary(), at: i * 0.045, dur: 0.09, vol: 0.05 })), // level up
            () => tone({ type: 'sawtooth', from: 1600 * vary(), to: 120, dur: 0.18, vol: 0.07 }) // ki blast zap
        ],
        projects: [ // Ch. 03 — the workshop
            () => { // mechanical keyboard clack
                noise({ type: 'highpass', from: 3000, dur: 0.03, vol: 0.3 });
                tone({ type: 'triangle', from: 1200 * vary(), to: 800, dur: 0.03, vol: 0.1 });
                noise({ from: 400, at: 0.02, dur: 0.04, vol: 0.2 }); },
            () => { // robot beep-boop
                tone({ type: 'square', from: 880 * vary(), dur: 0.06, vol: 0.05 });
                tone({ type: 'square', from: 523.25, at: 0.08, dur: 0.08, vol: 0.05 }); },
            () => { // hammer on the anvil
                noise({ type: 'lowpass', from: 2000, to: 400, dur: 0.05, vol: 0.3 });
                metal(900 * vary(), { dur: 0.7, vol: 0.07 }); }
        ],
        experience: [ // Ch. 04 — the journey through time
            () => { // clock tick-tock
                tone({ type: 'triangle', from: 2000, dur: 0.03, vol: 0.12 });
                tone({ type: 'triangle', from: 1500, at: 0.16, dur: 0.03, vol: 0.1 }); },
            () => { // footstep on the road
                noise({ type: 'lowpass', from: 450, to: 120, dur: 0.12, vol: 0.45 });
                tone({ from: 90 * vary(), to: 50, dur: 0.1, vol: 0.3 }); },
            () => pluck({ from: pick(inSen.slice(0, 8)) }) // koto string
        ],
        contact: [ // Final — sending the message
            () => metal(1318 * vary(), { dur: 1, vol: 0.06, ratios: [1, 2, 3.01, 4.2] }), // wind-chime bell
            () => { // paper plane takes off
                tone({ from: 600, to: 1800 * vary(), dur: 0.2, vol: 0.12 });
                noise({ from: 1500, to: 5000, dur: 0.2, vol: 0.08, attack: 0.08 }); },
            () => tone({ from: 500 * vary(), to: 1500, dur: 0.07, vol: 0.25 }) // water drop
        ]
    };
    const clickTurns = {};
    function sectionOf(target) {
        const own = target.closest('main section[id]');
        if (own && clickSets[own.id]) return own.id;
        if (target.closest('.footer')) return 'contact';
        const current = document.querySelector('.nav-links [aria-current]'); // navbar clicks use the chapter being read
        return current && clickSets[current.hash.slice(1)] ? current.hash.slice(1) : 'home';
    }

    // Typing: a soft key clack under every character, then a voice that depends on what was typed.
    const clack = (vol = 0.16) => {
        noise({ type: 'highpass', from: 3000, dur: 0.025, vol });
        noise({ from: 500, at: 0.01, dur: 0.03, vol: vol * 0.7 });
    };
    const keyVoices = {
        letter(ch) { // letters play the in-sen scale, so writing a message sounds like a melody
            const note = inSen[3 + (ch.toLowerCase().codePointAt(0) % 8)];
            clack();
            tone({ type: 'triangle', from: ch !== ch.toLowerCase() ? note * 2 : note, dur: 0.16, vol: 0.045 });
        },
        digit(ch) { // numbers count up like an arcade score
            clack(0.12);
            tone({ type: 'square', from: 600 + (ch.codePointAt(0) % 10) * 70, dur: 0.05, vol: 0.04 }); // also safe for non-Latin digits
        },
        space() { // the big thock of the space bar
            noise({ type: 'lowpass', from: 600, to: 150, dur: 0.06, vol: 0.25 });
            tone({ from: 120, to: 70, dur: 0.06, vol: 0.15 });
        },
        symbol() { // punctuation rings like a tiny brush tapping the inkstone
            clack(0.12);
            metal(2400 * vary(), { dur: 0.15, vol: 0.03 });
        },
        delete() { // backspace sucks the ink back in
            clack(0.1);
            tone({ type: 'sawtooth', from: 900, to: 200, dur: 0.08, vol: 0.045 });
        },
        enter() { // typewriter carriage return and bell
            noise({ from: 800, to: 2500, q: 2, dur: 0.18, vol: 0.12, attack: 0.1 });
            metal(2093, { at: 0.12, dur: 0.6, vol: 0.06, ratios: [1, 2.4, 4.1] });
        },
        paste() {
            noise({ from: 300, to: 3200, q: 1.4, dur: 0.3, vol: 0.2, attack: 0.15 });
            tone({ from: 400, to: 1200, at: 0.2, dur: 0.1, vol: 0.2 });
        }
    };

    const sounds = {
        key(kind, ch) { keyVoices[kind](ch); },
        click(target) {
            const id = sectionOf(target), set = clickSets[id];
            const turn = clickTurns[id] = ((clickTurns[id] ?? -1) + 1) % set.length;
            set[turn]();
        },
        tick() { // hover: tiny pen tap
            tone({ type: 'triangle', from: 1900 + Math.random() * 300, dur: 0.035, vol: 0.05 });
        },
        whoosh() { // a panel flying past
            noise({ from: 300, to: 3200, q: 1.4, dur: 0.38, vol: 0.22, attack: 0.22 });
        },
        slam() { // taiko drum: deep body plus skin slap
            tone({ from: 140, to: 42, dur: 0.55, vol: 0.75 });
            tone({ type: 'triangle', from: 300, to: 90, dur: 0.12, vol: 0.25 });
            noise({ type: 'lowpass', from: 1800, to: 200, dur: 0.18, vol: 0.4 });
        },
        don() { // ドン! the big dramatic hit
            sounds.slam();
            tone({ from: 90, to: 30, dur: 0.9, vol: 0.5 });
            noise({ type: 'highpass', from: 5000, dur: 0.4, vol: 0.08 });
        },
        rise() { // tension builds as the red sun swells
            noise({ from: 200, to: 6000, q: 3, dur: 0.75, vol: 0.25, attack: 0.7 });
            tone({ type: 'sawtooth', from: 110, to: 880, dur: 0.75, vol: 0.04 });
        },
        gong() { // final strike with a long shimmering tail
            sounds.don();
            [196, 293.66, 392.9, 587.33, 783.99].forEach((f, i) => tone({ from: f, to: f * 0.995, dur: 2.4 - i * 0.3, vol: 0.16 / (i + 1) }));
        },
        start() { // press start: 8-bit power-up on the in-sen scale
            [0, 2, 3, 5, 7, 10].forEach((n, i) => tone({ type: 'square', from: inSen[n], at: i * 0.05, dur: 0.12, vol: 0.06 }));
        },
        note(i = 0) { // one step of a melody, e.g. skill cards unlocking in turn
            const f = inSen[5 + (i % 6)];
            tone({ type: 'triangle', from: f, dur: 0.45, vol: 0.12 });
            tone({ from: f * 2, dur: 0.3, vol: 0.03 });
        },
        chime() {
            [5, 7, 8, 10].forEach((n, i) => tone({ type: 'triangle', from: inSen[n], at: i * 0.06, dur: 0.35, vol: 0.12 }));
        },
        success() {
            [5, 8, 10].forEach((n, i) => tone({ type: 'triangle', from: inSen[n], at: i * 0.09, dur: 0.6, vol: 0.13 }));
            noise({ type: 'highpass', from: 6000, at: 0.18, dur: 0.5, vol: 0.05 });
        },
        error() {
            tone({ type: 'square', from: 220, to: 110, dur: 0.3, vol: 0.07 });
            tone({ type: 'square', from: 233, to: 116, at: 0.12, dur: 0.3, vol: 0.07 });
        }
    };

    function play(name, ...args) {
        if (!enabled || !ctx || ctx.state === 'closed' || document.hidden || !sounds[name]) return;
        sounds[name](...args);
    }

    function render() {
        if (!toggle) return;
        toggle.setAttribute('aria-pressed', String(enabled));
        toggle.querySelector('.sound-state').textContent = enabled ? 'ON' : 'OFF';
    }
    // Only call from a user gesture: turning sound on starts the audio engine.
    function set(on) {
        enabled = on;
        try { localStorage.setItem('mz-sound', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
        if (on) unlock();
        render();
    }

    /* ---------- Wake the audio engine on the first gesture ---------- */
    const wake = () => { if (enabled) unlock(); };
    ['pointerdown', 'keydown', 'touchend', 'click'].forEach(type => addEventListener(type, wake, { capture: true }));

    /* ---------- Clicks play the chapter's sound set, hovering taps the pen ---------- */
    addEventListener('pointerdown', e => {
        if (e.button > 0 || e.target.closest('input, textarea, select, #sound-toggle, .intro-gate')) return;
        play('click', e.target);
    });
    /* ---------- Contact form: every character typed has a voice ---------- */
    // The input event (not keydown) also works with phone keyboards, which report keys as "Unidentified".
    document.querySelector('#contact-form')?.addEventListener('input', e => {
        if (!e.target.matches('input, textarea')) return;
        const type = e.inputType || '';
        if (type.startsWith('delete')) return play('key', 'delete');
        if (type === 'insertLineBreak' || type === 'insertParagraph') return play('key', 'enter');
        if (type === 'insertFromPaste' || type === 'insertFromDrop' || (e.data && e.data.length > 1)) return play('key', 'paste');
        const ch = e.data;
        if (!ch) return;
        if (ch === '\n') play('key', 'enter');
        else if (/\s/.test(ch)) play('key', 'space');
        else if (/\p{N}/u.test(ch)) play('key', 'digit', ch);
        else if (/\p{L}/u.test(ch)) play('key', 'letter', ch);
        else play('key', 'symbol', ch);
    });

    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
        let last = null;
        document.addEventListener('pointerover', e => {
            const el = e.target.closest('a, button, .chips span, .power-list li');
            if (el && el !== last) play('tick');
            last = el;
        });
    }

    /* ---------- Navbar SFX toggle ---------- */
    if (toggle) {
        toggle.hidden = false;
        render();
        toggle.addEventListener('click', () => {
            set(!enabled);
            play('chime');
        });
    }

    window.mzSound = { play, set, get enabled() { return enabled; } };
})();
