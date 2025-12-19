import React, { useEffect, useState, useCallback } from 'react'
import { getHday, putHday, HdayDocument } from './api/hday'
import { MonthGrid } from './components/MonthGrid'
import { toLine, parseHday, type HdayEvent } from './lib/hday'

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true'

export default function App(){
  const [user, setUser] = useState('testuser')
  const [doc, setDoc] = useState<HdayDocument>({ raw:'', events:[] })
  const [month, setMonth] = useState('')

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

  // Backend mode functions
  const load = useCallback(async () => {
    try {
      const d = await getHday(user)
      setDoc(d)
    } catch (error) {
      console.error('Failed to load from API:', error)
      alert('Failed to load from API. Make sure the backend is running.')
    }
  }, [user])

  // Only auto-load if using backend
  useEffect(()=>{
    if (USE_BACKEND) {
      load()
    }
  },[load])

  async function save(){
    try {
      const res = await putHday(user, doc)
      alert(res)
    } catch (error) {
      console.error('Failed to save to API:', error)
      alert('Failed to save to API. Make sure the backend is running.')
    }
  }

  // Standalone mode functions
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setRawText(text)
    }
    reader.onerror = () => {
      console.error('Failed to read file:', reader.error)
      alert('Failed to read file. Please make sure the file is accessible and try again.')
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
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // Auto-sync events to text in standalone mode
  useEffect(() => {
    if (!USE_BACKEND && doc.events.length > 0) {
      const text = doc.events.map(toLine).join('\n')
      setRawText(text)
    }
  }, [doc.events])

  function handleAddOrUpdate() {
    // Validate range event dates
    if (eventType === 'range') {
      if (!eventStart || !eventStart.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
        alert('Please provide a valid start date in YYYY/MM/DD format.')
        return
      }
      if (eventEnd && !eventEnd.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
        alert('Please provide a valid end date in YYYY/MM/DD format.')
        return
      }
    }

    const flags = eventFlags.filter(f => f !== 'holiday')

    // Add default 'holiday' if no type flags
    const finalFlags = flags.some(f => ['business', 'course', 'in'].includes(f))
      ? flags
      : [...flags, 'holiday']

    let newEvent: HdayEvent

    if (eventType === 'range') {
      newEvent = {
        type: 'range',
        start: eventStart,
        end: eventEnd || eventStart,
        title: eventTitle,
        flags: finalFlags,
        raw: toLine({
          type: 'range',
          start: eventStart,
          end: eventEnd || eventStart,
          title: eventTitle,
          flags: finalFlags
        })
      }
    } else {
      newEvent = {
        type: 'weekly',
        weekday: eventWeekday,
        title: eventTitle,
        flags: finalFlags,
        raw: toLine({
          type: 'weekly',
          weekday: eventWeekday,
          title: eventTitle,
          flags: finalFlags
        })
      }
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
      alert('Cannot edit events of unknown type. Please delete and recreate the event.')
      return
    }

    setEditIndex(index)
    setEventType(ev.type)
    setEventTitle(ev.title || '')

    if (ev.type === 'range') {
      setEventStart(ev.start || '')
      setEventEnd(ev.end || '')
    } else if (ev.type === 'weekly') {
      setEventWeekday(ev.weekday || 1)
    }

    // Set flags (filter out 'holiday' for display)
    setEventFlags(ev.flags?.filter(f => f !== 'holiday') || [])

    // Scroll to form
    setTimeout(() => {
      document.querySelector('.event-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
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
            style={{ width: '100%', height: '220px', fontFamily: 'monospace' }}
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
        {doc.events.map((ev,i)=>
          <tr key={i}>
            <td>{i+1}</td>
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
                <button onClick={() => handleEdit(i)}>Edit</button>
                <button onClick={() => handleDelete(i)}>Delete</button>
              </td>
            )}
          </tr>
        )}
        </tbody>
      </table>

      {!USE_BACKEND && (
        <>
          <h2>Add / Edit event</h2>
          <div className="event-form controls">
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
              <span>Flags</span><br/>
              <label><input type="checkbox" checked={eventFlags.includes('half_am')} onChange={() => handleFlagToggle('half_am')} /> half_am</label><br/>
              <label><input type="checkbox" checked={eventFlags.includes('half_pm')} onChange={() => handleFlagToggle('half_pm')} /> half_pm</label><br/>
              <label><input type="checkbox" checked={eventFlags.includes('business')} onChange={() => handleFlagToggle('business')} /> business</label><br/>
              <label><input type="checkbox" checked={eventFlags.includes('course')} onChange={() => handleFlagToggle('course')} /> course</label><br/>
              <label><input type="checkbox" checked={eventFlags.includes('in')} onChange={() => handleFlagToggle('in')} /> in</label>
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
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} />
      </div>
      {month && <MonthGrid events={doc.events} ym={month} />}

      {/* Accessible confirmation dialog */}
      {showConfirmDialog && (
        <div
          role="dialog"
          aria-labelledby="confirmDialogTitle"
          aria-describedby="confirmDialogDesc"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '2px solid #333',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}
        >
          <h3 id="confirmDialogTitle">Confirm Clear All</h3>
          <p id="confirmDialogDesc">Are you sure you want to clear all events? This action cannot be undone.</p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={cancelClearAll}>Cancel</button>
            <button className="primary" onClick={confirmClearAll}>Clear All</button>
          </div>
        </div>
      )}
      {showConfirmDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
          onClick={cancelClearAll}
        />
      )}
    </div>
  )
}
