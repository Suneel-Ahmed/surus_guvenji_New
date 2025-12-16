Project Plan – Road Safety Report System

1) Objectives
- Deliver web app for operators to generate road safety reports (single + CSV batch) for truck routes in Türkiye.
- Use existing `services/geminiService.ts` unchanged; store Gemini RouteAnalysis in Supabase; share public driver links.
- Enforce KGM accident blackspot URL in Gemini context and always include coords from the Türkiye dataset when matched.

2) Architecture & Stack
- Framework: Next.js (app router) with TypeScript; Vercel hosting.
- Data: Supabase (Postgres) with Auth (email/password or magic link).
- API: Next.js Route Handlers for reports and batches.
- Maps: Leaflet or Mapbox GL for render; Google Maps embed as fallback.
- Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_KEY` (Gemini), optional `MAPBOX_TOKEN`.

3) Data Model (Supabase)
- profiles: id (uuid, PK), email, name, created_at.
- reports: id (uuid, PK), public_slug (text, unique), operator_id (uuid FK->profiles.id), origin_city/county/lat/lng, destination_city/county/lat/lng, departure_time (timestamp null), analysis (jsonb RouteAnalysis), status (pending|processing|ready|failed), error_message (text null), created_at, updated_at.
- batches: id (uuid PK), operator_id, file_name, status (pending|processing|completed|failed), created_at, finished_at.
- batch_items: id (uuid PK), batch_id, row_index (int), raw_json (jsonb), report_id (uuid null), status (pending|processing|ready|failed), error_message.
- RLS: operators can read/write their rows; public read-only on reports via `public_slug` only.

4) Location Dataset Integration
- Load `cities.json` server-side; helper to match city+county -> coords.
- Form: city select + county select with search; accept manual text; if exact/fuzzy match, auto-fill coords; else allow manual lat/lng or fallback geocode.
- Batch CSV: apply same resolver per row; mark errors for unmatched rows unless manual coords provided.

5) Gemini Usage (keep service unchanged)
- Wrap server action/API that calls `analyzeRoute(originName, destinationName, originCoords?, destCoords?, options?)`.
- Always pass coords when matched; always inject KGM blackspot URL into prompt context (prepend to origin/destination text or options) without altering service code/types.
- Store exact RouteAnalysis JSON in `reports.analysis`.

6) API Endpoints
- POST /api/reports: auth; validate inputs; resolve coords; create report (status=processing); call Gemini; update status=ready + analysis or status=failed + error.
- GET /api/reports: list operator’s reports.
- GET /api/reports/:id: operator detail.
- POST /api/reports/batch: upload CSV; create batch + items; process sequentially (or queued); update per-item status and link to reports.
- GET /api/public/:slug: anon fetch of public report data only.

7) Frontend Pages (align to mocks)
- Landing `/`: match `landing_page.png` (left truck image, right login form “Sürüş Güvenliği”).
- Login `/login`: Supabase Auth form.
- Dashboard `/dashboard`: buttons Create Report / Upload CSV; table listing reports with status/date/open/copy public link.
- Create Report `/reports/new`: city/county selects, optional manual lat/lng, toll toggle, submit -> backend; show status/progress.
- Batch upload: CSV drop/textarea, preview rows, submit to batch endpoint, live status per item.
- Operator view `/reports/[id]`: map with route, distance/ETA/weather cards, risk donut/bar, critical points list, timeline, analysis summary; operator-only buttons: share, WhatsApp, navigation, print/PDF.
- Public driver view `/r/[slug]`: same visuals minus operator-only buttons; wider map.

8) Maps & UI
- Render map with origin/destination markers and polyline (from routing API or encoded path); fallback to Google Maps embed if polyline unavailable.
- Weather: display from Gemini output; consistent icons.
- Charts/timeline: reuse `components/RiskCharts`, `RouteTimeline`, `SummaryCards`; adapt props to API data.
- Sharing: copy link button, WhatsApp intent using `/r/[slug]`; navigation link opens Google Maps with waypoints/toll preference.

9) CSV Handling
- Expected columns: origin_city, origin_county, destination_city, destination_county, (optional) origin_lat/lng, destination_lat/lng, stop fields optional.
- Validate rows; resolve coords; create batch_items; run Gemini per row with backoff (service already retries).
- Surface row-level errors in UI; allow retry.

10) Deployment & Ops
- Vercel deploy; bind env vars; no secrets in client bundle except anon key.
- Supabase migrations (SQL) checked into repo; optional seed script.
- Add basic rate limiting per operator on APIs; log errors to console + Supabase table.

11) Testing & QA
- Unit: coord resolver; slug generator; API validators.
- Integration: API routes with mocked Supabase/Gemini; RLS policy checks.
- Manual: single report happy path, CSV mixed matches, public slug view, auth flow, map render fallback.

12) Milestones
- M1: Next.js scaffold, env wiring, Supabase clients, migrations.
- M2: Location resolver + create-report API wired to Gemini.
- M3: Dashboard + report detail + public view with charts/timeline.
- M4: CSV batch upload end-to-end.
- M5: Polish (maps, sharing, print), QA, deploy to Vercel.
