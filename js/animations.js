'use strict';
// Native, one-time reveals; content remains visible without JavaScript.
(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const elements = [...document.querySelectorAll('.reveal')];
    if (motion.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.remove('is-pending');
            observer.unobserve(entry.target);
        }
    }, { threshold: 0.08 });
    for (const element of elements) {
        element.classList.add('is-pending');
        observer.observe(element);
    }
    motion.addEventListener('change', event => {
        if (!event.matches) return;
        observer.disconnect();
        elements.forEach(element => element.classList.remove('is-pending'));
    });
})();
