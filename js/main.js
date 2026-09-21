'use strict';
document.documentElement.classList.add('js');
const menuButton = document.querySelector('#mobile-menu-btn');
const mobileMenu = document.querySelector('#mobile-menu');
const navbar = document.querySelector('#navbar');
menuButton.hidden = false;
function closeMenu(returnFocus = false) {
    mobileMenu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    mobileMenu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
});
mobileMenu.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    closeMenu();
    const target = document.querySelector(link.hash);
    if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileMenu.hidden) closeMenu(true);
});
document.addEventListener('click', event => {
    if (!mobileMenu.hidden && !navbar.contains(event.target)) closeMenu();
});
navbar.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
        if (!navbar.contains(document.activeElement)) closeMenu();
    });
});
const desktop = matchMedia('(min-width: 761px)');
desktop.addEventListener('change', () => closeMenu());
const sections = [...document.querySelectorAll('main section[id]')];
const links = [...document.querySelectorAll('.nav-link, .nav-contact, .mobile-menu a')];
let scheduled = false;
function updateNavigation() {
    scheduled = false;
    navbar.classList.toggle('scrolled', scrollY > 30);
    let current = sections[0].id;
    for (const section of sections) {
        if (section.getBoundingClientRect().top <= 160) current = section.id;
    }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 5) current = 'contact';
    for (const link of links) {
        if (link.hash === '#' + current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
    }
}
window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateNavigation); }
}, { passive: true });
window.addEventListener('resize', () => {
    if (innerWidth > 760) closeMenu();
    updateNavigation();
});
updateNavigation();
document.querySelector('#year').textContent = new Date().getFullYear();

const form = document.querySelector('#contact-form');
const status = document.querySelector('#form-message');
const submit = form.querySelector('[type="submit"]');
for (const field of form.querySelectorAll('input, textarea')) {
    field.addEventListener('input', () => field.setCustomValidity(''));
}
form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    for (const field of form.querySelectorAll('[required]')) {
        field.setCustomValidity(field.value.trim() ? '' : 'Please fill out this field.');
    }
    if (!form.reportValidity()) return;
    const original = submit.innerHTML;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    submit.disabled = true;
    submit.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    status.dataset.state = 'loading';
    status.textContent = 'Sending your message…';
    try {
        const response = await fetch(form.action, {
            method: 'POST', body: new FormData(form),
            headers: { Accept: 'application/json' }, signal: controller.signal
        });
        if (!response.ok) throw new Error('Submission failed');
        status.dataset.state = 'success';
        status.textContent = 'Thank you! Your message was sent. I’ll get back to you soon.';
        form.reset();
    } catch (error) {
        status.dataset.state = 'error';
        status.textContent = error.name === 'AbortError'
            ? 'The request timed out. Please try again or email contact@mouadziyani.com.'
            : 'Your message could not be sent. Please try again or email contact@mouadziyani.com.';
    } finally {
        clearTimeout(timeout);
        submit.disabled = false;
        submit.innerHTML = original;
        form.removeAttribute('aria-busy');
    }
});
