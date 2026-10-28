# Zhike Peng

A personal blog with a compact introduction, an article archive, and separate Research, About, and CV pages. The site intentionally has no published posts yet. The old Hugo sample is a draft and is never published.

## Preview

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
# http://127.0.0.1:4321
```

After edits, run `npm run build` and reload the browser. To preview drafts and future-dated articles, start with `npm run dev -- --drafts`. Drafts are always excluded from RSS and the sitemap.

## Write a post

```sh
npm run new-post -- my-first-post
```

This creates `content/blog/my-first-post/index.md` as a draft:

```yaml
---
title: "My first post"
date: 2026-10-28
description: "A short description for the article list and RSS."
tags: [Notes]
draft: true
---
```

Write the article below the frontmatter. Change `draft` to `false` when ready to publish. Use a real date in `YYYY-MM-DD` format; future-dated posts stay unpublished. The filename or folder name determines the URL (`/blog/my-first-post/`); an optional `slug` field can override it.

Standard Markdown, fenced code, tables, images, inline math (`$...$`), and display math (`$$` on separate lines) are supported. Put figures and attachments beside a post's `index.md` and use relative paths. Heading links are generated automatically. Tags get their own archive pages. Articles are sorted newest first.

The home page shows the latest eight articles. `/blog/` contains the complete archive, and `/index.xml` is the RSS feed. `/blog/index.xml` and the previous `/post/index.xml` feed URL also work. There is no publishing interface or database: commit the Markdown file to publish.

## Content and appearance

- `data/profile.json`: biography, publications, experience, and the shared CV data.
- `content/blog/`: article sources.
- `scripts/blog.mjs`: Markdown, frontmatter, date, and draft handling.
- `scripts/build.mjs`: page templates and static output.
- `static/css/site.css`: typography, spacing, reading styles, dark mode, and print layout.
- `static/js/site.js`: optional appearance switching and citation copying.
- `static/uploads/resume.pdf`: the two-page English CV, still available at its original URL.

To regenerate the PDF after changing profile data, run `python3 scripts/generate_cv.py` with ReportLab installed, then build the site. The IJTCS-FAW 2026 acceptance is retained in the Research page and both CV formats. The original Chinese CV in the separate CV folder is unchanged.

## Check and publish

```sh
npm test
npm run build
```

Output goes to `public/`. Each successful build replaces the generated directory, preventing deleted or newly private drafts from surviving in a previous output. A failed build retains the last successful output.

GitHub Pages installs the pinned dependencies, runs the blog checks, builds, and deploys on pushes to `main`. Netlify uses the same build. Both hosting configurations preserve the current domain and public audience.

The earlier Hugo Blox sources remain in `layouts/`, `config/`, and `assets/` for reference and are not used by this build. Old `/uses/` and `/authors/admin/` links lead to About. Previous homepage section links continue to resolve to their corresponding pages.
