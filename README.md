# Lab frontend

One React frontend for the AI Lab. The home page is the lobby: every project, with a lamp that lights while its backend
answers. Each built project has its own screen here. The backends are separate repositories under `Lab/backends/`, each
with its own built-in page or OpenAPI docs, so a backend can run alone or behind this frontend.

Stack: Vite, React 19, TypeScript (strict), React Router 7, TanStack Query, openapi-fetch with types generated from
each backend's OpenAPI schema, Biome, Vitest. Static build, served by nginx in Docker.

## Run

```powershell
npm install
npm run dev              # http://localhost:5173
npm test                 # vitest
npm run lint             # biome and tsc
npm run build            # dist/
```

Start a backend (for example `Lab/backends/pilah`) and its tab lights within ten seconds.

## How a backend joins

1. The backend keeps the Lab contract: `GET /health`, `GET /meta`, OpenAPI at `/openapi.json`, and CORS for
   `http://localhost:5173` and `http://localhost:4173`.
2. Add it to `src/lab/projects.json` (id, name, port, status, group, route, summary, picture, caption).
3. With the backend running, `npm run api:types` writes `src/api/generated/<id>.ts`. Commit it: the build never
   needs a backend.
4. Write a typed client in `src/api/<id>.ts` (`createClient<paths>`) and a screen in `src/apps/<id>/` inside
   `AppShell`, then add its route in `src/main.tsx`.

Backend addresses default to `http://localhost:<port>`. Set `VITE_<ID>_URL` at build time to point elsewhere
(for example `VITE_PILAH_URL=https://pilah.example.com`). These values are public: never put a secret in a `VITE_`
variable.

## Layout

| Path                   | What                                                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lobby/`           | the single-screen AI Lab home: workbench photo, hardware specs, and all 5 services with On or Off health checks                                                                                                                          |
| `src/apps/shared/`     | `AppShell`, the frame every project screen sits in (sidebar, top bar, white sheet), and its stylesheet                                                                                                                                   |
| `src/apps/pilah/`      | the configurable Dispatch System 1 router: custom prompt and choices, 1 to 10 texts or pictures a batch, Jev, Gemini Decision or local Laya picked in the sidebar                                                                        |
| `src/apps/gatekeeper/` | Gatekeeper: the console (a request to try first, with the block cutoffs, then totals, what is behind the gate and the live log) and `/gatekeeper/apps`, the scopes apps use by name with the exact Jev questions and their latest checks |
| `src/apps/lens/`       | the Lens search and ingestion screen: pictures only (no titles, dates or tags), Typesense vector search, uploads without labels, visual neighbours                                                                                       |
| `src/apps/ledger/`     | the Ledger book: supplier invoices with deterministic arithmetic checks, page view, bank statement reconciliation                                                                                                                        |
| `src/guide/`           | `/guide`: how Dispatch, Lens and Gatekeeper work, in English or Indonesian (`?lang=id`), with Gatekeeper's request flow and a cost and speed table (Jev against Gemini, DeepSeek and Claude). Each app's top bar links to its section    |
| `src/lab/`             | the project registry, backend URLs, the health polling hook, picture credits. Tiketa has its own site and repository (tiketa-app): the lobby links to it                                                                                 |
| `src/api/`             | typed clients, and `generated/` types from OpenAPI                                                                                                                                                                                       |
| `src/styles/brand.css` | the one brand: IBM Plex Sans, neutral stone ground, and teal data accent                                                                                                                                                                 |
| `public/media/`        | `lab-v-jepa-2.webp` for the lobby plus web media assets                                                                                                                                                                                  |

## Design

The lobby fits on one `1440x900` screen on a stone ground (`#f2f2f0`) with the robotics research photo on the left and all
six services on the right. Services whose `/health` endpoint answers show `On` and open on click. Services paused for
maintenance stay visible as `In Maintenance` and cannot be clicked. Project screens use the framed-sheet app style
(`inspect.mjs --app`: 0 FAIL, 0 WARN across 1440px, 768px and 390px).
