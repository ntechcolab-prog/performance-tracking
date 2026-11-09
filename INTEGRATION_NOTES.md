# Performance Tracking ↔ Notify / IRIS integration — notes

Status of wiring the (formerly mock) Performance Tracking to the real Go backend. All new
code is additive; existing screens still run on mocks until migrated via the
`src/shared/data/dataSource.ts` seam.

## What's in place

- `public/runtime-config.js` → `window.configuration` (two base URLs: customer
  `api` + `manager-api`, Turnstile site key). Runtime, framework-neutral.
- `src/shared/config/runtimeConfig.ts` — reads the config.
- `src/shared/api/*` — typed client (Bearer + 401/403 refresh + per-call base routing),
  auth (login w/ Turnstile, refresh, logout, JWT claims), and domain modules
  against the REAL contracts: `machines`, `batches`/`batch_notes`, `alarms`,
  `filters`, `metrics`, `dataExports`.
- `src/shared/api/adapters.ts` — real → UI shapes. Fields with no backend counterpart
  are 0/'' (never fabricated).
- `src/shared/lib/oee.ts` — OEE = Availability × Performance × Quality computed at
  runtime from real data + business targets (planned time, ideal rate).
- `src/shared/data/dataSource.ts` — single mock↔api switch (default `mock`).
- Tests: `src/shared/lib/oee.test.ts`, `src/shared/api/adapters.test.ts` (vitest).
- `app/iris-login/page.tsx` — real IRIS login with Cloudflare Turnstile
  (`CloudflareCaptcha` from `web-components-ts`, loaded client-only).

## Open items / decisions for the backend team

1. **Base URL — CONFIRMED: customer `api`.** Validated against staging: the
   `manager@staging-notify.com` account + machines/batches/production endpoints
   all live on `https://api.iris-cloud-stg.netzsch.com/api`. The `manager-api`
   returned INVALID_CREDENTIALS for these accounts.
   - Login needs a captcha; on staging pass the **reCaptcha bypass hash** as
     `recaptchaValue` to skip Turnstile. The hash is a security-bypass value —
     it is NOT stored in the repo; inject it into `runtime-config.js`
     (`recaptchaBypassHash`) locally / at staging deploy time. Its value is in the
     backend's `api/.env.public.example` (public surface) — ask devops to confirm.
     Verified: login → 202 `{access,refresh}`; token carries org `d12dc0a8-…`,
     roles coordinator/manager, features DATA_EXPORTS + BATCH_RECORDS.
     `/v1/batch/*` requires a `page` param (now defaulted).
2. **`web-components-ts` delivery — RESOLVED by vendoring.** The lib's prebuilt
   `dist/` is committed at `vendor/web-components-ts/` and `package.json` points at
   `file:vendor/web-components-ts`. The Vercel build needs NO access to the private
   `get-notify` repo — `npm ci` fetches only the lib's PUBLIC deps (MUI 5, Emotion,
   dayjs) from npm. Verified clean-room (`rm -rf node_modules && npm ci && next
   build`) green. To update the lib: re-copy its `dist/` into `vendor/`.
   - Note: lib is **MUI 5**, app is **MUI 9** — they coexist in a green build
     (Emotion/React are single/deduped; the lib's MUI 5 installs isolated under
     `vendor/web-components-ts/node_modules`). Keep an eye on styled components.
3. **`batch.target.value` semantics** — is it the recipe target size/mass? If so
   it feeds Performance's ideal rate directly; otherwise a per-recipe target
   config stays client-side.
4. **Unit of `hour_meter` and `property.total_grinding_time`** — assumed hours
   (or HH:MM:SS) and minutes respectively; confirm and adjust `src/shared/lib/oee.ts`.
5. **Metrics chart-data response shapes** — `src/shared/api/metrics.ts` functions are
   generic pending the exact shapes from `api/specification.yaml`.

## Auth gate

`middleware.ts` still gates on the legacy `bb_session` cookie and the old
`/login`. The IRIS flow stores JWTs in localStorage; flipping the gate to a
client-side IRIS guard is a deliberate later step (prod is live on `main`).
