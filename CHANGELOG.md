# Changelog

## [1.0.1] -- 2026-04-08

### Pipeline
- Add pre-pipeline liveness gate: `check-liveness.mjs` now runs on all pending URLs before evaluation subagents are dispatched, preventing wasted work on closed postings
- Document Playwright constraint: browser tools are main-session only, subagents use WebFetch/WebSearch
- Update JD extraction priority order to reflect subagent capabilities

### Data Protection
- Add personal data files to .gitignore: cv.md, article-digest.md, story-bank.md, merged tracker additions

## [1.0.0] -- Initial fork

- Forked from santifer/career-ops v1.2.0
- Configured for learning design, instructional design, XR/immersive, and customer education roles
