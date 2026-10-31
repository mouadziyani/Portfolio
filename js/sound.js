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

    // In-sen scale (D Eb G A C): the classic Japanese pentatonic colour.
    const inSen = [293.66, 311.13, 392, 440, 523.25, 587.33, 622.25, 783.99, 880, 1046.5, 1174.66];

    const sounds = {
        pow() { // click: punchy ink impact, pitch shifts a little so repeated clicks feel alive
            const p = 0.85 + Math.random() * 0.3;
            tone({ from: 220 * p, to: 55, dur: 0.18, vol: 0.5 });
            noise({ from: 2400 * p, to: 600, q: 0.8, dur: 0.09, vol: 0.35 });
            tone({ type: 'square', from: 880 * p, to: 440 * p, dur: 0.05, vol: 0.05 });
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

    /* ---------- Clicks land with a POW, hovering taps the pen ---------- */
    addEventListener('pointerdown', e => {
        if (e.button > 0 || e.target.closest('input, textarea, select, #sound-toggle, .intro-gate')) return;
        play('pow');
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
