import { Accordion, Button, Form } from 'react-bootstrap';

type RawContentAccordionProps = {
  rawText: string;
  onChangeRawText: (value: string) => void;
  onParse: () => void;
};

export function RawContentAccordion({
  rawText,
  onChangeRawText,
  onParse,
}: RawContentAccordionProps) {
  return (
    <Accordion className="mb-4 shadow-sm">
      <Accordion.Item eventKey="raw-content">
        <Accordion.Header>Raw .hday content</Accordion.Header>
        <Accordion.Body>
          <p className="text-muted">
            Paste your <code>.hday</code> content below (or load a file), click <b>Parse</b>,
            then edit and <b>Download</b> back to <code>.hday</code>. Flags: <code>a</code>=half
            AM, <code>p</code>=half PM, <code>b</code>=business, <code>e</code>=weekend,{' '}
            <code>h</code>=birthday, <code>i</code>=ill, <code>k</code>=in, <code>s</code>=course,{' '}
            <code>u</code>=other, <code>w</code>=onsite, <code>n</code>=no fly, <code>f</code>=can fly;
            weekly: <code>d1-d7</code> (Mon-Sun) with flags after (e.g., <code>d3pb</code>).
          </p>
          <Form.Group controlId="hdayText">
            <Form.Label>Raw .hday content</Form.Label>
            <Form.Control
              as="textarea"
              rows={8}
              value={rawText}
              onChange={(event) => onChangeRawText(event.target.value)}
              placeholder={`Example:\n2024/12/23-2025/01/05 # Kerstvakantie\np2024/07/17-2024/07/17\na2025/03/25-2025/03/25`}
              className="textarea-mono"
            />
          </Form.Group>
          <div className="mt-3">
            <Button variant="primary" onClick={onParse}>
              Parse raw content
            </Button>
          </div>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}
