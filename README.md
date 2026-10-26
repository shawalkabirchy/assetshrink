# AssetShrink

A private SVG optimizer by [ConsoleLog Studio](https://consolelog.studio/). Select or paste one SVG, compare safe previews, adjust precision, and download validated output. Self-initiated studio project.

[Open AssetShrink](https://assetshrink.pages.dev/) · [Source on GitHub](https://github.com/shawalkabirchy/assetshrink)

The application runs entirely in the browser. It has no upload API, accounts, database, analytics, or persistent file history. Refreshing clears your source and results.

## Run locally

Tested with Node.js **24.14.0** and npm **11.14.1**. The exact runtime is recorded in `.node-version`; dependency versions are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

Development preview: `http://localhost:3000`.

For the production export and its security headers:

```sh
npm run build
npm start
```

Production preview: `http://127.0.0.1:4173`. Keep that process running while using the preview. `npm start` serves the generated `out` directory; it does not run a Next.js server. `PORT` can select another local port, but automated browser tests use 4173.

## Workflow

1. Choose a `.svg` file or paste SVG XML. **Load example** loads original studio artwork without replacing anything on disk.
2. Validation creates the safe baseline and enables **Optimize SVG**.
3. Inspect before/after images at 256 px and 24 px. The first image is the sanitized baseline, not unsanitized source markup.
4. Choose precision 2–5. Changing precision after a completed result reruns from the baseline, avoiding accumulated rounding.
5. Copy code or download `<safe-name>.optimized.svg`. Input without an active filename uses `asset.optimized.svg`; editing a selected file retains its name.

**Reset** restores precision 3 and removes the optimized result while keeping the original source and safe baseline. **Cancel** terminates the worker and preserves the previous completed result for the same input, including its precision. Changing input invalidates old output. An interrupted job cannot overwrite new input.

## Supported SVGs

- One static UTF-8 SVG, up to **1 MiB (1,048,576 bytes)**.
- Shapes, paths, groups, text, definitions, local uses, gradients, masks, and clipping paths.
- References must point to existing local `#id` definitions; IDs must be unique.
- `viewBox`, root dimensions/aspect ratio, IDs, accessibility title/description, and local references are preserved. Color shortening keeps color meaning; it does not force `currentColor`.

Scripts, event handlers, animation, embedded HTML/images, external fonts/resources, document types, processing instructions, CSS style elements, and inline style attributes are rejected. For CSS-based exports, choose **presentation attributes** in the source application's export settings. Filters, editor-specific XML extensions, and identifiers DOMPurify cannot safely retain are outside the supported subset.

Precision can alter fine geometry. Compare both preview sizes and increase precision or reset if details shift. AssetShrink does not guarantee a fixed reduction or visual equivalence for every drawing. It reports larger output honestly.

## Architecture

- Next.js **16.4.3**, App Router, React **19.3.1**, TypeScript **7.0.2**, plain CSS, npm.
- `output: 'export'` produces a static `out` directory. No Pages Functions, server adapter, or runtime Node.js service is required.
- `src/lib/svg.ts`: inert XML parsing, explicit SVG allowlists, local-reference checks, DOMPurify **3.4.17**, and output validation.
- `src/lib/optimize.ts`: conservative SVGO **4.1.0** configuration.
- `src/workers/optimize.worker.ts`: browser optimization in a dedicated worker. Jobs terminate on completion, cancel, error, or a five-second timeout.
- `src/components/use-workbench.ts`: ephemeral state, input validation, cancellation, and protection against stale asynchronous results.
- `src/components/preview.tsx`: image-context previews and Blob URL cleanup. SVG source is never inserted into application HTML.
- `scripts/finalize-export.mjs`: build-specific CSP script hashes and Cloudflare `_headers`.

The source field becomes editable after hydration so early typing cannot be lost to React initialization. Required code is self-hosted; the sanitizer loads during validation and the optimizer loads in its worker.

## Verify

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

Playwright starts or reuses the local production-preview server. It exercises real DOM parsing/sanitization, hostile fixtures, uploads from the local file picker, downloads, keyboard use, privacy, clipboard recovery, worker failure states, and 360 px layout. Tests use a temporary directory outside the repository. Native clipboard success runs in Chromium; Firefox/WebKit cover denied-clipboard recovery.

The local acceptance run passed 11 unit tests and 40 browser scenarios across Chromium, Firefox, and WebKit, with two intentional clipboard skips. Native Safari and physical phones remain untested. No test result is a security or accessibility certification.

## Deploy on Cloudflare Pages Free

The selected host is Cloudflare Pages Free, with the public [GitHub repository](https://github.com/shawalkabirchy/assetshrink) configured as its source. Once GitHub app access is connected, pushes to `main` trigger production builds. Use Cloudflare's **Next.js (Static HTML Export)** preset with the settings below:

| Setting | Value |
| --- | --- |
| Install | `npm ci` |
| Build | `npm run build` |
| Output directory | `out` |
| Node.js | `24.14.0` |
| Production branch | `main` |
| Runtime services | None |

Use `npm run build`, rather than only `next build`, so the CSP hashes and `_headers` are generated. Cloudflare publishes the complete `out` directory, including `_headers` and the license notices. Do not modify generated HTML without regenerating its CSP hashes. Do not apply another CSP through a dashboard without checking the resulting policy.

After editing and checking the project, publish changes through GitHub:

```sh
git add .
git commit -m "Describe the change"
git push origin main
```

Cloudflare builds from source and publishes `out`; generated output is excluded from Git. Keep the Free plan and provider subdomain; no paid resource is required. See the official [static Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

**Current deployment status:** live at [assetshrink.pages.dev](https://assetshrink.pages.dev/), built from GitHub `main` on Cloudflare Pages Free. Hosted optimization, decoded previews, copy feedback, an actual validated download, 360 px layout, license notices, and generated CSP headers passed checks on 26 October 2026. The local production build and 11 unit tests also passed again. No deployment credentials belong in source control.

**Automatic deployment status:** Cloudflare reports that its GitHub connection is disconnected. GitHub verification and repository-access reconnection are pending; automatic push-triggered builds have not yet been verified. The initial hosted build cloned the GitHub source successfully.

After deployment, verify HTTPS, headers, worker loading, sample optimization, copy/download, refresh, and phone layout at the actual live URL. Record that URL in the case study only after a successful deployment. Use the Pages deployment history to roll back to the previous verified version; files are local to each visitor, so there is no server-side data migration or restore.

## Local portfolio materials

Planning documents, the case study, design references, portfolio media, and draft posts remain local under `docs/` and `files/`. These directories are excluded from the public source repository.

To recapture actual product media, start `npm start`, then run:

```sh
node scripts/capture-portfolio.mjs
```

This records a silent complete workflow, screenshots, demo SVGs, and five measured optimization state transitions. It asserts a completed result before saving evidence. It overwrites the generated portfolio media, not user files.

## Troubleshooting and limits

- **Styles unsupported:** export presentation attributes rather than CSS. The app intentionally rejects active/external content instead of guessing how to convert it.
- **Missing ID:** include every referenced definition or accessibility label and remove duplicate IDs.
- **Clipboard unavailable:** the app opens and selects the optimized code; manual copy and download remain available.
- **Timeout/worker failure:** retry, use a simpler SVG, or keep the source file. No partial output is exported.
- **Port in use:** stop the earlier preview process, or select another `PORT` for a manual preview.
- **Tests cannot reach localhost:** allow local browser/process access in the execution environment. No user file upload is needed.
- **Browser scope:** engine automation and viewport emulation do not substitute for testing actual phones or Safari on Apple hardware.

Third-party license notices are retained in [public/third-party-notices.txt](public/third-party-notices.txt), which is also exported with the app. No paid APIs or hosted processing services are required.
