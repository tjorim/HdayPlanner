# Holiday Planner Frontend (React + Vite)

## Dev quickstart
```bash
npm install
# copy .env.example to .env and adjust VITE_API_BASE if needed
npm run dev
```

The app loads `.hday` for the user in the input field (default: `testuser`). Add events and click **Save .hday** to write back.

## Features & Enhancements

The current implementation provides basic functionality. Consider adding:
- **Flags UI**: Checkboxes for half-day (a/p) and type flags (b/s/i)
- **Weekly recurring**: UI for adding `d0-d6` entries
- **Month view**: Color-coded badges for different event types (vacation, business, training)
- **Validation**: Date format checking and range validation
