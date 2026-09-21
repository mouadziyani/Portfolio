# Mouad Ziyani — Portfolio

A static HTML, CSS and vanilla JavaScript portfolio with a matte black, platinum and bronze identity. Open `index.html` or serve this directory with any static web server. No build step is required.

## Files

- `index.html`: semantic sections, original project content, contact form and SEO metadata.
- `css/style.css`: responsive design tokens, layouts, focus states and reduced-motion styles.
- `js/main.js`: accessible navigation, active sections and real Formspree submission.
- `js/animations.js`: native IntersectionObserver reveals with reduced-motion support.
- `assets/mouad-ziyani-logo.png`: byte-for-byte copy of the supplied logo.
- `img/`: original profile and project images.
- `resume/`: downloadable CV.

The contact form posts to the existing Formspree endpoint. It displays loading, success and failure feedback, retains input on failure, and supports native submission without JavaScript. Font loading is optional; system sans-serif fallbacks keep the page usable offline. The obsolete runtime Tailwind CDN and animation/icon libraries have been removed in favor of the custom CSS and native browser features used by this design.

Project demo links are displayed only where a real demo URL exists. The original GitHub URLs, biography, education history and contact details are preserved.
