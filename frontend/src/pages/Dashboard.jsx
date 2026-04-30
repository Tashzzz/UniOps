import React, { useState, useEffect } from 'react'
import { Building2, CalendarCheck, Ticket, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import resourceService from '../services/resourceService'
import bookingService from '../services/bookingService'
import ticketService from '../services/ticketService'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

function statusBadge(status) {
  const map = {
    AVAILABLE:'badge-green', ACTIVE:'badge-green', APPROVED:'badge-green', RESOLVED:'badge-green', CLOSED:'badge-green',
    PENDING:'badge-yellow',  OPEN:'badge-yellow',    IN_PROGRESS:'badge-blue',
    CANCELLED:'badge-gray',  REJECTED:'badge-red',   MAINTENANCE:'badge-orange',
  }
  return `badge ${map[status] || 'badge-gray'}`
}

const BOOKING_COLORS = ['#4f6ef7', '#8b5cf6', '#f59e0b', '#9ca3af', '#ef4444']
const TICKET_COLORS = ['#f59e0b', '#4f6ef7', '#06b6d4', '#22c55e', '#ef4444', '#9ca3af']

function toChartData(items, keys) {
  return keys.map((key) => {
    const value = items.filter((item) => item.status === key).length
    return {
      name: key.replaceAll('_', ' '),
      value,
    }
  }).filter((entry) => entry.value > 0)
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
  const approvedBookings = (bookings || []).filter(b => b.status === 'APPROVED').length
  const completedBookings = (bookings || []).filter(b => b.status === 'COMPLETED').length
  const resolvedTickets = (tickets || []).filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length
  const inProgressTickets = (tickets || []).filter(t => t.status === 'IN_PROGRESS').length

  const utilization = resources.length ? Math.round((availableCount / resources.length) * 100) : 0
  const bookingApprovalRate = bookings.length ? Math.round((approvedBookings / bookings.length) * 100) : 0
  const ticketResolutionRate = tickets.length ? Math.round((resolvedTickets / tickets.length) * 100) : 0
  const bookingChartData = toChartData(bookings, ['APPROVED', 'PENDING', 'COMPLETED', 'CANCELLED', 'REJECTED'])
  const ticketChartData = toChartData(tickets, ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED', 'MAINTENANCE'])

  const stats = [
    { icon: Building2,   cls: 'blue',   value: resources.length, label: 'Total Resources'  },
    { icon: CheckCircle, cls: 'green',  value: availableCount,   label: 'Available Now'    },
    { icon: Clock,       cls: 'yellow', value: pendingCount,     label: 'Pending Bookings' },
    { icon: Ticket,      cls: 'red',    value: openTickets,      label: 'Open Tickets'     },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p>Your real-time operations snapshot for resources, bookings, and support performance.</p>
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

      <div className="dashboard-insights-grid">
        <div className="dashboard-insight-card">
          <div className="dashboard-insight-head">
            <h3>Resource Utilization</h3>
            <span>{utilization}%</span>
          </div>
          <div className="dashboard-meter-track">
            <div className="dashboard-meter-fill" style={{ width: `${utilization}%` }} />
          </div>
          <p>{availableCount} of {resources.length} resources are available right now.</p>
        </div>
        <div className="dashboard-insight-card">
          <div className="dashboard-insight-head">
            <h3>Booking Approval Rate</h3>
            <span>{bookingApprovalRate}%</span>
          </div>
          <div className="dashboard-meter-track">
            <div className="dashboard-meter-fill dashboard-meter-fill-booking" style={{ width: `${bookingApprovalRate}%` }} />
          </div>
          <p>{approvedBookings} approved bookings with {pendingCount} awaiting review.</p>
        </div>
        <div className="dashboard-insight-card">
          <div className="dashboard-insight-head">
            <h3>Ticket Resolution Rate</h3>
            <span>{ticketResolutionRate}%</span>
          </div>
          <div className="dashboard-meter-track">
            <div className="dashboard-meter-fill dashboard-meter-fill-ticket" style={{ width: `${ticketResolutionRate}%` }} />
          </div>
          <p>{resolvedTickets} tickets resolved and {inProgressTickets} currently in progress.</p>
        </div>
      </div>

      <div className="dashboard-chart-grid">
        <div className="card dashboard-chart-card">
          <div className="dashboard-chart-head">
            <h3>Bookings by Status</h3>
            <span>{bookings.length} total</span>
          </div>
          {bookingChartData.length === 0 ? (
            <div className="dashboard-chart-empty">No booking data available.</div>
          ) : (
            <div className="dashboard-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={bookingChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {bookingChartData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={BOOKING_COLORS[index % BOOKING_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={28} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card dashboard-chart-card">
          <div className="dashboard-chart-head">
            <h3>Tickets by Status</h3>
            <span>{tickets.length} total</span>
          </div>
          {ticketChartData.length === 0 ? (
            <div className="dashboard-chart-empty">No ticket data available.</div>
          ) : (
            <div className="dashboard-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={ticketChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {ticketChartData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={TICKET_COLORS[index % TICKET_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={28} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-panels-grid">
        <div className="card">
          <div className="card-heading">
            <CalendarCheck size={16} color="var(--blue)" /> Recent Bookings
          </div>
          <div className="dashboard-mini-kpis">
            <div className="dashboard-mini-kpi">
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </div>
            <div className="dashboard-mini-kpi">
              <span>Approved</span>
              <strong>{approvedBookings}</strong>
            </div>
            <div className="dashboard-mini-kpi">
              <span>Completed</span>
              <strong>{completedBookings}</strong>
            </div>
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
          <div className="dashboard-mini-kpis">
            <div className="dashboard-mini-kpi">
              <span>Open</span>
              <strong>{openTickets}</strong>
            </div>
            <div className="dashboard-mini-kpi">
              <span>In Progress</span>
              <strong>{inProgressTickets}</strong>
            </div>
            <div className="dashboard-mini-kpi">
              <span>Resolved</span>
              <strong>{resolvedTickets}</strong>
            </div>
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