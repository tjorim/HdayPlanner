import { useMemo } from 'react';
import { Accordion, Col, Form, Row, Table } from 'react-bootstrap';
import type { TypeFlag } from '../lib/hday';
import type { YearlyStatistics } from '../utils/statisticsUtils';

const STAT_TYPE_ORDER: TypeFlag[] = [
  'holiday',
  'business',
  'weekend',
  'birthday',
  'ill',
  'course',
  'in',
  'other',
];

const STAT_TYPE_LABELS: Record<TypeFlag, string> = {
  holiday: 'Holiday',
  business: 'Business trip',
  weekend: 'Weekend',
  birthday: 'Birthday',
  ill: 'Sick leave',
  course: 'Training',
  in: 'In office',
  other: 'Other',
};

type StatisticsCardProps = {
  annualAllowanceInput: string;
  annualAllowanceUnit: 'days' | 'hours';
  allowanceDays: number | null;
  hoursPerDay: number;
  currentYear: number;
  statistics: YearlyStatistics;
  vacationRemaining: number;
  vacationUsed: number;
  onAnnualAllowanceChange: (value: string) => void;
  onAnnualAllowanceUnitChange: (value: 'days' | 'hours') => void;
};

function formatDayCount(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(1);
}

export function StatisticsCard({
  annualAllowanceInput,
  annualAllowanceUnit,
  allowanceDays,
  hoursPerDay,
  currentYear,
  statistics,
  vacationRemaining,
  vacationUsed,
  onAnnualAllowanceChange,
  onAnnualAllowanceUnitChange,
}: StatisticsCardProps) {
  const helperText = useMemo(() => {
    if (annualAllowanceUnit === 'hours') {
      return `Converted to days using ${hoursPerDay} hours/day.`;
    }
    return 'Days';
  }, [annualAllowanceUnit, hoursPerDay]);

  return (
    <Accordion className="mb-4 shadow-sm">
      <Accordion.Item eventKey="statistics">
        <Accordion.Header>Statistics</Accordion.Header>
        <Accordion.Body>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <span className="text-muted">Year {currentYear}</span>
          </div>
          <Row className="g-3 align-items-end">
            <Col md={4} lg={3}>
              <Form.Group controlId="annual-allowance">
                <Form.Label>Annual vacation allowance</Form.Label>
                <Row className="g-2">
                  <Col xs={7}>
                    <Form.Control
                      type="text"
                      inputMode="decimal"
                      placeholder={annualAllowanceUnit === 'hours' ? 'e.g. 160' : 'e.g. 20'}
                      value={annualAllowanceInput}
                      onChange={(event) => onAnnualAllowanceChange(event.target.value)}
                      aria-describedby="annual-allowance-help"
                    />
                  </Col>
                  <Col xs={5}>
                    <Form.Select
                      value={annualAllowanceUnit}
                      onChange={(event) =>
                        onAnnualAllowanceUnitChange(event.target.value as 'days' | 'hours')
                      }
                      aria-label="Annual allowance unit"
                    >
                      <option value="days">Days</option>
                      <option value="hours">Hours</option>
                    </Form.Select>
                  </Col>
                </Row>
                <Form.Text id="annual-allowance-help" className="text-muted">
                  {helperText}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={4} lg={3}>
              <div className="text-muted small text-uppercase">Vacation days used</div>
              <div className="fs-4 fw-semibold">{formatDayCount(vacationUsed)}</div>
            </Col>
            <Col md={4} lg={3}>
              <div className="text-muted small text-uppercase">Vacation days remaining</div>
              {allowanceDays === null ? (
                <div className="fs-4 fw-semibold text-muted">—</div>
              ) : (
                <div className={`fs-4 fw-semibold ${vacationRemaining < 0 ? 'text-danger' : ''}`}>
                  {vacationRemaining < 0
                    ? `${formatDayCount(Math.abs(vacationRemaining))} over`
                    : formatDayCount(vacationRemaining)}
                </div>
              )}
            </Col>
          </Row>

          <div className="mt-4">
            <h3 className="h6 text-uppercase text-muted">Breakdown by type</h3>
            <Table
              striped
              bordered
              hover
              responsive
              className="align-middle mb-0"
              aria-label="Statistics breakdown by type"
            >
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {STAT_TYPE_ORDER.map((type) => (
                  <tr key={type}>
                    <td>{STAT_TYPE_LABELS[type]}</td>
                    <td>{formatDayCount(statistics.totalsByType[type] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}
