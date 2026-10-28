# Zhike Peng — Academic Homepage

An English academic homepage and curriculum vitae for Zhike Peng at Tsinghua University. Designed around paper tones, cobalt accents, editorial typography, and the original calligraphic mark. Includes responsive layouts, persistent light/dark appearance, publication links, BibTeX downloads, and a two-page English PDF CV.

## Preview and build

Requires Node.js 20 or newer. No package installation is needed.

```sh
npm run dev
# http://127.0.0.1:4321

npm run build
# Static output: public/
```

The preview serves the current build. After editing content or styles, run `npm run build` and reload the browser.

## Update content

- `data/profile.json` is the shared source for the homepage, web CV, citations, and PDF CV.
- `scripts/build.mjs` renders complete HTML, so content and navigation work without JavaScript.
- `static/css/site.css` contains the responsive visual system and print styles.
- `static/js/site.js` adds theme switching, mobile-menu conveniences, and citation copying.
- `static/images/personal-mark.jpg` preserves the original profile mark.

To regenerate the PDF after editing the shared content, run Python with ReportLab installed:

```sh
python3 scripts/generate_cv.py
npm run build
```

The result is `static/uploads/resume.pdf`; its original URL remains stable. The web CV is at `/cv/`. Publication citations are generated at `/citations/`.

The October 2026 update lists *Uniform-Price Mechanism Design for Automated Market Makers* as accepted at IJTCS-FAW 2026, with its [arXiv full version](https://arxiv.org/abs/2610.23547). The ScenePhotographer author list, DOI, and oral status follow the [authors' project repository](https://github.com/Shao-Kui/3DScenePlatform).

## Publish

The existing GitHub Pages workflow builds and deploys `public/` on pushes to `main`. `netlify.toml` supports the same static build if needed. The PDF is checked into the repository, so publishing needs only Node.js.

The previous Hugo Blox sources remain in `content/`, `layouts/`, `config/`, and `assets/` for reference; the new build does not use them. Old `/blog/`, `/uses/`, and `/authors/admin/` routes point visitors to the homepage. Template demo posts are not included in the published site. The original Chinese CV in the separate CV folder is unchanged.
