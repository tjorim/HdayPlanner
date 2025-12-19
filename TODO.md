# TODO - Future Enhancements

## Standalone Viewer (hday_viewer.html)

### High Priority - Quick Wins
- [ ] **Color-coded calendar events** - Add proper colors based on flag types
  - Red (#FF0000) for vacation
  - Orange (#FFA500) for business trips
  - Yellow (#FFFF00) for training/courses
  - Cyan (#00FFFF) for "in office"
  - Pink/Light variants for half-day versions

- [ ] **Auto-load current month** - Set month picker to current month on page load and auto-render

- [ ] **Highlight today** - Add visual indicator for today's date in calendar view

- [ ] **Weekly recurring in calendar** - Show `d0-d6` entries on appropriate weekdays in month view

- [ ] **Auto-sort events by date** - Automatically sort events by start date in the table

### Medium Priority
- [ ] **Keyboard shortcuts**
  - `Ctrl+S` / `Cmd+S` to download .hday file
  - `Ctrl+N` to add new event
  - `Escape` to cancel edit mode

- [ ] **Date validation** - Validate YYYY/MM/DD format and show errors for invalid dates

- [ ] **Bulk operations**
  - Select multiple events to delete
  - Copy/duplicate events
  - Import events from another .hday file

- [ ] **Calendar improvements**
  - Show half-day indicators (`,` for AM, `'` for PM)
  - Display weekends with different background
  - Show national holidays (configurable)

### Low Priority / Nice to Have
- [ ] **Dark mode** - Toggle between light and dark themes

- [ ] **Export formats**
  - Export to iCal/ICS format
  - Export to CSV
  - Export to JSON

- [ ] **Undo/Redo** - History for add/edit/delete operations

- [ ] **Templates** - Save common vacation patterns as templates

- [ ] **Statistics view** - Show vacation days used/remaining, breakdown by type

## Full-Stack Application (holiday-planner/)

### Backend
- [ ] Implement actual Azure AD authentication
- [ ] Add database-backed audit logging
- [ ] Implement Microsoft Graph calendar sync
- [ ] Add role-based permissions system
- [ ] API endpoint for analytics/statistics
- [ ] Bulk import/export endpoints

### Frontend
- [ ] Add proper flag UI with checkboxes
- [ ] Weekly recurring event editor
- [ ] Color-coded month view matching spec
- [ ] Date range validation
- [ ] Team/group file management
- [ ] Calendar sync UI
- [ ] Export to multiple formats
- [ ] Mobile-responsive design improvements

## Documentation
- [ ] Add contribution guidelines (CONTRIBUTING.md)
- [ ] Add code of conduct
- [ ] Choose and add license (MIT, Apache 2.0, etc.)
- [ ] Add screenshots to README
- [ ] Create wiki for advanced usage
- [ ] Add API documentation (Swagger/OpenAPI)

## Testing
- [ ] Add unit tests for .hday parser
- [ ] Add integration tests for API
- [ ] Add E2E tests for frontend
- [ ] Add test coverage reporting
- [ ] Set up CI/CD pipeline (GitHub Actions)

## Deployment
- [ ] Docker Compose example for easy local dev
- [ ] Kubernetes deployment manifests
- [ ] Azure/AWS deployment guides
- [ ] Performance optimization (caching, CDN)
