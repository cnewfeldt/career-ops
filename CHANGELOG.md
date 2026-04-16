# Changelog

## [1.5.0](https://github.com/cnewfeldt/career-ops/compare/v1.4.0...v1.5.0) (2026-04-16)


### Features

* add --min-score flag to batch runner ([#249](https://github.com/cnewfeldt/career-ops/issues/249)) ([cb0c7f7](https://github.com/cnewfeldt/career-ops/commit/cb0c7f7d7d3b9f3f1c3dc75ccac0a08d2737c01e))
* add careers page fallback checker for expired ATS URLs ([45486ec](https://github.com/cnewfeldt/career-ops/commit/45486ecc4620c34b078de77f748f89cfaf6caf30))
* **dashboard:** add manual refresh shortcut ([#246](https://github.com/cnewfeldt/career-ops/issues/246)) ([4b5093a](https://github.com/cnewfeldt/career-ops/commit/4b5093a8ef1733c449ec0821f722f996625fcb84))


### Bug Fixes

* add stopword filtering and overlap ratio to roleMatch ([#248](https://github.com/cnewfeldt/career-ops/issues/248)) ([4da772d](https://github.com/cnewfeldt/career-ops/commit/4da772d3a4996bc9ecbe2d384d1e9d2ed75b9819))
* ensure data/ and output/ dirs exist before writing in scripts ([#261](https://github.com/cnewfeldt/career-ops/issues/261)) ([4b834f6](https://github.com/cnewfeldt/career-ops/commit/4b834f6f7f8f1b647a6bf76e43b017dcbe9cd52f))

## [1.1.0] -- 2026-04-16

### Features
- Add `combine-pdf.mjs`: merge tailored cover letter + CV into a single PDF for application upload systems that only accept one file. Uses `pdfunite` (poppler) under the hood. Convention: cover letter first, CV second.

### Docs
- Gitignore `data/*.png` so personal signature images are excluded from system-layer commits (signatures live in `data/` and are embedded as base64 in generated cover letter HTML).

## [1.0.2] -- 2026-04-13

### Features
- Add `check-fallback.mjs`: when ATS URLs (Lever/Greenhouse/Ashby) return 404, checks the company's own careers page from portals.yml for the same role under a different URL
- Integrate fallback checker as pipeline step 2b (runs after liveness gate, before marking as closed)

### Upstream Sync
- Merged upstream santifer/career-ops v1.4.0 (49 commits): dashboard progress analytics, vim motions, Catppuccin theme, batch --min-score flag, role matching improvements, CI/CD automations

## [1.0.1] -- 2026-04-08 (fork)

### Pipeline
- Add pre-pipeline liveness gate: `check-liveness.mjs` now runs on all pending URLs before evaluation subagents are dispatched, preventing wasted work on closed postings
- Document Playwright constraint: browser tools are main-session only, subagents use WebFetch/WebSearch
- Update JD extraction priority order to reflect subagent capabilities

### Data Protection
- Add personal data files to .gitignore: cv.md, article-digest.md, story-bank.md, merged tracker additions

## [1.0.0] -- Initial fork

- Forked from santifer/career-ops v1.2.0
- Configured for learning design, instructional design, XR/immersive, and customer education roles

## [1.4.0](https://github.com/santifer/career-ops/compare/v1.3.0...v1.4.0) (2026-04-13)


### Features

* add GitHub Actions CI + auto-labeler + welcome bot + /run skill ([2ddf22a](https://github.com/santifer/career-ops/commit/2ddf22a6a2731b38bcaed5786c4855c4ab9fe722))
* **dashboard:** add Catppuccin Latte light theme with auto-detection ([ff686c8](https://github.com/santifer/career-ops/commit/ff686c8af97a7bf93565fe8eeac677f998cc9ece))
* **dashboard:** add progress analytics screen ([623c837](https://github.com/santifer/career-ops/commit/623c837bf3155fd5b7413554240071d40585dd7e))
* **dashboard:** add vim motions to pipeline screen ([#262](https://github.com/santifer/career-ops/issues/262)) ([d149e54](https://github.com/santifer/career-ops/commit/d149e541402db0c88161a71c73899cd1836a1b2d))
* **dashboard:** aligned tables and markdown syntax rendering in viewer ([dbd1d3f](https://github.com/santifer/career-ops/commit/dbd1d3f7177358d0384d6e661d1b0dfc1f60bd4e))


### Bug Fixes

* **ci:** use pull_request_target for labeler on fork PRs ([#260](https://github.com/santifer/career-ops/issues/260)) ([2ecf572](https://github.com/santifer/career-ops/commit/2ecf57206c2eb6e35e2a843d6b8365f7a04c53d6))
* correct _shared.md → _profile.md reference in CUSTOMIZATION.md (closes [#137](https://github.com/santifer/career-ops/issues/137)) ([a91e264](https://github.com/santifer/career-ops/commit/a91e264b6ea047a76d8c033aa564fe01b8f9c1d9))
* replace grep -P with POSIX-compatible grep in batch-runner.sh ([637b39e](https://github.com/santifer/career-ops/commit/637b39e383d1174c8287f42e9534e9e3cdfabb19))
* test-all.mjs scans only git-tracked files, avoids false positives ([47c9f98](https://github.com/santifer/career-ops/commit/47c9f984d8ddc70974f15c99b081667b73f1bb9a))
* use execFileSync to prevent shell injection in test-all.mjs ([c99d5a6](https://github.com/santifer/career-ops/commit/c99d5a6526f923b56c3790b79b0349f402fa00e2))
