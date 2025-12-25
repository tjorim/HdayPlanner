import { useEffect, useState } from 'react';
import { Button, Card, Form, Stack } from 'react-bootstrap';
import type { HdayEvent } from '../lib/hday';
import type { PublicHolidayInfo, SchoolHolidayInfo } from '../types/holidays';
import type { PaydayInfo } from '../types/payday';
import { dayjs } from '../utils/dateTimeUtils';
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
  const [monthInput, setMonthInput] = useState(month);
  const [isMonthValid, setIsMonthValid] = useState(true);

  useEffect(() => {
    setMonthInput(month);
    setIsMonthValid(true);
  }, [month]);

  const validateMonthInput = (value: string) => {
    const pattern = /^\d{4}-\d{2}$/;
    if (!pattern.test(value)) {
      return false;
    }
    return dayjs(`${value}-01`, 'YYYY-MM-DD', true).isValid();
  };

  const handleMonthInputChange = (value: string) => {
    setMonthInput(value);
    const isValid = validateMonthInput(value);
    setIsMonthValid(isValid);
    if (isValid) {
      onChangeMonth(value);
    }
  };

  const handleMonthInputBlur = () => {
    if (!validateMonthInput(monthInput)) {
      setMonthInput(month);
      setIsMonthValid(true);
    }
  };

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
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}-[0-9]{2}"
            placeholder="YYYY-MM"
            value={monthInput}
            onChange={(event) => handleMonthInputChange(event.target.value)}
            onBlur={handleMonthInputBlur}
            aria-describedby="month-view-help"
            aria-invalid={!isMonthValid}
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
