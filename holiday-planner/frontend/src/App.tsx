import React, { useEffect, useState } from 'react'
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

  // Only auto-load if using backend
  useEffect(()=>{
    if (USE_BACKEND) {
      load()
    }
  },[])

  // Backend mode functions
  async function load(){
    try {
      const d = await getHday(user)
      setDoc(d)
    } catch (error) {
      console.error('Failed to load from API:', error)
      alert('Failed to load from API. Make sure the backend is running.')
    }
  }

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

  function syncEventsToText() {
    const text = doc.events.map(toLine).join('\n')
    setRawText(text)
  }

  function handleAddOrUpdate() {
    const flags = eventFlags.filter(f => f !== 'holiday')

    // Add default 'holiday' if no type flags
    const finalFlags = flags.some(f => ['business', 'course', 'in'].includes(f))
      ? flags
      : [...flags, 'holiday']

    if (eventType === 'range') {
      const ev: HdayEvent = {
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

      if (editIndex >= 0) {
        const newEvents = [...doc.events]
        newEvents[editIndex] = ev
        setDoc({ ...doc, events: newEvents })
        setEditIndex(-1)
      } else {
        setDoc({ ...doc, events: [...doc.events, ev] })
      }
    } else {
      const ev: HdayEvent = {
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

      if (editIndex >= 0) {
        const newEvents = [...doc.events]
        newEvents[editIndex] = ev
        setDoc({ ...doc, events: newEvents })
        setEditIndex(-1)
      } else {
        setDoc({ ...doc, events: [...doc.events, ev] })
      }
    }

    // Sync to textarea
    setTimeout(() => syncEventsToText(), 0)
    handleResetForm()
  }

  function handleEdit(index: number) {
    const ev = doc.events[index]
    setEditIndex(index)
    setEventType(ev.type as 'range' | 'weekly')
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
    setTimeout(() => syncEventsToText(), 0)
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
    if (confirm('Clear all events?')) {
      setDoc({ ...doc, events: [] })
      setRawText('')
    }
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
            <input type="file" accept=".hday,.txt" onChange={handleFileUpload} />
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
              <label>Event type</label><br/>
              <select value={eventType} onChange={e => setEventType(e.target.value as 'range' | 'weekly')}>
                <option value="range">Range (start-end)</option>
                <option value="weekly">Weekly (weekday)</option>
              </select>
            </div>

            <div>
              <label>Title (optional)</label><br/>
              <input value={eventTitle} onChange={e => setEventTitle(e.target.value)} />
            </div>

            {eventType === 'range' ? (
              <div>
                <label>Start (YYYY/MM/DD)</label><br/>
                <input value={eventStart} onChange={e => setEventStart(e.target.value)} placeholder="2025/12/18" /><br/>
                <label>End (YYYY/MM/DD)</label><br/>
                <input value={eventEnd} onChange={e => setEventEnd(e.target.value)} placeholder="2025/12/18" />
              </div>
            ) : (
              <div>
                <label>Weekday</label><br/>
                <select value={eventWeekday} onChange={e => setEventWeekday(parseInt(e.target.value))}>
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
              <label>Flags</label><br/>
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
    </div>
  )
}
