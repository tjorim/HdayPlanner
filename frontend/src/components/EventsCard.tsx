import type { ChangeEvent, RefObject } from 'react';
import { Button, ButtonGroup, Card, Stack, Table } from 'react-bootstrap';
import type { HdayEvent } from '../lib/hday';
import { getWeekdayName } from '../utils/dateTimeUtils';

type EventsCardProps = {
  canEdit: boolean;
  events: HdayEvent[];
  sortedEvents: HdayEvent[];
  sortedToOriginalIndex: number[];
  selectedIndices: Set<number>;
  historyPast: number;
  historyFuture: number;
  importFileInputRef: RefObject<HTMLInputElement>;
  selectAllCheckboxRef: RefObject<HTMLInputElement>;
  onUndo: () => void;
  onRedo: () => void;
  onNewEvent: () => void;
  onClearAll: () => void;
  onBulkDelete: () => void;
  onBulkDuplicate: () => void;
  onImportFile: () => void;
  onImportFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectAll: () => void;
  onToggleSelect: (index: number) => void;
  onEdit: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  getEventAriaLabel: (event: HdayEvent) => string;
};

export function EventsCard({
  canEdit,
  events,
  sortedEvents,
  sortedToOriginalIndex,
  selectedIndices,
  historyPast,
  historyFuture,
  importFileInputRef,
  selectAllCheckboxRef,
  onUndo,
  onRedo,
  onNewEvent,
  onClearAll,
  onBulkDelete,
  onBulkDuplicate,
  onImportFile,
  onImportFileChange,
  onSelectAll,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
  getEventAriaLabel,
}: EventsCardProps) {
  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h2 className="h5 mb-0">Events</h2>
        {canEdit && (
          <Stack direction="horizontal" gap={2} className="flex-wrap">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={onUndo}
              disabled={historyPast === 0}
              title="Undo (Ctrl+Z)"
            >
              <i className="bi bi-arrow-counterclockwise me-2" aria-hidden="true" />
              Undo
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={onRedo}
              disabled={historyFuture === 0}
              title="Redo (Ctrl+Y)"
            >
              <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
              Redo
            </Button>
            <Button variant="primary" size="sm" onClick={onNewEvent}>
              <i className="bi bi-plus-lg me-2" aria-hidden="true" />
              New event
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={onClearAll}>
              Clear table
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={onBulkDelete}
              disabled={selectedIndices.size === 0}
              title="Delete selected events"
            >
              {selectedIndices.size === 0
                ? 'Delete Selected'
                : selectedIndices.size === 1
                  ? 'Delete 1 event'
                  : `Delete ${selectedIndices.size} events`}
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={onBulkDuplicate}
              disabled={selectedIndices.size === 0}
              title="Duplicate selected events"
            >
              {selectedIndices.size === 0
                ? 'Duplicate Selected'
                : selectedIndices.size === 1
                  ? 'Duplicate 1 event'
                  : `Duplicate ${selectedIndices.size} events`}
            </Button>
            <Button variant="outline-primary" size="sm" onClick={onImportFile}>
              Import from .hday
            </Button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".hday,.txt"
              onChange={onImportFileChange}
              style={{ display: 'none' }}
              aria-label="Import .hday file"
            />
          </Stack>
        )}
      </Card.Header>

      <Card.Body>
        <Table striped bordered hover responsive className="align-middle">
          <thead>
            <tr>
              {canEdit && (
                <th>
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={selectedIndices.size === events.length && events.length > 0}
                    onChange={onSelectAll}
                    aria-label="Select or deselect all events in the table"
                    title="Select/deselect all events"
                  />
                </th>
              )}
              <th>#</th>
              <th>Type</th>
              <th>Start</th>
              <th>End/Weekday</th>
              <th>Flags</th>
              <th>Title</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map((event, sortedIdx) => {
              const originalIdx = sortedToOriginalIndex[sortedIdx] ?? -1;
              return (
                <tr key={originalIdx !== -1 ? originalIdx : `fallback-${sortedIdx}`}>
                  {canEdit && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIndices.has(originalIdx)}
                        onChange={() => onToggleSelect(originalIdx)}
                        disabled={originalIdx === -1}
                        aria-label={getEventAriaLabel(event)}
                      />
                    </td>
                  )}
                  <td>{sortedIdx + 1}</td>
                  <td>{event.type}</td>
                  <td>{event.start || ''}</td>
                  <td>
                    {event.type === 'weekly' && event.weekday
                      ? getWeekdayName(event.weekday)
                      : event.end || ''}
                  </td>
                  <td>{event.flags?.join(', ')}</td>
                  <td>{event.title || ''}</td>
                  {canEdit && (
                    <td>
                      <ButtonGroup size="sm">
                        <Button
                          variant="outline-secondary"
                          onClick={() => onEdit(originalIdx)}
                          disabled={event.type === 'unknown' || originalIdx === -1}
                          title={
                            event.type === 'unknown'
                              ? 'Cannot edit unknown event types'
                              : 'Edit event'
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline-primary"
                          onClick={() => onDuplicate(originalIdx)}
                          disabled={originalIdx === -1}
                          title="Duplicate this event"
                        >
                          Duplicate
                        </Button>
                        <Button
                          variant="outline-danger"
                          onClick={() => onDelete(originalIdx)}
                          disabled={originalIdx === -1}
                        >
                          Delete
                        </Button>
                      </ButtonGroup>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
