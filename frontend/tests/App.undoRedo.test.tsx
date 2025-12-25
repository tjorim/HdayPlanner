import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/hooks/usePublicHolidays', async () => {
  const actual = await vi.importActual<typeof import('../src/hooks/usePublicHolidays')>(
    '../src/hooks/usePublicHolidays',
  );
  return {
    ...actual,
    usePublicHolidays: () => ({ holidays: [], error: null }),
  };
});

vi.mock('../src/hooks/useSchoolHolidays', async () => {
  const actual = await vi.importActual<typeof import('../src/hooks/useSchoolHolidays')>(
    '../src/hooks/useSchoolHolidays',
  );
  return {
    ...actual,
    useSchoolHolidays: () => ({ holidays: [], error: null }),
  };
});

const toSlashDate = (value: string) => value.replace(/-/g, '/');

const renderApp = async () => {
  vi.stubEnv('VITE_USE_BACKEND', 'false');
  const { default: App } = await import('../src/App');
  render(<App />);
};

const getEventsTableBody = () => {
  const table = screen.getByRole('table', { name: /events table/i });
  const tbody = table.querySelector('tbody');
  if (!tbody) {
    throw new Error('Events table body not found');
  }
  return tbody;
};

const addRangeEvent = async (dateValue: string) => {
  fireEvent.click(screen.getByRole('button', { name: /new event/i }));
  const startInput = screen.getByLabelText(/start/i);
  fireEvent.change(startInput, { target: { value: dateValue } });
  fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
  const matches = await within(getEventsTableBody()).findAllByText(toSlashDate(dateValue));
  expect(matches.length).toBeGreaterThan(0);
};

describe('Undo/Redo history', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does nothing when undo is triggered with empty history', async () => {
    await renderApp();
    const undoButton = screen.getByRole('button', { name: /undo/i });
    expect(undoButton).toBeDisabled();
    fireEvent.click(undoButton);
    expect(getEventsTableBody().querySelectorAll('tr')).toHaveLength(0);
  });

  it('undoes and redoes a single change', async () => {
    await renderApp();
    const dateValue = '2025-01-02';
    await addRangeEvent(dateValue);

    fireEvent.click(screen.getByRole('button', { name: /undo/i }));
    await waitFor(() => {
      expect(within(getEventsTableBody()).queryAllByText(toSlashDate(dateValue))).toHaveLength(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /redo/i }));
    const matches = await within(getEventsTableBody()).findAllByText(toSlashDate(dateValue));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('clears redo history when a new change is made', async () => {
    await renderApp();
    await addRangeEvent('2025-01-02');

    fireEvent.click(screen.getByRole('button', { name: /undo/i }));
    await waitFor(() => {
      expect(within(getEventsTableBody()).queryAllByText('2025/01/02')).toHaveLength(0);
    });

    await addRangeEvent('2025-01-03');
    const redoButton = screen.getByRole('button', { name: /redo/i });
    expect(redoButton).toBeDisabled();
  });

  it('supports multiple sequential undo and redo operations', async () => {
    await renderApp();
    await addRangeEvent('2025-01-02');
    await addRangeEvent('2025-01-03');

    fireEvent.click(screen.getByRole('button', { name: /undo/i }));
    fireEvent.click(screen.getByRole('button', { name: /undo/i }));

    await waitFor(() => {
      expect(within(getEventsTableBody()).queryAllByText('2025/01/02')).toHaveLength(0);
      expect(within(getEventsTableBody()).queryAllByText('2025/01/03')).toHaveLength(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /redo/i }));
    fireEvent.click(screen.getByRole('button', { name: /redo/i }));

    const restoredFirst = await within(getEventsTableBody()).findAllByText('2025/01/02');
    const restoredSecond = await within(getEventsTableBody()).findAllByText('2025/01/03');
    expect(restoredFirst.length).toBeGreaterThan(0);
    expect(restoredSecond.length).toBeGreaterThan(0);
  });

  it('skips history for initial file upload to empty document', async () => {
    const originalFileReader = global.FileReader;
    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText(file: File) {
        file
          .text()
          .then((text) => {
            this.result = text;
            this.onload?.({ target: this } as ProgressEvent<FileReader>);
          })
          .catch(() => {
            this.onerror?.();
          });
      }
    }

    try {
      global.FileReader = MockFileReader as unknown as typeof FileReader;

      await renderApp();
      // No events added first - uploading to empty document

      const content = '2025/01/15-2025/01/15 # Initial upload';
      const uploadInput = screen.getByLabelText(/upload/i);
      const file = new File([content], 'test.hday', { type: 'text/plain' });
      fireEvent.change(uploadInput, { target: { files: [file] } });

      const matches = await within(getEventsTableBody()).findAllByText('2025/01/15');
      expect(matches.length).toBeGreaterThan(0);

      // Undo should be disabled since initial upload skipped history
      const undoButton = screen.getByRole('button', { name: /undo/i });
      expect(undoButton).toBeDisabled();
    } finally {
      global.FileReader = originalFileReader;
    }
  });

  it('tracks history for file uploads after an existing change', async () => {
    const originalFileReader = global.FileReader;
    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText(file: File) {
        file
          .text()
          .then((text) => {
            this.result = text;
            this.onload?.({ target: this } as ProgressEvent<FileReader>);
          })
          .catch(() => {
            this.onerror?.();
          });
      }
    }

    try {
      global.FileReader = MockFileReader as unknown as typeof FileReader;

      await renderApp();
      await addRangeEvent('2025-01-02');

      const content = '2025/02/01-2025/02/01 # Upload test';
      const uploadInput = screen.getByLabelText(/upload/i);
      const file = new File([content], 'test.hday', { type: 'text/plain' });
      fireEvent.change(uploadInput, { target: { files: [file] } });

      const matches = await within(getEventsTableBody()).findAllByText('2025/02/01');
      expect(matches.length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole('button', { name: /undo/i }));
      await waitFor(() => {
        expect(within(getEventsTableBody()).queryAllByText('2025/02/01')).toHaveLength(0);
      });

      const previousMatches = await within(getEventsTableBody()).findAllByText('2025/01/02');
      expect(previousMatches.length).toBeGreaterThan(0);
    } finally {
      global.FileReader = originalFileReader;
    }
  });
});
