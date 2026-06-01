# Handoff: Generating CVs & Cover Letters (Meehae Song)

> **Read this first if you are a new model or a cleared-context session and Cary asks you to generate or fix a CV / cover letter.** It captures the exact settings, structure, toolchain, and rules that produce a correct result.
>
> This is a user reference doc; it is not part of the auto-update system. Last verified: 2026-05-29.

## 0. TL;DR — the one setting that controls everything

`config/profile.yml` → `cv.output_format: html`

Meehae's CVs go through the **HTML → PDF path** (`generate-pdf.mjs`, Chromium headless), using `templates/cv-template.html`. This is the format she wants.

**Do NOT use LaTeX.** The LaTeX path (`generate-latex.mjs` / tectonic) was tried and retired on 2026-05-29: tectonic uses XeTeX, which doesn't emit a `/ToUnicode` map and ignores `\pdfgentounicode`, so the PDFs rendered as garbled glyphs (a→l, e→T, "th"→"tfi") in PDF editors and on copy-paste. The Chromium HTML path embeds proper fonts with a ToUnicode map and renders correctly everywhere. If you see `.tex` files in `output/`, they are legacy — ignore them.

## 1. Source-of-truth files (read these before generating — never invent content)

| File | What it holds |
|------|---------------|
| `cv.md` | Canonical CV content (the full superset) |
| `article-digest.md` | Detailed proof points; **takes precedence over cv.md for metrics** |
| `config/profile.yml` | Contact info, comp targets, location policy, `cv.output_format` |
| `modes/_profile.md` | Archetypes, adaptive framing, signature move, red/green flags |

## 2. Candidate facts (stable — but verify against the files above)

- **Name:** Meehae Song → kebab-case `meehae-song`
- **Contact line (must include phone):** `+1-778-888-4168 | hello@meehaesong.com | linkedin.com/in/meehae-song | meehaesong.com | Cowichan Bay, BC`
- **PhD:** Doctoral candidate at SFU iVizLab, **expected 2026** (memory `project_phd_timeline`). Use "Doctoral Candidate (expected 2026)", NOT "ABD".
- **Teaching credential:** "Independent School Teaching Certificate — In Progress" (this is the canonical phrasing per `cv.md`; do not write "BC TRB Certificate of Qualification").
- **Comp targets:** CAD $120K–170K, floor $100K. Remote only, no relocation (Cowichan Bay, PT).
- **Two search tracks:** (a) ID/LXD/curriculum at tech + post-secondary; (b) Vancouver Island K-12 private school teaching.

## 3. The CV structure (9 sections)

Build the full structure — don't drop sections:

1. **Header** — name (Space Grotesk, large) + gradient rule + contact row **with phone**
2. **Professional Summary** — 4–5 lines, tailored, JD keywords woven in
3. **Core Competencies** — `competency-tag` chips (or a `|`-separated line), JD keyword zone
4. **Work / Professional Experience** — reordered by JD relevance
5. **Personal Projects** — top relevant VR/XR work
6. **Research & Artistic Output** — publications, installations, fellowship, peer review
7. **Education** — max inclusion: PhD, MEng, ICPNM (1999), **Vancouver Film School (1997)**, BSc
8. **Certifications & Awards** — Unity CI/UPA, University Teaching Cert, BICA, SSHRC, **Stevenson (sole recipient)**; + Independent School Teaching Certificate (In Progress) when relevant
9. **Technical Skills** — multi-category

**Canonical good examples** (this format, cleaned of non-truths):
- `output/cv-meehae-song-xr-terra-2026-05-29.html` (tech / Unity-instructor framing)
- `output/078-shawnigan-teaching-2026-05-25.html` (K-12 teaching framing)

## 4. Hard rules (violating any = "output incorrect")

