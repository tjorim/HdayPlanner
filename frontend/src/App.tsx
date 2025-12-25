import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  Accordion,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Stack,
  Table,
} from 'react-bootstrap';
import { getHday, type HdayDocument, putHday } from './api/hday';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { MonthGrid } from './components/MonthGrid';
import { ToastContainer } from './components/ToastContainer';
import { useErrorToast } from './hooks/useErrorToast';
import { getPublicHolidayName, usePublicHolidays } from './hooks/usePublicHolidays';
import { convertDateFormat } from './hooks/useOpenHolidays';
import { getSchoolHolidayName, useSchoolHolidays } from './hooks/useSchoolHolidays';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { isValidDate, parseHdayDate } from './lib/dateValidation';
import {
  type EventFlag,
  type HdayEvent,
  type TimeLocationFlag,
  type TypeFlag,
  buildPreviewLine,
  getEventTypeLabel,
  normalizeEventFlags,
  parseHday,
  sortEvents,
  toLine,
} from './lib/hday';
import type { PublicHolidayInfo, SchoolHolidayInfo } from './types/holidays';
import { dayjs, getWeekdayName } from './utils/dateTimeUtils';
import { getMonthlyPaydayMap } from './utils/paydayUtils';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

type FlagCheckboxProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  name: string;
  type?: 'checkbox' | 'radio';
};

function FlagCheckbox({ id, label, checked, onChange, name, type = 'checkbox' }: FlagCheckboxProps) {
  return (
    <Form.Check id={id} name={name} type={type} label={label} checked={checked} onChange={onChange} />
  );
}

// Error message constants
const ERROR_INVALID_DATE_FORMAT = 'Invalid date format or impossible date (use YYYY/MM/DD)';
const ERROR_END_DATE_BEFORE_START = 'End date must be the same or after start date';
const ERROR_START_DATE_REQUIRED = 'Start date is required';

/**
 * Get the current local year and month formatted as `YYYY-MM`.
 *
 * @returns The current local year and month in `YYYY-MM` format.
 */
function getCurrentMonth(): string {
  return dayjs().format('YYYY-MM');
}

function createHolidayMap<HolidayType extends { startDate: string; endDate: string }, InfoType>(
  holidays: HolidayType[],
  getName: (holiday: HolidayType) => string,
  createInfo: (name: string) => InfoType,
  holidayTypeForWarning: string,
): Map<string, InfoType> {
  const map = new Map<string, InfoType>();
  holidays.forEach((holiday) => {
    const start = dayjs(holiday.startDate);
    const end = dayjs(holiday.endDate);
    if (!start.isValid() || !end.isValid()) {
      console.warn(
        `Invalid ${holidayTypeForWarning} holiday date range: ${holiday.startDate} - ${holiday.endDate}`,
      );
      return;
    }
    if (end.isBefore(start)) {
      console.warn(
        `Inverted ${holidayTypeForWarning} holiday date range: ${holiday.startDate} - ${holiday.endDate}`,
      );
      return;
    }
    const holidayName = getName(holiday);
    for (let current = start; !current.isAfter(end); current = current.add(1, 'day')) {
      const dateKey = convertDateFormat(current.format('YYYY-MM-DD'));
      map.set(dateKey, createInfo(holidayName));
    }
  });
  return map;
}

const TYPE_FLAG_OPTIONS: Array<[TypeFlag | 'none', string]> = [
  ['none', 'None'],
  ['business', 'business'],
  ['weekend', 'weekend'],
  ['birthday', 'birthday'],
  ['ill', 'ill'],
  ['in', 'in'],
  ['course', 'course'],
  ['other', 'other'],
];

const TIME_LOCATION_FLAG_OPTIONS: Array<[TimeLocationFlag | 'none', string]> = [
  ['none', 'None'],
  ['half_am', 'half_am (Morning)'],
  ['half_pm', 'half_pm (Afternoon)'],
  ['onsite', 'onsite'],
  ['no_fly', 'no_fly'],
  ['can_fly', 'can_fly'],
];

const TYPE_FLAGS: ReadonlyArray<TypeFlag> = [
  'business',
  'weekend',
  'birthday',
  'ill',
  'in',
  'course',
  'other',
];
const TIME_LOCATION_FLAGS: ReadonlyArray<TimeLocationFlag> = [
  'half_am',
  'half_pm',
  'onsite',
  'no_fly',
  'can_fly',
];
const TYPE_FLAGS_AS_EVENT_FLAGS: ReadonlyArray<EventFlag> = TYPE_FLAGS;
const TIME_LOCATION_FLAGS_AS_EVENT_FLAGS: ReadonlyArray<EventFlag> = TIME_LOCATION_FLAGS;

// Maximum number of undo/redo history states to keep in memory
const MAX_HISTORY = 50;

// Document state with undo/redo history
type DocumentState = {
  doc: HdayDocument;
  historyPast: HdayDocument[];
  historyFuture: HdayDocument[];
};

