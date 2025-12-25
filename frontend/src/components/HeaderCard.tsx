import type { ChangeEvent } from 'react';
import { Button, Card, Form, Stack } from 'react-bootstrap';

type HeaderCardProps = {
  theme: 'light' | 'dark';
  user: string;
  useBackend: boolean;
  onToggleTheme: () => void;
  onUserChange: (value: string) => void;
  onLoad: () => void;
  onSave: () => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
};

export function HeaderCard({
  theme,
  user,
  useBackend,
  onToggleTheme,
  onUserChange,
  onLoad,
  onSave,
  onFileUpload,
  onDownload,
}: HeaderCardProps) {
  return (
    <Card className="mb-4 shadow-sm">
      <Card.Body className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3">
        <div>
          <Card.Title as="h1" className="mb-1">
            Holiday Planner
          </Card.Title>
          <div className="text-muted">
            Plan time off, track flags, and review holidays at a glance.
          </div>
        </div>

        <Stack direction="horizontal" gap={2} className="flex-wrap">
          <Button
            variant="outline-secondary"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <i
              className={`bi bi-${theme === 'light' ? 'moon-stars' : 'sun'} me-2`}
              aria-hidden="true"
            />
            {theme === 'light' ? 'Dark' : 'Light'}
          </Button>

          {useBackend ? (
            <>
              <Form.Control
                value={user}
                onChange={(event) => onUserChange(event.target.value)}
                placeholder="Username"
              />
              <Button variant="primary" onClick={onLoad}>
                Load from API
              </Button>
              <Button variant="primary" onClick={onSave}>
                Save to API
              </Button>
            </>
          ) : (
            <>
              <Form.Control
                type="file"
                accept=".hday,.txt"
                onChange={onFileUpload}
                aria-label="Upload .hday or .txt file"
              />
              <Button variant="primary" onClick={onDownload}>
                Download .hday
              </Button>
            </>
          )}
        </Stack>
      </Card.Body>
    </Card>
  );
}
