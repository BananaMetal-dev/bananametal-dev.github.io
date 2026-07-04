# Audio Visualizer Web Implementation Plan

## Purpose

Implement a browser-only audio visualizer app for the Banana Metal public site.

The app must run on GitHub Pages and must not upload user images, audio, or generated videos to any server.

## Source Inputs

- `オーディオビジュアライザー Web版 仕様書.txt`
- Existing local implementation: `C:\Users\Banan\Desktop\AI\Banana Visualizer`
- Current public site: `C:\Users\Banan\Desktop\AI\HP`

## Deployment Target

- URL: `/apps/visualizer/`
- Hosting: GitHub Pages
- Runtime: static HTML, CSS, JavaScript
- Server API: none
- User data storage by the site operator: none

## Security Policy

- Do not upload selected image files.
- Do not upload selected audio files.
- Do not upload generated WebM or MP4 files.
- Do not add analytics, authentication, external API calls, or tracking.
- Keep all processing in the user's browser.
- Use object URLs only for local preview and download.

## Reuse Assessment

Reusable from the existing Banana Visualizer:

- Visualizer concept and workflow
- Canvas-based preview approach
- Web Audio API and analyser approach
- Still image plus audio visualizer layout

Needs replacement:

- FastAPI backend
- `/api` client layer
- Python renderer
- OpenCV / NumPy rendering
- native FFmpeg execution
- workspace file storage

## Implementation Phases

### Phase 1: GitHub Pages Browser MVP

Goal: publish a usable browser-only visualizer app.

Scope:

- Add static app under `public/apps/visualizer/`.
- Add image file picker.
- Add audio file picker.
- Render preview with Canvas 2D.
- Use Web Audio API analyser data for bars, waveform, and circular modes.
- Record canvas plus audio with `canvas.captureStream()` and `MediaRecorder`.
- Generate WebM in the browser.
- Provide WebM preview and download.
- Show local-only privacy notice.
- Update Apps catalog entry to `available`.

Out of scope:

- MP4 conversion.
- ffmpeg.wasm bundle.
- server rendering.
- project persistence.
- external API.

### Phase 2: Optional MP4 Conversion

Goal: add MP4 conversion after validating bundle size and browser support.

Scope:

- Add local, self-hosted ffmpeg.wasm assets.
- Load ffmpeg.wasm only when the user clicks MP4 conversion.
- Convert generated WebM to MP4 in the browser.
- Show conversion progress, elapsed time, output size, and error states.
- Keep all files local to the browser.

Risk:

- ffmpeg.wasm is large and memory intensive.
- Mobile browsers may fail on long videos.
- GitHub Pages bandwidth and load time should be checked before release.

### Phase 3: Visual Quality Expansion

Scope:

- More visualizer presets.
- Background blur and glow controls.
- Particle effects.
- Layout presets.
- WebGL or OffscreenCanvas optimization if needed.

## Acceptance Criteria For Phase 1

- `/apps/visualizer/` loads on the local Vite preview server.
- Apps page links to `/apps/visualizer/`.
- Image and audio are selected locally with file inputs.
- No network request is made for user files.
- Preview plays with visible canvas animation.
- WebM recording completes and produces a downloadable file.
- Build succeeds with `npm run build`.
- The app does not require new runtime services.

## Files To Change In Phase 1

- `public/apps/visualizer/index.html`
- `public/apps/visualizer/styles.css`
- `public/apps/visualizer/app.js`
- `src/data/apps.ts`
- `README.md`

## Manual Verification

1. Run `npm run build`.
2. Run `npm run preview -- --host 127.0.0.1 --port 4173`.
3. Open `http://127.0.0.1:4173/apps/`.
4. Open the visualizer from the Apps page.
5. Select a local image and audio file.
6. Confirm animated preview.
7. Start WebM recording.
8. Confirm the resulting video preview and download link.

