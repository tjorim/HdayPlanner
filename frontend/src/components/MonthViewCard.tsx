import { Button, Card, Form, Stack } from 'react-bootstrap';
import type { HdayEvent } from '../lib/hday';
import type { PublicHolidayInfo, SchoolHolidayInfo } from '../types/holidays';
import type { PaydayInfo } from '../types/payday';
import { MonthGrid } from './MonthGrid';

type MonthViewCardProps = {
  events: HdayEvent[];
  month: string;
  paydayMap: Map<string, PaydayInfo>;
  publicHolidayMap: Map<string, PublicHolidayInfo>;
  schoolHolidayMap: Map<string, SchoolHolidayInfo>;
  onChangeMonth: (value: string) => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onResetMonth: () => void;
};

export function MonthViewCard({
  events,
  month,
  paydayMap,
  publicHolidayMap,
  schoolHolidayMap,
  onChangeMonth,
  onNextMonth,
  onPreviousMonth,
  onResetMonth,
}: MonthViewCardProps) {
  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header>
        <h2 className="h5 mb-0">Month view</h2>
      </Card.Header>
      <Card.Body>
        <Stack direction="horizontal" gap={2} className="flex-wrap mb-3">
          <Form.Label htmlFor="month-view-input" className="mb-0">
            Select month:
          </Form.Label>
          <Button variant="outline-secondary" onClick={onResetMonth} aria-label="Jump to current month">
            This month
          </Button>
          <Button variant="outline-primary" onClick={onPreviousMonth} aria-label="Previous month">
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </Button>
          <Form.Control
            id="month-view-input"
            type="month"
            value={month}
            onChange={(event) => onChangeMonth(event.target.value)}
            aria-describedby="month-view-help"
            style={{ maxWidth: '180px' }}
          />
          <Button variant="outline-primary" onClick={onNextMonth} aria-label="Next month">
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </Button>
          <Form.Text id="month-view-help" className="text-muted">
            Format: YYYY-MM (use the month picker)
          </Form.Text>
        </Stack>

        {month && (
          <MonthGrid
            events={events}
            ym={month}
            publicHolidays={publicHolidayMap}
            schoolHolidays={schoolHolidayMap}
            paydayMap={paydayMap}
          />
        )}
      </Card.Body>
    </Card>
  );
}
