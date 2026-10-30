# Mouad Ziyani — Portfolio

A static HTML, CSS and JavaScript portfolio designed as a shonen manga: paper white, ink black and one red accent, with comic panels, screentone, speech bubbles and SFX lettering. The hero is a full manga page; sections are chapters; project screenshots turn from black-and-white to colour on hover; the page ends with "To Be Continued" and end credits. Open `index.html` or serve this directory with any static web server. No build step is required.

## Files

- `index.html`: semantic sections, project content, contact form and SEO metadata.
- `css/style.css`: design tokens (paper, ink, red), manga panel primitives, responsive layouts, focus states and reduced-motion styles.
- `js/main.js`: accessible navigation, active sections and Formspree submission.
- `js/animations.js`: the motion layer — panel-slam intro, ink petals that react to the cursor and to scroll speed, speed lines when scrolling fast, click SFX bursts, scroll-driven animation, smooth scrolling, the skills "ability deck", scrambled chapter subtitles, katana slashes and impact frames, a visual-novel dialogue box, ink cursor, tilt and magnetic hover effects.
- `assets/mouad-ziyani-logo.png`: the original logo; `assets/mouad-ziyani-logo-web.png` is a smaller copy used on the page.
- `img/`: profile and project images; `img/mouad-pic.jpg` is a web-sized copy of the portrait.
- `resume/`: downloadable CV.

## Libraries (loaded from CDNs, pinned versions)

- [GSAP 3.12.5](https://gsap.com/) + ScrollTrigger — timelines, scroll reveals, pinned horizontal reel, parallax.
- [Lenis 1.1.13](https://github.com/darkroomengineering/lenis) — smooth scrolling synced to ScrollTrigger.
- [SplitType 0.3.4](https://github.com/lukePeavey/SplitType) — per-letter hero title animation.
- [Devicon 2.16.0](https://devicon.dev/) — technology logos for the skills and hero tags.
- Google Fonts: Dela Gothic One, Bangers, Space Grotesk, JetBrains Mono.

## Behaviour notes

- Everything animated is progressive enhancement. Without JavaScript, if the CDNs fail, or with `prefers-reduced-motion`, all content is visible and the page works normally.
- The intro plays once per browser session and can be skipped with the button or Escape.
- The horizontal project reel turns on at 1024px+ wide and 620px+ tall; smaller screens get a vertical list.
- The contact form posts to the existing Formspree endpoint with loading, success and error feedback.
