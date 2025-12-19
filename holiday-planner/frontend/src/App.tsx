import React, { useEffect, useState } from 'react'
import { getHday, putHday, HdayDocument } from './api/hday'
import { MonthGrid } from './components/MonthGrid'
import { toLine } from './lib/hday'

export default function App(){
  const [user, setUser] = useState('testuser')
  const [doc, setDoc] = useState<HdayDocument>({ raw:'', events:[] })
  const [month, setMonth] = useState('')

  useEffect(()=>{ load() },[])

  async function load(){
    const d = await getHday(user)
    setDoc(d)
  }

  function addEvent(){
    const start = prompt('Start YYYY/MM/DD') || ''
    if(!start) return
    const end = prompt('End YYYY/MM/DD (or same)') || start
    const title = prompt('Title (optional)') || ''
    const flags = [] as string[]
    const ev = { type: 'range' as const, start, end, title, flags, raw: toLine({type:'range', start, end, title, flags}) }
    setDoc(prev => ({...prev, events:[...prev.events, ev]}))
  }

  async function save(){
    const res = await putHday(user, doc)
    alert(res)
  }

  return (
    <div>
      <header>
        <h1>Holiday Planner</h1>
        <div className="row">
          <input value={user} onChange={e=>setUser(e.target.value)} />
          <button className="primary" onClick={load}>Load</button>
          <button onClick={addEvent}>Add event</button>
          <button className="primary" onClick={save}>Save .hday</button>
        </div>
      </header>

      <h2>Events</h2>
      <table className="table">
        <thead>
          <tr><th>#</th><th>Type</th><th>Start</th><th>End</th><th>Flags</th><th>Title</th></tr>
        </thead>
        <tbody>
        {doc.events.map((ev,i)=>
          <tr key={i}>
            <td>{i+1}</td>
            <td>{ev.type}</td>
            <td>{ev.start||''}</td>
            <td>{ev.end||''}</td>
            <td>{ev.flags?.join(', ')}</td>
            <td>{ev.title||''}</td>
          </tr>
        )}
        </tbody>
      </table>

      <h2>Month view</h2>
      <div className="row">
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} />
      </div>
      {month && <MonthGrid events={doc.events} ym={month} />}
    </div>
  )
}