// Actions for the document reducer
type DocumentAction =
  | { type: 'SET_DOC'; payload: HdayDocument }
  | { type: 'UPDATE_DOC'; updater: (prev: HdayDocument) => HdayDocument; skipHistory?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' };

/**
 * Reducer for managing document state with undo/redo history.
 * This ensures all state updates happen atomically without nested setters.
 */
function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case 'SET_DOC':
      return { ...state, doc: action.payload };

    case 'UPDATE_DOC': {
      const nextDoc = action.updater(state.doc);
      if (nextDoc === state.doc || action.skipHistory) {
        return { ...state, doc: nextDoc };
      }
      return {
        doc: nextDoc,
        historyPast: [...state.historyPast, state.doc].slice(-MAX_HISTORY),
        historyFuture: [],
      };
    }

    case 'UNDO': {
      if (state.historyPast.length === 0) {
        return state;
      }
      const previousDoc = state.historyPast[state.historyPast.length - 1]!;
      return {
        doc: previousDoc,
        historyPast: state.historyPast.slice(0, -1),
        historyFuture: [state.doc, ...state.historyFuture],
      };
    }

    case 'REDO': {
      if (state.historyFuture.length === 0) {
        return state;
      }
      const nextDoc = state.historyFuture[0]!;
      return {
        doc: nextDoc,
        historyPast: [...state.historyPast, state.doc],
        historyFuture: state.historyFuture.slice(1),
      };
    }

    default:
      return state;
  }
}

/**
 * Main application component for the Holiday Planner UI.
 *
 * Provides the root interface for managing holiday documents and events, supporting both backend-backed and standalone `.hday` workflows.
 *
 * Features include:
 * - Event editing (add, update, delete, duplicate, and bulk actions)
 * - Month view with public holidays
 * - Import and export of `.hday` documents
 * - Toast notifications for user feedback
 * - Theme selection and theming support
 * - Keyboard shortcuts for common actions
 *
 * @returns The root React element for the Holiday Planner application
 */
