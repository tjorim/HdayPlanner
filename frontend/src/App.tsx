import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { getHday, putHday, HdayDocument } from './api/hday'
import { MonthGrid } from './components/MonthGrid'
import { toLine, parseHday, normalizeEventFlags, sortEvents, type HdayEvent, type EventFlag } from './lib/hday'
import { useToast } from './hooks/useToast'
import { ToastContainer } from './components/ToastContainer'
import { ConfirmationDialog } from './components/ConfirmationDialog'

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true'
const DATE_FORMAT_REGEX = /^\d{4}\/\d{2}\/\d{2}$/

function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function isValidDate(dateString: string): boolean {
  if (!DATE_FORMAT_REGEX.test(dateString)) {
    return false
  }
  const [year, month, day] = dateString.split('/').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day
}

export default function App(){
  const [user, setUser] = useState('testuser')
  const [doc, setDoc] = useState<HdayDocument>({ raw:'', events:[] })
  const [month, setMonth] = useState(getCurrentMonth())

  // Standalone mode state
  const [rawText, setRawText] = useState('')
  const [editIndex, setEditIndex] = useState<number>(-1)
  const [eventType, setEventType] = useState<'range' | 'weekly'>('range')
  const [eventTitle, setEventTitle] = useState('')
  const [eventStart, setEventStart] = useState('')
  const [eventEnd, setEventEnd] = useState('')
  const [eventWeekday, setEventWeekday] = useState(1)
  const [eventFlags, setEventFlags] = useState<string[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const formRef = React.useRef<HTMLDivElement>(null)

  // Use toast notifications
  const { toasts, showToast, removeToast } = useToast()

  // Sort events by date for display (range events by start date, weekly by weekday, unknown last)
  const sortedEvents = useMemo(() => sortEvents(doc.events), [doc.events])

  // Create a mapping from sorted indices to original indices for edit/delete operations
  const sortedToOriginalIndex = useMemo(() => {
    // Create a Map for O(1) lookup instead of O(n) indexOf
    const indexMap = new Map(doc.events.map((event, idx) => [event, idx]))
    return sortedEvents.map((event) => indexMap.get(event) ?? -1)
  }, [sortedEvents, doc.events])

  // Backend mode functions
  const load = useCallback(async () => {
    try {
      const d = await getHday(user)
      setDoc(d)
    } catch (error) {
      console.error('Failed to load from API:', error)
      showToast('Failed to load from API. Make sure the backend is running.', 'error')
    }
  }, [user, showToast])

  // Only auto-load if using backend
  useEffect(()=>{
    if (USE_BACKEND) {
      load()
    }
  },[load])

  async function save(){
    try {
      const res = await putHday(user, doc)
      showToast(res, 'success')
    } catch (error) {
      console.error('Failed to save to API:', error)
      showToast('Failed to save to API. Make sure the backend is running.', 'error')
    }
  }

  // Standalone mode functions
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result
      if (typeof result === 'string') {
        setRawText(result)
      }
    }
    reader.onerror = () => {
      console.error('Failed to read file:', reader.error)
      showToast('Failed to read file. Please make sure the file is accessible and try again.', 'error')
    }
    reader.readAsText(file)
  }

  function handleParse() {
    const events = parseHday(rawText)
    setDoc({ raw: rawText, events })
  }

  function handleDownload() {
    const text = doc.events.map(toLine).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'export.hday'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  // Auto-sync events to text in standalone mode
  useEffect(() => {
    if (!USE_BACKEND) {
      const text = doc.events.map(toLine).join('\n')
      setRawText(text)
    }
  }, [doc.events])

  // Scroll to form when entering edit mode
  useEffect(() => {
    if (editIndex >= 0 && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editIndex])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+S / Cmd+S - Download .hday file (standalone mode only)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!USE_BACKEND) {
          handleDownload()
        }
      }

      // Ctrl+N / Cmd+N - Add new event (focus form, standalone mode only)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        if (!USE_BACKEND) {
          // Reset form and scroll to it
          handleResetForm()
          if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
            // Focus the first input in the form after scrolling
            setTimeout(() => {
              const firstInput = formRef.current?.querySelector('input, select') as HTMLElement
              firstInput?.focus()
            }, 300)
          }
        }
      }

      // Escape - Cancel edit mode
      if (e.key === 'Escape') {
        if (!USE_BACKEND && editIndex >= 0) {
          handleResetForm()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAddOrUpdate() {
    // Validate range event dates
    if (eventType === 'range') {
      if (!eventStart || !isValidDate(eventStart)) {
        showToast('Please provide a valid start date in YYYY/MM/DD format.', 'warning')
        return
      }
      if (eventEnd && !isValidDate(eventEnd)) {
        showToast('Please provide a valid end date in YYYY/MM/DD format.', 'warning')
        return
      }
      // Validate that end date is not before start date
      if (eventEnd && isValidDate(eventStart) && isValidDate(eventEnd)) {
        const startDate = new Date(eventStart.replace(/\//g, '-'))
        const endDate = new Date(eventEnd.replace(/\//g, '-'))
        if (endDate < startDate) {
          showToast('End date must be the same or after start date.', 'warning')
          return
        }
      }
    }

    const flags = eventFlags.filter(f => f !== 'holiday')
    
    // Enforce single type flag (business/course/in) - priority: business > course > in
    const typeFlags = flags.filter(f => f === 'business' || f === 'course' || f === 'in')
    let resolvedFlags = [...flags]
    
    if (typeFlags.length > 1) {
      // Multiple type flags detected - apply priority order
      const priorityFlag = typeFlags.includes('business') ? 'business' :
                           typeFlags.includes('course') ? 'course' : 'in'
      
      // Remove all type flags and add only the priority one
      resolvedFlags = flags.filter(f => f !== 'business' && f !== 'course' && f !== 'in')
      resolvedFlags.push(priorityFlag)
      
      // Show user feedback
      showToast(`Multiple event types selected. Using '${priorityFlag}' (priority: business > course > in).`, 'info')
    }
    
    const finalFlags = normalizeEventFlags(resolvedFlags as EventFlag[])

    // Build base event object without raw field
    const baseEvent: Omit<HdayEvent, 'raw'> = eventType === 'range'
      ? {
          type: 'range',
          start: eventStart,
          end: eventEnd || eventStart,
          title: eventTitle,
          flags: finalFlags
        }
      : {
          type: 'weekly',
          weekday: eventWeekday,
          title: eventTitle,
          flags: finalFlags
        }

    // Create complete event with raw field generated from base event
    const newEvent: HdayEvent = {
      ...baseEvent,
      raw: toLine(baseEvent)
    }

    // Update or add event
    if (editIndex >= 0) {
      const newEvents = [...doc.events]
      newEvents[editIndex] = newEvent
      setDoc({ ...doc, events: newEvents })
      setEditIndex(-1)
    } else {
      setDoc({ ...doc, events: [...doc.events, newEvent] })
    }

    handleResetForm()
  }

  function handleEdit(index: number) {
    const ev = doc.events[index]

    // Only allow editing of supported event types
    if (ev.type !== 'range' && ev.type !== 'weekly') {
      console.warn('Attempted to edit unsupported event type:', ev.type)
      showToast('Cannot edit events of unknown type. Please delete and recreate the event.', 'warning')
      return
    }

    setEditIndex(index)
    setEventType(ev.type)
    setEventTitle(ev.title || '')

    if (ev.type === 'range') {
      setEventStart(ev.start || '')
      setEventEnd(ev.end || '')
    } else if (ev.type === 'weekly') {
      setEventWeekday(ev.weekday ?? 1)
    }

    // Set flags (filter out 'holiday' for display)
    setEventFlags(ev.flags?.filter(f => f !== 'holiday') || [])
  }

  function handleDelete(index: number) {
    const newEvents = doc.events.filter((_, i) => i !== index)
    setDoc({ ...doc, events: newEvents })
  }

  function handleResetForm() {
    setEditIndex(-1)
    setEventType('range')
    setEventTitle('')
    setEventStart('')
    setEventEnd('')
    setEventWeekday(1)
    setEventFlags([])
  }

  function handleClearAll() {
    setShowConfirmDialog(true)
  }

  function confirmClearAll() {
    setDoc({ ...doc, events: [] })
    setRawText('')
    setShowConfirmDialog(false)
  }

  function cancelClearAll() {
    setShowConfirmDialog(false)
  }

  function handleFlagToggle(flag: string) {
    setEventFlags(prev =>
      prev.includes(flag)
        ? prev.filter(f => f !== flag)
        : [...prev, flag]
    )
  }

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <header>
        <h1>Holiday Planner</h1>

        {USE_BACKEND ? (
          // Backend mode UI
          <div className="row">
            <input value={user} onChange={e=>setUser(e.target.value)} placeholder="Username" />
            <button className="primary" onClick={load}>Load from API</button>
            <button className="primary" onClick={save}>Save to API</button>
          </div>
        ) : (
          // Standalone mode UI
          <div className="row">
            <input
              type="file"
              accept=".hday,.txt"
              onChange={handleFileUpload}
              aria-label="Upload .hday or .txt file"
            />
            <button className="primary" onClick={handleParse}>Parse</button>
            <button className="primary" onClick={handleDownload}>Download .hday</button>
          </div>
        )}
      </header>

      {!USE_BACKEND && (
        <>
          <p className="muted">
            Paste your <code>.hday</code> content below (or load a file), click <b>Parse</b>,
            then edit and <b>Download</b> back to <code>.hday</code>.
            Flags: <code>a</code>=half AM, <code>p</code>=half PM, <code>b</code>=business,
            <code>s</code>=course, <code>i</code>=in; weekly entries use <code>d0..d6</code>.
          </p>
          <label htmlFor="hdayText">Raw .hday content</label>
          <textarea
            id="hdayText"
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={`Example:\n2024/12/23-2025/01/05 # Kerstvakantie\np2024/07/17-2024/07/17\na2025/03/25-2025/03/25`}
            className="textarea-mono"
          />
        </>
      )}

      <h2>Events</h2>
      {!USE_BACKEND && <button onClick={handleClearAll}>Clear table</button>}

      <table className="table">
        <thead>
          <tr>
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
        {sortedEvents.map((ev,sortedIdx)=>{
          // Get the original index from the array for edit/delete operations
          const originalIdx = sortedToOriginalIndex[sortedIdx] ?? -1
          return (
          <tr key={originalIdx !== -1 ? originalIdx : `fallback-${sortedIdx}`}>
            <td>{sortedIdx+1}</td>
            <td>{ev.type}</td>
            <td>{ev.start||''}</td>
            <td>
              {ev.type === 'weekly'
                ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][ev.weekday || 0]
                : (ev.end||'')}
            </td>
            <td>{ev.flags?.join(', ')}</td>
            <td>{ev.title||''}</td>
            {!USE_BACKEND && (
              <td>
                <button 
                  onClick={() => handleEdit(originalIdx)}
                  disabled={ev.type === 'unknown' || originalIdx === -1}
                  title={ev.type === 'unknown' ? 'Cannot edit unknown event types' : 'Edit event'}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(originalIdx)}
                  disabled={originalIdx === -1}
                >
                  Delete
                </button>
              </td>
            )}
          </tr>
        )})}
        </tbody>
      </table>

      {!USE_BACKEND && (
        <>
          <h2>Add / Edit event</h2>
          <div ref={formRef} className="event-form controls">
            <div>
              <label htmlFor="eventType">Event type</label><br/>
              <select id="eventType" value={eventType} onChange={e => setEventType(e.target.value as 'range' | 'weekly')}>
                <option value="range">Range (start-end)</option>
                <option value="weekly">Weekly (weekday)</option>
              </select>
            </div>

            <div>
              <label htmlFor="eventTitle">Title (optional)</label><br/>
              <input id="eventTitle" value={eventTitle} onChange={e => setEventTitle(e.target.value)} />
            </div>

            {eventType === 'range' ? (
              <div>
                <label htmlFor="eventStart">Start (YYYY/MM/DD)</label><br/>
                <input id="eventStart" value={eventStart} onChange={e => setEventStart(e.target.value)} placeholder="2025/12/18" /><br/>
                <label htmlFor="eventEnd">End (YYYY/MM/DD)</label><br/>
                <input id="eventEnd" value={eventEnd} onChange={e => setEventEnd(e.target.value)} placeholder="2025/12/18" />
              </div>
            ) : (
              <div>
                <label htmlFor="eventWeekday">Weekday</label><br/>
                <select id="eventWeekday" value={eventWeekday} onChange={e => setEventWeekday(parseInt(e.target.value))}>
                  <option value="0">Sun</option>
                  <option value="1">Mon</option>
                  <option value="2">Tue</option>
                  <option value="3">Wed</option>
                  <option value="4">Thu</option>
                  <option value="5">Fri</option>
                  <option value="6">Sat</option>
                </select>
              </div>
            )}

            <div>
              <fieldset>
                <legend>Flags</legend>
                <label htmlFor="flag-half-am"><input id="flag-half-am" type="checkbox" checked={eventFlags.includes('half_am')} onChange={() => handleFlagToggle('half_am')} /> half_am</label><br/>
                <label htmlFor="flag-half-pm"><input id="flag-half-pm" type="checkbox" checked={eventFlags.includes('half_pm')} onChange={() => handleFlagToggle('half_pm')} /> half_pm</label><br/>
                <label htmlFor="flag-business"><input id="flag-business" type="checkbox" checked={eventFlags.includes('business')} onChange={() => handleFlagToggle('business')} /> business</label><br/>
                <label htmlFor="flag-course"><input id="flag-course" type="checkbox" checked={eventFlags.includes('course')} onChange={() => handleFlagToggle('course')} /> course</label><br/>
                <label htmlFor="flag-in"><input id="flag-in" type="checkbox" checked={eventFlags.includes('in')} onChange={() => handleFlagToggle('in')} /> in</label>
              </fieldset>
            </div>

            <div>
              <button className="primary" onClick={handleAddOrUpdate}>
                {editIndex >= 0 ? 'Update' : 'Add'}
              </button>
              <button onClick={handleResetForm}>Reset form</button>
            </div>
          </div>
        </>
      )}

      <h2>Month view</h2>
      <div className="row">
        <label htmlFor="month-view-input" className="mr-2">Select month:</label>
        <input
          id="month-view-input"
          value={month}
          onChange={e => setMonth(e.target.value)}
          inputMode="numeric"
          pattern="\d{4}-\d{2}"
          placeholder="YYYY-MM"
          aria-describedby="month-view-help"
        />
        <span id="month-view-help" className="muted">Format: YYYY-MM</span>
      </div>
      {month && <MonthGrid events={doc.events} ym={month} />}

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="Confirm Clear All"
        message="Are you sure you want to clear all events? This action cannot be undone."
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        onConfirm={confirmClearAll}
        onCancel={cancelClearAll}
      />
    </div>
  )
}
