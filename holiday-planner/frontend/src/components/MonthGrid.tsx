import React from 'react'
import type { HdayEvent } from '../lib/hday'

export function MonthGrid({ events, ym }: { events: HdayEvent[]; ym: string }){
  const [year, month] = ym.split('-').map(Number)
  const first = new Date(year, month-1, 1)
  const last  = new Date(year, month, 0)
  const pad = (n:number)=>String(n).padStart(2,'0')
  const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const cells: JSX.Element[] = []
  for(let i=0;i<first.getDay();i++) cells.push(<div className="day" key={`pad-${i}`} />)
  for(let d=1; d<=last.getDate(); d++){
    const dateStr = `${year}/${pad(month)}/${pad(d)}`
    const todays = events.filter(ev => ev.type==='range' && ev.start && ev.end && dateStr>=ev.start && dateStr<=ev.end)
    cells.push(
      <div className="day" key={d}>
        <div className="date">{dateStr}</div>
        {todays.map((ev,i)=> <div className="item" key={i}>{ev.flags?.join(', ')} {ev.title||''}</div>)}
      </div>
    )
  }
  return <div className="calendar">{cells}</div>
}
