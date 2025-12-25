import type { ChangeEvent } from 'react';
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
  annualAllowance: number;
  currentYear: number;
  statistics: YearlyStatistics;
  vacationRemaining: number;
  vacationUsed: number;
  onAnnualAllowanceChange: (value: number) => void;
};

function formatDayCount(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(1);
}

export function StatisticsCard({
  annualAllowance,
  currentYear,
  statistics,
  vacationRemaining,
  vacationUsed,
  onAnnualAllowanceChange,
}: StatisticsCardProps) {
  const handleAllowanceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(event.target.value);
    const safeValue = Number.isNaN(value) ? 0 : Math.max(0, value);
    onAnnualAllowanceChange(safeValue);
  };

  return (
    <Accordion className="mb-4 shadow-sm" defaultActiveKey="statistics">
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
                <Form.Control
                  type="number"
                  min="0"
                  step="0.5"
                  value={annualAllowance}
                  onChange={handleAllowanceChange}
                />
                <Form.Text className="text-muted">Days</Form.Text>
              </Form.Group>
            </Col>
            <Col md={4} lg={3}>
              <div className="text-muted small text-uppercase">Vacation days used</div>
              <div className="fs-4 fw-semibold">{formatDayCount(vacationUsed)}</div>
            </Col>
            <Col md={4} lg={3}>
              <div className="text-muted small text-uppercase">Vacation days remaining</div>
              <div className={`fs-4 fw-semibold ${vacationRemaining < 0 ? 'text-danger' : ''}`}>
                {vacationRemaining < 0
                  ? `${formatDayCount(Math.abs(vacationRemaining))} over`
                  : formatDayCount(vacationRemaining)}
              </div>
            </Col>
          </Row>

          <div className="mt-4">
            <h3 className="h6 text-uppercase text-muted">Breakdown by type</h3>
            <Table striped bordered hover responsive className="align-middle mb-0">
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