1. **Max inclusion** of awards by default — Stevenson (sole recipient) and Vancouver Film School (1997) **must appear**. (memory `feedback_cv_tailoring_inclusion`)
2. **Never invent skills.** Only reword real experience in JD vocabulary. Specifically NOT in `cv.md` (do not claim unless Meehae confirms): named ID methodologies (ADDIE/SAM/Bloom's/Kirkpatrick), named LMS/authoring tools (Canvas/Moodle/Storyline/Captivate), version control/Git, programming languages (C#/Python), invented metrics (learner counts, %, NPS), **robotics**. See `MEEHAE-CLAIMS-REVIEW.md` and memories `feedback_no_unsupported_framework_claims`, `feedback_meehae_no_robotics`.
3. **Never name-drop the target company in the CV body.** Company name belongs in the cover letter only.
4. **Always write the editable `.md` companion** alongside the PDF, for both CV and cover. (memory `feedback_markdown_versions`)
5. **Don't silently cut/reframe content** — flag meaningful editorial choices to Cary. (memory `feedback_interactive_decisions`)
6. **Bundle ALL generated documents** into `output/{NNN}-{slug}-{date}.zip` for emailing to **meehae@gmail.com** — on the HTML path that is six files: CV `.pdf`+`.md`+`.html` and cover `.pdf`+`.md`+`.html`. (memory `feedback_application_zip`)

## 5. Toolchain & commands

**Renderer:** `generate-pdf.mjs` (uses Playwright / Chromium headless — confirmed installed). Self-hosted fonts live in `fonts/` (Space Grotesk + DM Sans `.woff2`). Reference them in the HTML as `url('./fonts/space-grotesk-latin.woff2')` etc. — `generate-pdf.mjs` rewrites `./fonts/` to absolute `file://` paths at render time.

### CV
1. Read `templates/cv-template.html` (or copy a canonical example above) and fill the content for all 9 sections.
2. Write the filled HTML to `output/cv-meehae-song-{company}-{date}.html`.
3. Render:
```bash
node generate-pdf.mjs output/cv-meehae-song-{company}-{date}.html \
                      output/cv-meehae-song-{company}-{date}.pdf --format=letter
```
(`--format=letter` for Canada/US; `--format=a4` for elsewhere.)

### Cover letter
There is no cover template in `templates/`. Author the cover `.html` ad hoc, reusing the CV's header block (name + gradient rule + contact row). Render with the same `generate-pdf.mjs` command. See `output/cover-meehae-song-xr-terra-2026-05-29.html` as the reference.

### Bundle (ALL generated docs)
```bash
cd output && zip -j {NNN}-{slug}-{date}.zip \
  cv-meehae-song-{company}-{date}.pdf cv-meehae-song-{company}-{date}.md cv-meehae-song-{company}-{date}.html \
  cover-meehae-song-{company}-{date}.pdf cover-meehae-song-{company}-{date}.md cover-meehae-song-{company}-{date}.html
```

## 6. HTML / rendering gotchas

- **Double-margin blank page:** `generate-pdf.mjs` applies 0.6in PDF margins itself. Set the HTML `body { padding: 0; }` — adding your own inch of body padding pushes content onto a blank trailing page.
- **ATS normalization is automatic:** `generate-pdf.mjs` converts em/en-dashes, smart quotes, etc. to ASCII at render time. You can still write `—`/`–` in the HTML; it gets normalized.
- **Verify after rendering:**
  - Page count (`📊 Pages:` in output) — CV should be ~2 pages, cover 1. If the CV spills to a blank 3rd page, tighten section/line spacing.
  - ToUnicode present: `python3 -c "print(b'/ToUnicode' in open('output/cv-….pdf','rb').read())"` → `True`.
  - **Visually read the PDF** — compiling clean ≠ looking right.
- **Print backgrounds:** keep `-webkit-print-color-adjust: exact` so the gradient rule and competency-tag fills render.
- **Tracker pipe gotcha:** `data/applications.md` is split on `|`. A role title with a literal pipe (e.g. "Instructor | Unity VR Designer") breaks `verify-pipeline.mjs` — use a slash in the tracker cell ("Instructor / Unity VR Designer"); keep the pipe title in the report/cover only.

## 7. File naming (CANONICAL)

- CV: `output/cv-meehae-song-{company}-{date}.{pdf,md,html}`
- Cover: `output/cover-meehae-song-{company}-{date}.{pdf,md,html}`
- Zip: `output/{NNN}-{company-slug}-{date}.zip`
- Report: `reports/{NNN}-{company-slug}-{date}.md`
- `{company}` = short lowercase slug (e.g. `xr-terra`); `{date}` = `YYYY-MM-DD`.
- `output/` and `reports/` are gitignored (user data layer).
- Note: some existing #-prefixed files (e.g. `078-shawnigan-teaching-…`) predate this convention; keep their existing names so report/tracker links stay intact.

## 8. End-of-job checklist

- [ ] CV `.html`, `.pdf`, **and `.md`** written
- [ ] Cover `.html`, `.pdf`, **and `.md`** written
- [ ] All 9 CV sections present; phone in header; Stevenson + VFS included
- [ ] No invented skills (ADDIE/Canvas/Git/robotics/metrics) unless in `cv.md`; no company name in CV body
- [ ] PDFs visually verified (not just "rendered"); CV ~2 pages, no blank trailing page; ToUnicode = True
- [ ] Zip created **with all generated docs** (pdf + md + html for both CV and cover)
- [ ] Tracker row updated (no literal `|` in any cell); `node verify-pipeline.mjs` → 0 errors
- [ ] Any framing decision flagged to Cary

## 9. Related memory files (`~/.claude/.../career-ops/memory/`)

`feedback_cv_html_format` · `feedback_cv_tailoring_inclusion` · `feedback_markdown_versions` · `feedback_application_zip` · `feedback_interactive_decisions` · `feedback_no_unsupported_framework_claims` · `feedback_meehae_no_robotics` · `project_phd_timeline`
