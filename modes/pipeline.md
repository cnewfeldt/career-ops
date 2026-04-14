# Modo: pipeline — Inbox de URLs (Second Brain)

Procesa URLs de ofertas acumuladas en `data/pipeline.md`. El usuario agrega URLs cuando quiera y luego ejecuta `/career-ops pipeline` para procesarlas todas.

## Workflow

1. **Leer** `data/pipeline.md` → buscar items `- [ ]` en la sección "Pendientes"
2. **LIVENESS GATE (main session only -- runs BEFORE dispatching subagents)**:
   Run `node check-liveness.mjs` on ALL pending URLs in the main session.
   This MUST happen before any evaluation work begins.
   ```bash
   node check-liveness.mjs <url1> <url2> ... <urlN>
   ```
   - **active** → proceed to evaluation
   - **expired** → run FALLBACK CHECK (step 2b), then mark as closed if still not found
   - **uncertain** → proceed but flag in report header as `**Verification:** uncertain`
   Parse the output and remove expired URLs from the batch before step 3.
2b. **FALLBACK CHECK for expired URLs (main session only)**:
   For each expired URL, check the company's own careers page for the same role:
   ```bash
   node check-fallback.mjs --company "{company}" --role "{role title}"
   ```
   Or batch via TSV file (tab-separated: url, company, role):
   ```bash
   node check-fallback.mjs --file expired.tsv
   ```
   - **found** → update the pipeline entry with the new URL and re-check liveness
   - **not found** → mark as `- [!] {url} | {company} | {title} — Closed {date}` and skip
   This catches roles that moved to a different ATS or are only listed on the company's own site.
3. **Para cada URL que pasó liveness check**:
   a. Calcular siguiente `REPORT_NUM` secuencial (leer `reports/`, tomar el número más alto + 1)
   b. **Extraer JD** usando WebFetch (subagents don't have Playwright) → WebSearch as fallback
   c. Si la URL no es accesible → marcar como `- [!]` con nota y continuar
   d. **Ejecutar auto-pipeline completo**: Evaluación A-F → Report .md → PDF (si score >= 3.0) → Tracker
   e. **Mover de "Pendientes" a "Procesadas"**: `- [x] #NNN | URL | Empresa | Rol | Score/5 | PDF ✅/❌`
4. **Si hay 3+ URLs pendientes**, lanzar agentes en paralelo (Agent tool con `run_in_background`) para maximizar velocidad.
5. **Al terminar**, mostrar tabla resumen:

```
| # | Empresa | Rol | Score | PDF | Acción recomendada |
```

## Formato de pipeline.md

```markdown
## Pendientes
- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company Inc | Senior PM
- [!] https://private.url/job — Error: login required

## Procesadas
- [x] #143 | https://jobs.example.com/posting/789 | Acme Corp | AI PM | 4.2/5 | PDF ✅
- [x] #144 | https://boards.greenhouse.io/xyz/jobs/012 | BigCo | SA | 2.1/5 | PDF ❌
```

## Playwright Constraint

**Playwright browser tools (browser_navigate, browser_snapshot) are ONLY available in the main Claude Code session.**
Subagents launched via `Agent()` do NOT have Playwright access. This means:
- Liveness checks (`check-liveness.mjs`) must run in the main session BEFORE dispatching subagents
- Subagents use WebFetch/WebSearch for JD extraction (works for most ATS pages)
- The `/career-ops apply` mode should run in the main session (interactive form filling)

## Detección inteligente de JD desde URL

1. **WebFetch (primary for subagents):** Works for most Greenhouse, Lever, Ashby pages.
2. **WebSearch (fallback):** Search for the JD on secondary portals that index it.
3. **Playwright (main session only):** `browser_navigate` + `browser_snapshot` for SPAs that WebFetch can't render.

**Casos especiales:**
- **LinkedIn**: Puede requerir login → marcar `[!]` y pedir al usuario que pegue el texto
- **PDF**: Si la URL apunta a un PDF, leerlo directamente con Read tool
- **`local:` prefix**: Leer el archivo local. Ejemplo: `local:jds/linkedin-pm-ai.md` → leer `jds/linkedin-pm-ai.md`

## Numeración automática

1. Listar todos los archivos en `reports/`
2. Extraer el número del prefijo (e.g., `142-medispend...` → 142)
3. Nuevo número = máximo encontrado + 1

## Sincronización de fuentes

Antes de procesar cualquier URL, verificar sync:
```bash
node cv-sync-check.mjs
```
Si hay desincronización, advertir al usuario antes de continuar.
