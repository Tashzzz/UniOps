import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, CalendarCheck, QrCode } from 'lucide-react'
import { format } from 'date-fns'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../context/AuthContext'
import bookingService from '../services/bookingService'
import BookingForm from '../components/BookingForm'

const STATUS_BADGE = {
  PENDING:   'badge-yellow',
  APPROVED:  'badge-green',
  CANCELLED: 'badge-gray',
  REJECTED:  'badge-red',
  COMPLETED: 'badge-blue',
}

export default function BookingsPage() {
  const { user } = useAuth()
  const [bookings,     setBookings]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [newBookingQr, setNewBookingQr] = useState(null)
  const [viewQrBooking, setViewQrBooking] = useState(null)

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF'
  const canCreateBooking = !isAdmin

  const load = () => {
    if (!user?.id) return
    setLoading(true)
    // Admins see all bookings; students only see their own
    const call = isAdmin
      ? bookingService.getAll()
      : bookingService.getByUser(user.id)

    call
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(err => {
        console.error(err)
        toast.error('Failed to load bookings')
        setBookings([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [user])

  const handleCreate = async (data) => {
    try {
      const res = await bookingService.create(data)
      toast.success('Booking submitted!')
      setShowModal(false)
      setNewBookingQr(res.data)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to create booking')
    }
  }

  const handleStatus = async (id, status) => {
    try {
      await bookingService.updateStatus(id, status)
      toast.success(`Booking ${status.toLowerCase()}`)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      await bookingService.updateStatus(id, 'CANCELLED')
      toast.success('Booking cancelled')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking')
    }
  }

  const displayed = filterStatus
    ? bookings.filter(b => b.status === filterStatus)
    : bookings

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Bookings</h1>
          <p>{isAdmin ? 'Manage all campus resource bookings' : 'Your resource booking requests'}</p>
        </div>
        {canCreateBooking && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Booking
          </button>
        )}
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['PENDING', 'APPROVED', 'CANCELLED', 'REJECTED', 'COMPLETED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b' }}>
          {displayed.length} booking{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : (
        <div className="card">
          {displayed.length === 0 ? (
            <div className="empty-state">
              <CalendarCheck size={48} />
              <h3>No bookings found</h3>
              <p>Click "New Booking" to reserve a resource.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Resource</th>
                    {isAdmin && <th>Requested By</th>}
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(b => (
                    <tr key={b.id}>
                      <td style={{ color: '#94a3b8' }}>#{b.id}</td>
                      <td style={{ fontWeight: 500 }}>{b.title}</td>
                      <td>{b.resource?.name}</td>
                      {isAdmin && <td>{b.user?.name}</td>}
                      <td>{format(new Date(b.startTime), 'MMM d, HH:mm')}</td>
                      <td>{format(new Date(b.endTime), 'MMM d, HH:mm')}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[b.status] || 'badge-gray'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => setViewQrBooking(b)} title="View QR">
                            <QrCode size={14} />
                          </button>
                          {/* Admin actions */}
                          {isAdmin && b.status === 'PENDING' && (
                            <>
                              <button className="btn btn-sm btn-success" onClick={() => handleStatus(b.id, 'APPROVED')}>Approve</button>
                              <button className="btn btn-sm btn-danger"  onClick={() => handleStatus(b.id, 'REJECTED')}>Reject</button>
                            </>
                          )}
                          {isAdmin && b.status === 'APPROVED' && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleStatus(b.id, 'CANCELLED')}>Cancel</button>
                          )}
                          {/* Student can cancel their own pending booking */}
                          {!isAdmin && b.status === 'PENDING' && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleCancel(b.id)}>Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && canCreateBooking && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>New Booking</h2>
            <BookingForm onSubmit={handleCreate} onCancel={() => setShowModal(false)} />
          </div>
        </div>
      )}

      {newBookingQr && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setNewBookingQr(null)}>
          <div className="modal" style={{ textAlign: 'center' }}>
            <h2>Booking Successful</h2>
            
            <div style={{ textAlign: 'left', background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'inline-block', minWidth: '280px', marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '8px' }}><strong>Title:</strong> {newBookingQr.title}</div>
              <div style={{ marginBottom: '8px' }}><strong>Resource:</strong> {newBookingQr.resource?.name}</div>
              <div><strong>Time:</strong> {format(new Date(newBookingQr.startTime), 'MMM d, HH:mm')} - {format(new Date(newBookingQr.endTime), 'HH:mm')}</div>
            </div>

            <p style={{ marginBottom: '1rem', color: '#64748b' }}>Your booking ID is #{newBookingQr.id}. Please keep this QR code for verification.</p>
            <div style={{ background: 'white', padding: '16px', display: 'block', margin: '0 auto 1.5rem', borderRadius: '8px', width: '200px' }}>
              <QRCodeSVG value={`Booking ID: #${newBookingQr.id}\nTitle: ${newBookingQr.title}\nResource: ${newBookingQr.resource?.name || 'N/A'}\nTime: ${format(new Date(newBookingQr.startTime), 'MMM d, yyyy HH:mm')} - ${format(new Date(newBookingQr.endTime), 'HH:mm')}`} size={200} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
            </div>
            <div>
              <button className="btn btn-primary" onClick={() => setNewBookingQr(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {viewQrBooking && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setViewQrBooking(null)}>
          <div className="modal" style={{ textAlign: 'center' }}>
            <h2>Booking #{viewQrBooking.id}</h2>

            <div style={{ textAlign: 'left', background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'inline-block', minWidth: '280px', marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '8px' }}><strong>Title:</strong> {viewQrBooking.title}</div>
              <div style={{ marginBottom: '8px' }}><strong>Resource:</strong> {viewQrBooking.resource?.name}</div>
              <div><strong>Time:</strong> {format(new Date(viewQrBooking.startTime), 'MMM d, HH:mm')} - {format(new Date(viewQrBooking.endTime), 'HH:mm')}</div>
            </div>
            
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', marginBottom: '1.5rem', width: '200px', display: 'block', margin: '0 auto 1.5rem' }}>
              <QRCodeSVG value={`Booking ID: #${viewQrBooking.id}\nTitle: ${viewQrBooking.title}\nResource: ${viewQrBooking.resource?.name || 'N/A'}\nTime: ${format(new Date(viewQrBooking.startTime), 'MMM d, yyyy HH:mm')} - ${format(new Date(viewQrBooking.endTime), 'HH:mm')}`} size={200} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
            </div>
            <div>
              <button className="btn btn-secondary" onClick={() => setViewQrBooking(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}