export default function App() {
  const [user, setUser] = useState('testuser');
  const [{ doc, historyPast, historyFuture }, dispatch] = useReducer(documentReducer, {
    doc: { raw: '', events: [] },
    historyPast: [],
    historyFuture: [],
  });
  const [month, setMonth] = useState(getCurrentMonth());
  const [showEventModal, setShowEventModal] = useState(false);

  const handlePreviousMonth = React.useCallback(() => {
    setMonth((prev) => dayjs(prev + '-01').subtract(1, 'month').format('YYYY-MM'));
  }, []);

  const handleNextMonth = React.useCallback(() => {
    setMonth((prev) => dayjs(prev + '-01').add(1, 'month').format('YYYY-MM'));
  }, []);

  // Standalone mode state
  const [rawText, setRawText] = useState('');
  const [editIndex, setEditIndex] = useState<number>(-1);
  const [eventType, setEventType] = useState<'range' | 'weekly'>('range');
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventWeekday, setEventWeekday] = useState(1);
  const [eventFlags, setEventFlags] = useState<EventFlag[]>([]);
  const previewLine = useMemo(
    () =>
      buildPreviewLine({
        eventType,
        start: eventStart,
        end: eventEnd,
        weekday: eventWeekday,
        title: eventTitle,
        flags: eventFlags,
      }),
    [eventType, eventStart, eventEnd, eventWeekday, eventTitle, eventFlags],
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const formRef = React.useRef<HTMLDivElement>(null);
  const importFileInputRef = React.useRef<HTMLInputElement>(null);
  const selectAllCheckboxRef = React.useRef<HTMLInputElement>(null);

  // Refs for date values to avoid callback dependencies
  const eventStartRef = React.useRef(eventStart);
  const eventEndRef = React.useRef(eventEnd);

  // Keep refs in sync with state
  React.useEffect(() => {
    eventStartRef.current = eventStart;
  }, [eventStart]);

  React.useEffect(() => {
    eventEndRef.current = eventEnd;
  }, [eventEnd]);

  // Validation error states
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');

  // Use toast notifications
  const { toasts, showToast, removeToast } = useToast();

  // Use theme management
  const { theme, toggleTheme } = useTheme();

  // Extract year from current month for holidays API
  const currentYear = useMemo(() => {
    const [yearString] = month.split('-');
    const year = Number(yearString);
    return Number.isInteger(year) ? year : dayjs().year();
  }, [month]);

  // Fetch public holidays (always enabled for NL)
  const { holidays, error: publicHolidaysError } = usePublicHolidays('NL', currentYear, 'EN', true);
  const { holidays: schoolHolidays, error: schoolHolidaysError } = useSchoolHolidays(
    'NL',
    currentYear,
    'NL-NH',
  );

  // Convert holidays to a Map for quick lookup by date
  const publicHolidayMap = useMemo(
    () =>
      createHolidayMap(
        holidays,
        getPublicHolidayName,
        (name): PublicHolidayInfo => ({ name, localName: name }),
        'public',
      ),
    [holidays],
  );

  const paydayMap = useMemo(
    () => getMonthlyPaydayMap(currentYear, publicHolidayMap),
    [currentYear, publicHolidayMap],
  );

  const schoolHolidayMap = useMemo(
    () =>
      createHolidayMap(
        schoolHolidays,
        getSchoolHolidayName,
        (name): SchoolHolidayInfo => ({ name }),
        'school',
      ),
    [schoolHolidays],
  );

  // Show toast if holidays fail to load (only on error transition)
  useErrorToast(publicHolidaysError, 'Failed to load public holidays', showToast);
  useErrorToast(schoolHolidaysError, 'Failed to load school holidays', showToast);

  // Set indeterminate state for select-all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const hasSelection = selectedIndices.size > 0;
      const allSelected = selectedIndices.size === doc.events.length;
      selectAllCheckboxRef.current.indeterminate = hasSelection && !allSelected;
    }
  }, [selectedIndices.size, doc.events.length]);

  // Sort events by date for display (range events by start date, weekly by weekday, unknown last)
  const sortedEvents = useMemo(() => sortEvents(doc.events), [doc.events]);

  // Create a mapping from sorted indices to original indices for edit/delete operations
  const sortedToOriginalIndex = useMemo(() => {
    // Create a Map for O(1) lookup instead of O(n) indexOf
    const indexMap = new Map(doc.events.map((event, idx) => [event, idx]));
    return sortedEvents.map((event) => indexMap.get(event) ?? -1);
  }, [sortedEvents, doc.events]);

  // Backend mode functions
  const load = useCallback(async () => {
    try {
      const d = await getHday(user);
      dispatch({ type: 'SET_DOC', payload: d });
    } catch (error) {
      console.error('Failed to load from API:', error);
      showToast('Failed to load from API. Make sure the backend is running.', 'error');
    }
  }, [user, showToast]);

  // Only auto-load if using backend
  useEffect(() => {
    if (USE_BACKEND) {
      load();
    }
  }, [load]);

  async function save() {
    try {
      const res = await putHday(user, doc);
      showToast(res, 'success');
    } catch (error) {
      console.error('Failed to save to API:', error);
      showToast('Failed to save to API. Make sure the backend is running.', 'error');
    }
  }

  // Standalone mode functions
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        try {
          const events = parseHday(result);
          const isInitialUpload = doc.events.length === 0 && doc.raw.trim() === '';
          applyDocChange((prevDoc) => ({ ...prevDoc, raw: result, events }), isInitialUpload);
          // rawText will be set by the useEffect that watches doc.events
        } catch (error) {
          console.error('Failed to parse file:', error);
          setRawText(result); // Only set on error so user can see/edit invalid content
          showToast(
            'Failed to parse file. Please make sure the file contains valid .hday format.',
            'error',
          );
        }
      }
    };
    reader.onerror = () => {
      console.error('Failed to read file:', reader.error);
      showToast(
        'Failed to read file. Please make sure the file is accessible and try again.',
        'error',
      );
    };
    reader.readAsText(file);
  }

  function handleParse() {
    try {
      const events = parseHday(rawText);
      applyDocChange((prevDoc) => ({ ...prevDoc, raw: rawText, events }));
    } catch (error) {
      console.error('Failed to parse raw content:', error);
      showToast(
        'Failed to parse raw content. Please check the .hday format and try again.',
        'error',
      );
    }
  }

  const handleDownload = useCallback(() => {
    const text = doc.events.map(toLine).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'export.hday';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, [doc.events]);

  const handleResetForm = useCallback(() => {
    setEditIndex(-1);
    setEventType('range');
    setEventTitle('');
    setEventStart('');
    setEventEnd('');
    setEventWeekday(1);
    setEventFlags([]);
    setStartDateError('');
    setEndDateError('');
  }, []);

  const applyDocChange = useCallback(
    (updater: (prevDoc: HdayDocument) => HdayDocument, skipHistory = false) => {
      dispatch({ type: 'UPDATE_DOC', updater, skipHistory });
    },
    [],
  );

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
    setSelectedIndices(new Set());
    setEditIndex(-1);
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' });
    setSelectedIndices(new Set());
    setEditIndex(-1);
  }, []);

  // Validate start date in real-time
  const validateStartDate = useCallback((value: string) => {
    if (!value) {
      setStartDateError('');
      return true;
    }
    if (!isValidDate(value)) {
      setStartDateError(ERROR_INVALID_DATE_FORMAT);
      return false;
    }
    setStartDateError('');
    return true;
  }, []);

  // Validate end date in real-time
  const validateEndDate = useCallback((value: string, startValue: string) => {
    if (!value) {
      setEndDateError('');
      return true;
    }
    if (!isValidDate(value)) {
      setEndDateError(ERROR_INVALID_DATE_FORMAT);
      return false;
    }
    // Check if end is before start
    if (startValue && isValidDate(startValue)) {
      const startDate = parseHdayDate(startValue);
      const endDate = parseHdayDate(value);
      if (endDate < startDate) {
        setEndDateError(ERROR_END_DATE_BEFORE_START);
        return false;
      }
    }
    setEndDateError('');
    return true;
  }, []);

  // Handle start date change with validation
  const handleStartDateChange = useCallback((value: string) => {
    setEventStart(value);
    validateStartDate(value);
    // Re-validate end date since the range validity may have changed with the new start date
    if (eventEndRef.current) {
      validateEndDate(eventEndRef.current, value);
    }
  }, [validateStartDate, validateEndDate]);

  // Handle end date change with validation
  const handleEndDateChange = useCallback((value: string) => {
    setEventEnd(value);
    validateEndDate(value, eventStartRef.current);
  }, [validateEndDate]);

  // Bulk operations - defined before keyboard shortcuts to avoid hoisting issues
  // Helper function to generate accessible aria-labels for event checkboxes
  const getEventAriaLabel = (ev: HdayEvent): string => {
    if (ev.title) {
      return `Select ${ev.title}`;
    }

    const typeLabel = getEventTypeLabel(ev.flags);

    if (ev.type === 'weekly' && ev.weekday) {
      return `Select ${typeLabel} weekly event on ${getWeekdayName(ev.weekday)}`;
    }

    if (ev.end && ev.end !== ev.start) {
      return `Select ${typeLabel} event from ${ev.start || ''} to ${ev.end}`;
    }

    if (ev.flags && ev.flags.length > 0) {
      const readableFlags = ev.flags
        .map((flag) => {
          switch (flag) {
            case 'half_am':
              return 'morning half-day';
            case 'half_pm':
              return 'afternoon half-day';
            case 'holiday':
              return 'vacation';
            case 'business':
              return 'business trip';
            case 'course':
              return 'training';
            case 'in':
              return 'in office';
            default:
              return flag;
          }
        })
        .join(', ');
      return `Select ${typeLabel} event on ${ev.start || ''} with ${readableFlags}`;
    }

    return `Select ${typeLabel} event on ${ev.start || ''}`;
  };

  const handleSelectAll = useCallback(() => {
    setSelectedIndices((prev) => {
      const totalEvents = doc.events.length;
      // Toggle selection based on current state
      if (prev.size === totalEvents) {
        return new Set();
      }
      return new Set(doc.events.map((_, idx) => idx));
    });
  }, [doc]);

  const handleToggleSelect = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    // Use the current selectedIndices state to decide behavior,
    // and keep side effects (showToast) outside of state setter callbacks.
    if (selectedIndices.size === 0) {
      showToast('No events selected', 'warning');
      return;
    }

    const indicesToDelete = new Set(selectedIndices);
    const count = indicesToDelete.size;

    applyDocChange((prevDoc) => ({
      ...prevDoc,
      events: prevDoc.events.filter((_, idx) => !indicesToDelete.has(idx)),
    }));

    // Clear selection after deleting the selected events
    setSelectedIndices(new Set());

    // Show success toast after scheduling state updates
    showToast(`Deleted ${count} event(s)`, 'success');
  }, [applyDocChange, selectedIndices, showToast]);

  const handleDuplicate = useCallback(
    (index: number) => {
      let duplicated = false;

      applyDocChange((prevDoc) => {
        // Validate bounds with current state
        if (index < 0 || index >= prevDoc.events.length) {
          return prevDoc;
        }

        const ev = prevDoc.events[index];

        // Create a duplicate event
        const duplicatedEvent = { ...ev };

        // Insert the duplicated event right after the original
        const newEvents = [
          ...prevDoc.events.slice(0, index + 1),
          duplicatedEvent,
          ...prevDoc.events.slice(index + 1),
        ];

        duplicated = true;
        return { ...prevDoc, events: newEvents };
      });

      // Show toast only if duplication actually occurred
      if (duplicated) {
        showToast('Event duplicated', 'success');
      }

      // Adjust selected indices so they continue to point to the same logical events
      // after inserting a new event at index + 1.
      setSelectedIndices((prevSelected) => {
        if (prevSelected.size === 0) {
          return prevSelected;
        }
        const updated = new Set<number>();
        prevSelected.forEach((i) => {
          if (i > index) {
            updated.add(i + 1);
          } else {
            updated.add(i);
          }
        });
        return updated;
      });
    },
    [applyDocChange, showToast],
  );

  const handleBulkDuplicate = useCallback(() => {
    // Use current selectedIndices state for validation and duplication logic.
    if (selectedIndices.size === 0) {
      showToast('No events selected', 'warning');
      return;
    }

    // Filter to ensure all indices are within bounds (non-negative)
    const sortedIndices = Array.from(selectedIndices)
      .filter((i) => i >= 0)
      .sort((a, b) => b - a);

    let duplicatedCount = 0;

    applyDocChange((prevDoc) => {
      const newEvents = [...prevDoc.events];

      // Validate indices against the current events array
      const validIndices = sortedIndices.filter((i) => i < newEvents.length);

      // If all indices were filtered out, don't modify document
      if (validIndices.length === 0) {
        return prevDoc;
      }

      validIndices.forEach((index) => {
        const ev = newEvents[index];
        const duplicatedEvent = { ...ev };
        // Insert right after the original
        newEvents.splice(index + 1, 0, duplicatedEvent);
      });

      duplicatedCount = validIndices.length;
      return { ...prevDoc, events: newEvents };
    });

    // Show toast with accurate count of duplicated events
    if (duplicatedCount > 0) {
      showToast(`Duplicated ${duplicatedCount} event(s)`, 'success');
    }

    // Clear selection after duplication
    setSelectedIndices(new Set());
  }, [applyDocChange, selectedIndices, showToast]);

  const handleImportFile = useCallback(() => {
    importFileInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          try {
            const importedEvents = parseHday(result);
            // Use functional update to avoid stale closure
            applyDocChange((prevDoc) => ({
              ...prevDoc,
              events: [...prevDoc.events, ...importedEvents],
            }));
            // Clear selection after import for better UX
            setSelectedIndices(new Set());
            showToast(`Imported ${importedEvents.length} event(s)`, 'success');
          } catch (error) {
            console.error('Failed to parse import file:', error);
            showToast(
              'Failed to parse import file. Please make sure the file contains valid .hday format.',
              'error',
            );
          }
        }
      };
      reader.onerror = () => {
        const errorMsg = reader.error ? `: ${reader.error.message}` : '';
        console.error('Failed to read import file:', reader.error);
        showToast(
          `Failed to read import file${errorMsg}. Please ensure the file is valid and try again.`,
          'error',
        );
      };
      reader.readAsText(file);

      // Reset input so same file can be imported again
      e.target.value = '';
    },
    [applyDocChange, showToast],
  );

  // Auto-sync events to text in standalone mode
  useEffect(() => {
    if (!USE_BACKEND) {
      const text = doc.events.map(toLine).join('\n');
      setRawText(text);
    }
  }, [doc.events]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip keyboard shortcuts when user is typing in an input, textarea, or select
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        // Allow Escape to work even in input fields (to cancel edit)
        if (e.key !== 'Escape') {
          return;
        }
      }

      // Ctrl+S / Cmd+S - Download .hday file (standalone mode only)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (!USE_BACKEND) {
          e.preventDefault();
          handleDownload();
        }
      }

      // Ctrl+Z / Cmd+Z - Undo (standalone mode only)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (!USE_BACKEND) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
      }

      // Ctrl+Y / Cmd+Y - Redo (standalone mode only)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (!USE_BACKEND) {
          e.preventDefault();
          handleRedo();
        }
      }

      // Ctrl+N / Cmd+N - Add new event (focus form, standalone mode only)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        if (!USE_BACKEND) {
          e.preventDefault();
          // Reset form and open modal
          handleResetForm();
          setShowEventModal(true);
        }
      }

      // Escape - Cancel edit mode (works in both standalone and backend modes)
      if (e.key === 'Escape') {
        if (editIndex >= 0) {
          handleResetForm();
        }
        if (showEventModal) {
          setShowEventModal(false);
        }
      }

      // Ctrl+A / Cmd+A - Select all events (standalone mode only)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        if (!USE_BACKEND) {
          e.preventDefault();
          handleSelectAll();
        }
      }

      // Delete - Delete selected events (standalone mode only)
      if (e.key === 'Delete') {
        if (!USE_BACKEND && selectedIndices.size > 0) {
          e.preventDefault();
          handleBulkDelete();
        }
      }

      // Ctrl+D / Cmd+D - Duplicate selected events (standalone mode only)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (!USE_BACKEND && selectedIndices.size > 0) {
          e.preventDefault();
          handleBulkDuplicate();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    editIndex,
    handleDownload,
    handleResetForm,
    showEventModal,
    selectedIndices.size,
    handleSelectAll,
    handleBulkDelete,
    handleBulkDuplicate,
    handleRedo,
    handleUndo,
  ]);

  function handleAddOrUpdate() {
    // Validate range event dates
    if (eventType === 'range') {
      // Validate start date
      if (!eventStart) {
        setStartDateError(ERROR_START_DATE_REQUIRED);
        showToast('Please provide a valid start date.', 'warning');
        return false;
      }
      if (!isValidDate(eventStart)) {
        setStartDateError(ERROR_INVALID_DATE_FORMAT);
        showToast('Please provide a valid start date in YYYY/MM/DD format.', 'warning');
        return false;
      }

      // Validate end date if provided
      if (eventEnd && !isValidDate(eventEnd)) {
        setEndDateError(ERROR_INVALID_DATE_FORMAT);
        showToast('Please provide a valid end date in YYYY/MM/DD format.', 'warning');
        return false;
      }

      // Validate that end date is not before start date
      if (eventEnd && isValidDate(eventEnd)) {
        const startDate = parseHdayDate(eventStart);
        const endDate = parseHdayDate(eventEnd);
        if (endDate < startDate) {
          setEndDateError(ERROR_END_DATE_BEFORE_START);
          showToast('End date must be the same or after start date.', 'warning');
          return false;
        }
      }
    }

    const flags = eventFlags.filter((f) => f !== 'holiday');

    // Normalize flags - enforces mutual exclusivity by keeping first flag in each category
    const finalFlags = normalizeEventFlags(flags);

    // Build base event object without raw field
    const baseEvent: Omit<HdayEvent, 'raw'> =
      eventType === 'range'
        ? {
            type: 'range',
            start: eventStart,
            end: eventEnd || eventStart,
            title: eventTitle,
            flags: finalFlags,
          }
        : {
            type: 'weekly',
            weekday: eventWeekday,
            title: eventTitle,
            flags: finalFlags,
          };

    // Create complete event with raw field generated from base event
    const newEvent: HdayEvent = {
      ...baseEvent,
      raw: toLine(baseEvent),
    };

    // Update or add event
    if (editIndex >= 0) {
      applyDocChange((prevDoc) => {
        const newEvents = [...prevDoc.events];
        newEvents[editIndex] = newEvent;
        return { ...prevDoc, events: newEvents };
      });
      setEditIndex(-1);
    } else {
      applyDocChange((prevDoc) => ({ ...prevDoc, events: [...prevDoc.events, newEvent] }));
    }

    handleResetForm();
    return true;
  }

  function handleEdit(index: number) {
    const ev = doc.events[index];

    // Only allow editing of supported event types
    if (ev.type !== 'range' && ev.type !== 'weekly') {
      console.warn('Attempted to edit unsupported event type:', ev.type);
      showToast(
        'Cannot edit events of unknown type. Please delete and recreate the event.',
        'warning',
      );
      return;
    }

    setEditIndex(index);
    setShowEventModal(true);
    setEventType(ev.type);
    setEventTitle(ev.title || '');

    // Clear validation errors
    setStartDateError('');
    setEndDateError('');

    if (ev.type === 'range') {
      setEventStart(ev.start || '');
      setEventEnd(ev.end || '');
    } else if (ev.type === 'weekly') {
      setEventWeekday(ev.weekday ?? 1);
    }

    // Set flags (filter out 'holiday' for display)
    setEventFlags(ev.flags?.filter((f) => f !== 'holiday') || []);
  }

  function handleOpenCreateModal() {
    handleResetForm();
    setShowEventModal(true);
  }

  function handleModalEntered() {
    const firstInput = formRef.current?.querySelector('input, select, textarea');
    if (firstInput instanceof HTMLElement) {
      firstInput.focus();
    }
  }

  function handleSubmitEvent() {
    if (handleAddOrUpdate()) {
      setShowEventModal(false);
    }
  }

  function handleDelete(index: number) {
    applyDocChange((prevDoc) => ({
      ...prevDoc,
      events: prevDoc.events.filter((_, i) => i !== index),
    }));
  }

  function handleClearAll() {
    setShowConfirmDialog(true);
  }

  function confirmClearAll() {
    applyDocChange((prevDoc) => ({ ...prevDoc, events: [] }));
    setRawText('');
    setShowConfirmDialog(false);
  }

  function cancelClearAll() {
    setShowConfirmDialog(false);
  }

  function handleTypeFlagChange(flag: TypeFlag | 'none') {
    setEventFlags((prev) => {
      const withoutTypeFlags = prev.filter((f) => !TYPE_FLAGS_AS_EVENT_FLAGS.includes(f));
      if (flag === 'none') {
        return withoutTypeFlags;
      }
      return [...withoutTypeFlags, flag];
    });
  }

  function handleTimeFlagChange(flag: TimeLocationFlag | 'none') {
    setEventFlags((prev) => {
      const withoutTimeFlags = prev.filter(
        (f) => !TIME_LOCATION_FLAGS_AS_EVENT_FLAGS.includes(f),
      );
      if (flag === 'none') {
        return withoutTimeFlags;
      }
      return [...withoutTimeFlags, flag];
    });
  }

  return (
    <Container fluid="md" className="py-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

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
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <i
                className={`bi bi-${theme === 'light' ? 'moon-stars' : 'sun'} me-2`}
                aria-hidden="true"
              />
              {theme === 'light' ? 'Dark' : 'Light'}
            </Button>

            {USE_BACKEND ? (
              <>
                <Form.Control
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="Username"
                />
                <Button variant="primary" onClick={load}>
                  Load from API
                </Button>
                <Button variant="primary" onClick={save}>
                  Save to API
                </Button>
              </>
            ) : (
              <>
              <Form.Control
                type="file"
                accept=".hday,.txt"
                onChange={handleFileUpload}
                aria-label="Upload .hday or .txt file"
              />
              <Button variant="primary" onClick={handleDownload}>
                Download .hday
              </Button>
            </>
            )}
          </Stack>
        </Card.Body>
      </Card>

      {!USE_BACKEND && (
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
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Example:\n2024/12/23-2025/01/05 # Kerstvakantie\np2024/07/17-2024/07/17\na2025/03/25-2025/03/25`}
                  className="textarea-mono"
                />
              </Form.Group>
              <div className="mt-3">
                <Button variant="primary" onClick={handleParse}>
                  Parse raw content
                </Button>
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      )}

      <Card className="mb-4 shadow-sm">
        <Card.Header className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h2 className="h5 mb-0">Events</h2>
          {!USE_BACKEND && (
            <Stack direction="horizontal" gap={2} className="flex-wrap">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleUndo}
                disabled={historyPast.length === 0}
                title="Undo (Ctrl+Z)"
              >
                <i className="bi bi-arrow-counterclockwise me-2" aria-hidden="true" />
                Undo
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleRedo}
                disabled={historyFuture.length === 0}
                title="Redo (Ctrl+Y)"
              >
                <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
                Redo
              </Button>
              <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
                <i className="bi bi-plus-lg me-2" aria-hidden="true" />
                New event
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={handleClearAll}>
                Clear table
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleBulkDelete}
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
                onClick={handleBulkDuplicate}
                disabled={selectedIndices.size === 0}
                title="Duplicate selected events"
              >
                {selectedIndices.size === 0
                  ? 'Duplicate Selected'
                  : selectedIndices.size === 1
                    ? 'Duplicate 1 event'
                    : `Duplicate ${selectedIndices.size} events`}
              </Button>
              <Button variant="outline-primary" size="sm" onClick={handleImportFile}>
                Import from .hday
              </Button>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".hday,.txt"
                onChange={handleImportFileChange}
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
                {!USE_BACKEND && (
                  <th>
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      checked={selectedIndices.size === doc.events.length && doc.events.length > 0}
                      onChange={handleSelectAll}
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
                {!USE_BACKEND && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((ev, sortedIdx) => {
                const originalIdx = sortedToOriginalIndex[sortedIdx] ?? -1;
                return (
                  <tr key={originalIdx !== -1 ? originalIdx : `fallback-${sortedIdx}`}>
                    {!USE_BACKEND && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(originalIdx)}
                          onChange={() => handleToggleSelect(originalIdx)}
                          disabled={originalIdx === -1}
                          aria-label={getEventAriaLabel(ev)}
                        />
                      </td>
                    )}
                    <td>{sortedIdx + 1}</td>
                    <td>{ev.type}</td>
                    <td>{ev.start || ''}</td>
                    <td>
                      {ev.type === 'weekly' && ev.weekday
                        ? getWeekdayName(ev.weekday)
                        : ev.end || ''}
                    </td>
                    <td>{ev.flags?.join(', ')}</td>
                    <td>{ev.title || ''}</td>
                    {!USE_BACKEND && (
                      <td>
                        <ButtonGroup size="sm">
                          <Button
                            variant="outline-secondary"
                            onClick={() => handleEdit(originalIdx)}
                            disabled={ev.type === 'unknown' || originalIdx === -1}
                            title={
                              ev.type === 'unknown'
                                ? 'Cannot edit unknown event types'
                                : 'Edit event'
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline-primary"
                            onClick={() => handleDuplicate(originalIdx)}
                            disabled={originalIdx === -1}
                            title="Duplicate this event"
                          >
                            Duplicate
                          </Button>
                          <Button
                            variant="outline-danger"
                            onClick={() => handleDelete(originalIdx)}
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

      <Card className="mb-4 shadow-sm">
        <Card.Header>
          <h2 className="h5 mb-0">Month view</h2>
        </Card.Header>
        <Card.Body>
          <Stack direction="horizontal" gap={2} className="flex-wrap mb-3">
            <Form.Label htmlFor="month-view-input" className="mb-0">
              Select month:
            </Form.Label>
            <Button
              variant="outline-secondary"
              onClick={() => setMonth(getCurrentMonth())}
              aria-label="Jump to current month"
            >
              This month
            </Button>
            <Button variant="outline-primary" onClick={handlePreviousMonth} aria-label="Previous month">
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </Button>
            <Form.Control
              id="month-view-input"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-describedby="month-view-help"
              style={{ maxWidth: '180px' }}
            />
            <Button variant="outline-primary" onClick={handleNextMonth} aria-label="Next month">
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </Button>
            <Form.Text id="month-view-help" className="text-muted">
              Format: YYYY-MM (use the month picker)
            </Form.Text>
          </Stack>

          {month && (
            <MonthGrid
              events={doc.events}
              ym={month}
              publicHolidays={publicHolidayMap}
              schoolHolidays={schoolHolidayMap}
              paydayMap={paydayMap}
            />
          )}
        </Card.Body>
      </Card>

      {!USE_BACKEND && (
        <Modal
          show={showEventModal}
          onHide={() => {
            setShowEventModal(false);
            handleResetForm();
          }}
          onEntered={handleModalEntered}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{editIndex >= 0 ? 'Edit event' : 'New event'}</Modal.Title>
          </Modal.Header>
          <Modal.Body ref={formRef}>
            <Form>
              <Row className="g-3">
                <Col xs={12}>
                  <Card className="preview-card border-0">
                    <Card.Body className="py-2">
                      <div className="small text-uppercase text-muted">Preview</div>
                      <div className="fw-semibold">
                        {getEventTypeLabel(eventFlags)}{' '}
                        {eventType === 'weekly'
                          ? eventWeekday
                            ? `· ${getWeekdayName(eventWeekday)}`
                            : ''
                          : eventStart
                            ? eventEnd && eventEnd !== eventStart
                              ? `· ${eventStart} → ${eventEnd}`
                              : `· ${eventStart}`
                            : '· Select a date'}
                      </div>
                      {eventTitle && <div className="text-muted">{eventTitle}</div>}
                      {eventFlags.length > 0 && (
                        <div className="text-muted small">
                          Flags: {eventFlags.join(', ')}
                        </div>
                      )}
                      <div className="mt-2">
                        <div className="small text-uppercase text-muted">Raw line</div>
                        <div className="font-monospace">
                          {previewLine || 'Fill in the required fields to preview the .hday line.'}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="eventType">
                    <Form.Label>Event type</Form.Label>
                    <Form.Select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as 'range' | 'weekly')}
                    >
                      <option value="range">Range (start-end)</option>
                      <option value="weekly">Weekly (weekday)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group controlId="eventTitle">
                    <Form.Label>Comment (optional)</Form.Label>
                    <Form.Control
                      aria-label="Comment"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Optional comment"
                    />
                  </Form.Group>
                </Col>

                {eventType === 'range' ? (
                  <>
                    <Col md={6}>
                      <Form.Group controlId="eventStart">
                        <Form.Label>
                          Start (YYYY/MM/DD) <span className="required-indicator">*</span>
                        </Form.Label>
                        <Form.Control
                          type="date"
                          value={eventStart ? eventStart.replace(/\//g, '-') : ''}
                          onChange={(e) =>
                            handleStartDateChange(
                              e.target.value ? e.target.value.replace(/-/g, '/') : '',
                            )
                          }
                          className={startDateError ? 'input-error' : ''}
                          aria-invalid={!!startDateError}
                          aria-required="true"
                          aria-describedby={startDateError ? 'eventStart-error' : undefined}
                        />
                        <div className="error-message-wrapper">
                          {startDateError && (
                            <div id="eventStart-error" className="error-message" role="alert">
                              {startDateError}
                            </div>
                          )}
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="eventEnd">
                        <Form.Label>End (YYYY/MM/DD)</Form.Label>
                        <Form.Control
                          type="date"
                          value={eventEnd ? eventEnd.replace(/\//g, '-') : ''}
                          onChange={(e) =>
                            handleEndDateChange(
                              e.target.value ? e.target.value.replace(/-/g, '/') : '',
                            )
                          }
                          className={endDateError ? 'input-error' : ''}
                          aria-invalid={!!endDateError}
                          aria-describedby={endDateError ? 'eventEnd-error' : undefined}
                        />
                        <div className="error-message-wrapper">
                          {endDateError && (
                            <div id="eventEnd-error" className="error-message" role="alert">
                              {endDateError}
                            </div>
                          )}
                        </div>
                      </Form.Group>
                    </Col>
                  </>
                ) : (
                  <Col md={6}>
                    <Form.Group controlId="eventWeekday">
                      <Form.Label>Weekday</Form.Label>
                      <Form.Select
                        value={eventWeekday}
                        onChange={(e) => setEventWeekday(parseInt(e.target.value, 10))}
                      >
                        <option value="1">Mon</option>
                        <option value="2">Tue</option>
                        <option value="3">Wed</option>
                        <option value="4">Thu</option>
                        <option value="5">Fri</option>
                        <option value="6">Sat</option>
                        <option value="7">Sun</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                )}

                <Col xs={12}>
                  <fieldset className="border rounded p-3">
                    <legend className="float-none w-auto px-2 fs-6">Type Flags</legend>
                    <Row className="g-2">
                      {TYPE_FLAG_OPTIONS.map(([flag, label]) => (
                        <Col sm={6} lg={4} key={flag}>
                          <FlagCheckbox
                            id={`type-flag-${flag}`}
                            name="type-flag"
                            type="radio"
                            label={label}
                            checked={
                              flag === 'none'
                                ? !eventFlags.some((f) =>
                                    TYPE_FLAGS_AS_EVENT_FLAGS.includes(f),
                                  )
                                : eventFlags.includes(flag)
                            }
                            onChange={() => handleTypeFlagChange(flag)}
                          />
                        </Col>
                      ))}
                    </Row>
                  </fieldset>
                </Col>

                <Col xs={12}>
                  <fieldset className="border rounded p-3">
                    <legend className="float-none w-auto px-2 fs-6">Time / Location Flags</legend>
                    <Row className="g-2">
                      {TIME_LOCATION_FLAG_OPTIONS.map(([flag, label]) => (
                        <Col sm={6} lg={4} key={flag}>
                          <FlagCheckbox
                            id={`time-flag-${flag}`}
                            name="time-flag"
                            type="radio"
                            label={label}
                            checked={
                              flag === 'none'
                                ? !eventFlags.some((f) =>
                                    TIME_LOCATION_FLAGS_AS_EVENT_FLAGS.includes(f),
                                  )
                                : eventFlags.includes(flag)
                            }
                            onChange={() => handleTimeFlagChange(flag)}
                          />
                        </Col>
                      ))}
                    </Row>
                  </fieldset>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={handleResetForm}>
              Reset form
            </Button>
            <Button variant="primary" onClick={handleSubmitEvent}>
              {editIndex >= 0 ? 'Update' : 'Add'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="Confirm Clear All"
        message="Are you sure you want to clear all events?"
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        onConfirm={confirmClearAll}
        onCancel={cancelClearAll}
      />
    </Container>
  );
}
