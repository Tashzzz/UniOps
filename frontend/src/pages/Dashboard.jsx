import React, { useState, useEffect } from 'react'
import { Building2, CalendarCheck, Ticket, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import resourceService from '../services/resourceService'
import bookingService from '../services/bookingService'
import ticketService from '../services/ticketService'
import { format } from 'date-fns'

function statusBadge(status) {
  const map = {
    AVAILABLE:'badge-green', ACTIVE:'badge-green', APPROVED:'badge-green', RESOLVED:'badge-green', CLOSED:'badge-green',
    PENDING:'badge-yellow',  OPEN:'badge-yellow',    IN_PROGRESS:'badge-blue',
    CANCELLED:'badge-gray',  REJECTED:'badge-red',   MAINTENANCE:'badge-orange',
  }
  return `badge ${map[status] || 'badge-gray'}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [bookings,  setBookings]  = useState([])
  const [tickets,   setTickets]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [errors,    setErrors]    = useState({})
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF'

  useEffect(() => {
    if (!user?.id) return
    const errs = {}
    const p1 = resourceService.getAll()
      .then(r => setResources(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.resources = true; setResources([]) })
    const p2 = (isAdmin ? bookingService.getAll() : bookingService.getByUser(user.id))
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.bookings = true; setBookings([]) })
    const p3 = (isAdmin ? ticketService.getAll() : ticketService.getByUser(user.id))
      .then(r => setTickets(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.tickets = true; setTickets([]) })
    Promise.all([p1, p2, p3]).finally(() => { setErrors(errs); setLoading(false) })
  }, [user])

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  const availableCount = (resources||[]).filter(r => r.status==='ACTIVE' || r.status==='AVAILABLE').length
  const pendingCount   = (bookings ||[]).filter(b => b.status==='PENDING').length
  const openTickets    = (tickets  ||[]).filter(t => t.status==='OPEN'||t.status==='IN_PROGRESS').length

  const stats = [
    { icon: Building2,   cls: 'blue',   value: resources.length, label: 'Total Resources'  },
    { icon: CheckCircle, cls: 'green',  value: availableCount,   label: 'Available Now'    },
    { icon: Clock,       cls: 'yellow', value: pendingCount,     label: 'Pending Bookings' },
    { icon: Ticket,      cls: 'red',    value: openTickets,      label: 'Open Tickets'     },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Good morning, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's an overview of campus activity today.</p>
      </div>

      <div className="stats-grid">
        {stats.map(({ icon: Icon, cls, value, label }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${cls}`}><Icon size={19} /></div>
            <div className="stat-info">
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-heading">
            <CalendarCheck size={16} color="var(--blue)" /> Recent Bookings
          </div>
          {errors.bookings
            ? <p style={{ color:'var(--red)', fontSize:13 }}>Could not load bookings.</p>
            : <div className="recent-list">
                {bookings.slice(0,5).map(b => (
                  <div className="recent-item" key={b.id}>
                    <div className="recent-icon" style={{ background:'#eef1fe' }}>
                      <CalendarCheck size={14} color="var(--blue)" />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.title}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>
                        {b.resource?.name} · {format(new Date(b.startTime),'MMM d, HH:mm')}
                      </div>
                    </div>
                    <span className={statusBadge(b.status)}>{b.status}</span>
                  </div>
                ))}
                {bookings.length===0 && <div style={{ color:'var(--text-3)', fontSize:13, padding:'20px 0', textAlign:'center' }}>No bookings yet.</div>}
              </div>
          }
        </div>

        <div className="card">
          <div className="card-heading">
            <Ticket size={16} color="var(--red)" /> Recent Tickets
          </div>
          {errors.tickets
            ? <p style={{ color:'var(--red)', fontSize:13 }}>Could not load tickets.</p>
            : <div className="recent-list">
                {tickets.slice(0,5).map(t => (
                  <div className="recent-item" key={t.id}>
                    <div className="recent-icon" style={{ background:'var(--red-l)' }}>
                      <Ticket size={14} color="var(--red)" />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.title}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{t.category} · {t.priority}</div>
                    </div>
                    <span className={statusBadge(t.status)}>{t.status.replace('_',' ')}</span>
                  </div>
                ))}
                {tickets.length===0 && <div style={{ color:'var(--text-3)', fontSize:13, padding:'20px 0', textAlign:'center' }}>No tickets yet.</div>}
              </div>
          }
        </div>
      </div>
    </div>
  )
}