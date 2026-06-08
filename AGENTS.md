# Weather Tracker — Agent Rules

## Project Context

This is a single-page React weather dashboard deployed to Cloudflare Pages. The entire UI is in `src/App.tsx`. It uses Vite 8, React 19, Tailwind CSS 4, and TypeScript.

## Critical Rules

### 1. Package Security — 14-Day Age Gate

**NEVER add or upgrade a dependency to a version published less than 14 days ago.**

- All versions in `package.json` MUST be exact (no `^` or `~`). The `.npmrc` enforces `save-exact=true`.
- Before adding any package, check its publish date: `npm view <pkg>@<version> time --json`
- If a transitive dependency is too new, add it to the `overrides` field in `package.json` with a safe version.
- After any dependency change, run `npm run audit:age` to verify all 80+ packages pass.
- The pre-commit hook at `.githooks/pre-commit` will block commits that fail the age gate.

### 2. No Personal Information

- The default location is **Chicago, IL (60603)**. Do not change this to any personal/residential address.
- Do not commit API keys, tokens, or credentials. The Open-Meteo API requires no authentication.
- Do not add analytics, tracking, or telemetry scripts.

### 3. Dependency Minimalism

- This app has 4 runtime dependencies: `react`, `react-dom`, `lucide-react`, and Tailwind (build-time).
- Do not add state management libraries (Redux, Zustand, Jotai, etc.).
- Do not add a router. This is a single-page app.
- Do not add component libraries (MUI, Chakra, shadcn, etc.). Styling is Tailwind utility classes only.
- If you think a new dependency is needed, justify it explicitly.

## Code Structure

### Current Architecture

```
src/
  main.tsx    — React entrypoint, renders <App /> into #root
  index.css   — Single line: @import "tailwindcss"
  App.tsx     — Entire application in one component
```

### Rules for Modifications

- **Prefer modifying `App.tsx` over adding new files** for small changes.
- **Extract to `src/components/`** only if a section is reused or exceeds ~150 lines of JSX.
- **All styling is Tailwind utility classes** in JSX. Do not create separate CSS files or CSS modules.
- **Do not add `@ts-ignore` or `@ts-expect-error`**. The tsconfig is intentionally relaxed (`strict: false`) for Canvas-generated code.

### API & Data

- Weather data comes from [Open-Meteo](https://open-meteo.com/) — free, no API key.
- The API call is in `fetchWeather()` inside `App.tsx`. It fetches 7 past days + 7 forecast days.
- Radar is an embedded Windy.com iframe, not a direct API call.
- Do not switch to a paid weather API without explicit approval.

## Build & Deploy

| Command              | Purpose                              |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start local dev server (port 5173)   |
| `npm run build`      | Type-check + production build        |
| `npm run preview`    | Preview production build locally     |
| `npm run audit:age`  | Run the 14-day package age audit     |

- Production build outputs to `dist/`.
- Cloudflare Pages is configured to run `npm run build` with output dir `dist`.
- Do not change the build command or output directory without updating Cloudflare Pages settings.

## Git Conventions

- **One logical change per commit**. Don't mix dependency updates with feature changes.
- **Commit messages** should be concise and prefixed: `feat:`, `fix:`, `chore:`, `docs:`.
- **Squash/amend** when fixing something introduced in the same work session.
- **Never force-push to `main`** after the initial push (Cloudflare Pages deploys on push).
- The git hooks directory is `.githooks/` (configured via `git config core.hooksPath`).
