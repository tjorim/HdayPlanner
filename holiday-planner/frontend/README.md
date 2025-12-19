# Holiday Planner Frontend (React + Vite)

## Dev Quickstart
```bash
npm install
# copy .env.example to .env and adjust VITE_API_BASE if needed
npm run dev
```

The app loads `.hday` for the user in the input field (default: `testuser`). Add events and click **Save .hday** to write back.

## Notable Improvements

- **Accessibility & Focus**
	- Dialogs use a robust focus trap that filters out disabled/hidden elements and auto-focuses the first interactive control.
	- Toast close buttons have visible focus styling using `:focus-visible`.
- **Toasts & Styles**
	- Toasts now use CSS classes (`toast-container`, `toast`, `toast--{type}`) with a global `@keyframes slideIn` animation defined in `src/styles.css`.
	- Inline styles were migrated to utility classes (e.g., `textarea-mono`, `mr-2`).
- **Event Colors & Symbols**
	- Color palette is WCAG AA compliant with black text. See `src/lib/hday.ts` for constants and contrast notes.
	- Half-day logic uses XOR: both `half_am` and `half_pm` flags are treated as a full day (no half-day symbol shown).
- **Date & Inputs**
	- Range date validation prevents `end < start`.
	- Cross-browser month selection uses a text input with `pattern="\\d{4}-\\d{2}"` and helper text (avoids `input[type=month]` issues).

## Testing

```bash
npm run test           # run unit tests
```

- Vitest config avoids bundling the React Vite plugin; keep Vite plugins in `vite.config.ts`.
- JSDOM is required for `environment: 'jsdom'` and is installed as a dev dependency.

## .hday Flags Reference

- Prefix flags in `.hday` lines:
	- `a`: `half_am`, `p`: `half_pm`
	- `b`: `business`, `s`: `course`, `i`: `in`
- If no type flag is present (`b/s/i`), the event defaults to `holiday`.
- Weekly entries use `d0..d6` (Sun..Sat).
