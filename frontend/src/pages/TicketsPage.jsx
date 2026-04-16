import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CircleAlert, ImageUp, Plus, Search, Ticket, X } from 'lucide-react'
import ticketService from '../services/ticketService'

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']
const STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED']
const CATEGORIES = ['IT', 'FACILITIES', 'ACADEMIC', 'ADMIN', 'OTHER']

const initialForm = {
  title: '',
  description: '',
  priority: '',
  category: '',
  resourceLocation: '',
  contactEmail: '',
  contactPhone: '',
  preferredContact: 'email',
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [attachments, setAttachments] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [editingTicket, setEditingTicket] = useState(null)
  const [viewingTicket, setViewingTicket] = useState(null)

  const loadTickets = () => {
    setLoading(true)
    ticketService
      .getAll({ search: search || undefined, status: statusFilter || undefined })
      .then((res) => setTickets(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(loadTickets, 250)
    return () => clearTimeout(t)
  }, [search, statusFilter])

  const visibleTickets = useMemo(() => {
    if (!priorityFilter) return tickets
    return tickets.filter((ticket) => ticket.priority === priorityFilter)
  }, [tickets, priorityFilter])

  const validate = (state) => {
    const nextErrors = {}
    if (!state.title.trim()) nextErrors.title = 'Title is required'
    if (!state.description.trim()) nextErrors.description = 'Description is required'
    if (state.description.trim() && state.description.trim().length < 10) {
      nextErrors.description = 'Description must be at least 10 characters'
    }
    if (!state.priority) nextErrors.priority = 'Priority is required'
    if (!state.resourceLocation.trim()) nextErrors.resourceLocation = 'Resource/Location is required'
    if (!state.contactEmail.trim()) nextErrors.contactEmail = 'Contact email is required'
    if (state.contactEmail && !state.contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      nextErrors.contactEmail = 'Invalid email format'
    }
    if (!state.contactPhone.trim()) nextErrors.contactPhone = 'Contact phone is required'
    if (state.contactPhone && !state.contactPhone.match(/^[0-9\s\-\+\(\)]+$/)) {
      nextErrors.contactPhone = 'Invalid phone format'
    }
    return nextErrors
  }

  const isValid = useMemo(() => Object.keys(validate(form)).length === 0, [form])

  const resetForm = () => {
    setForm(initialForm)
    setErrors({})
    setAttachments([])
    setEditingTicket(null)
  }

  const handleChange = (key, value) => {
    const next = { ...form, [key]: value }
    setForm(next)
    setErrors(validate(next))
  }

  const handleFiles = (fileList) => {
    const selected = Array.from(fileList || [])
    if (selected.length === 0) return

    const nonImages = selected.filter((file) => !file.type.startsWith('image/'))
    if (nonImages.length > 0) {
      toast.error('Only image files are allowed')
      return
    }

    const next = [...attachments, ...selected]
    if (next.length > 3) {
      toast.error('You can upload up to 3 images only')
      return
    }
    setAttachments(next)
  }

  const removeAttachment = (indexToRemove) => {
    setAttachments(attachments.filter((_, index) => index !== indexToRemove))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formErrors = validate(form)
    setErrors(formErrors)
    if (Object.keys(formErrors).length > 0) return

    setSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        category: form.category || null,
        resourceLocation: form.resourceLocation.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        preferredContact: form.preferredContact,
        status: 'OPEN',
      }

      if (editingTicket?.id) {
        const updated = await ticketService.update(editingTicket.id, {
          ...payload,
          status: editingTicket.status || 'OPEN',
        })
        if (updated?.data) {
          setTickets((prev) => prev.map((ticket) => (ticket.id === updated.data.id ? updated.data : ticket)))
        }
        toast.success('Ticket updated')
        setShowModal(false)
        resetForm()
      } else {
        const created = await ticketService.create(payload)
        let createdTicket = created?.data

        if (attachments.length > 0 && created?.data?.id) {
          try {
            const uploaded = await ticketService.uploadAttachments(created.data.id, attachments)
            if (uploaded?.data) {
              createdTicket = uploaded.data
            }
          } catch {
            // Fallback to single-upload endpoint for compatibility.
            try {
              for (const file of attachments) {
                const uploaded = await ticketService.uploadAttachment(created.data.id, file)
                if (uploaded?.data) {
                  createdTicket = uploaded.data
                }
              }
            } catch {
              toast.error('Ticket created, but image upload failed')
            }
          }
        }

        if (createdTicket) {
          setTickets((prev) => [createdTicket, ...prev])
        }
        toast.success('Ticket created')
        setShowModal(false)
        resetForm()
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (ticket) => {
    setEditingTicket(ticket)
    setForm({
      title: ticket.title || '',
      description: ticket.description || '',
      priority: ticket.priority || '',
      category: ticket.category || '',
      resourceLocation: ticket.resourceLocation || '',
      contactEmail: ticket.contactEmail || '',
      contactPhone: ticket.contactPhone || '',
      preferredContact: ticket.preferredContact || 'email',
    })
    setErrors({})
    setAttachments([])
    setShowModal(true)
  }

  const handleDelete = async (ticket) => {
    if (!window.confirm(`Delete ticket #${ticket.id}?`)) return
    try {
      await ticketService.delete(ticket.id)
      setTickets((prev) => prev.filter((item) => item.id !== ticket.id))
      toast.success('Ticket deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete ticket')
    }
  }

  const getPriorityBadge = (priority) => {
    if (priority === 'HIGH') return { cls: 'badge-red', label: 'High', icon: '🔴' }
    if (priority === 'MEDIUM') return { cls: 'badge-yellow', label: 'Medium', icon: '🟡' }
    return { cls: 'badge-green', label: 'Low', icon: '🟢' }
  }

  const getStatusBadge = (status) => {
    if (status === 'IN_PROGRESS') return { cls: 'badge-blue', label: 'In Progress', progress: 60 }
    if (status === 'CLOSED') return { cls: 'badge-green', label: 'Closed', progress: 100 }
    return { cls: 'badge-purple', label: 'Open', progress: 20 }
  }

  const getAttachmentUrls = (ticket) => {
    const raw = ticket?.attachmentUrl || ''
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((path) => (path.startsWith('/uploads') ? `http://localhost:8081${path}` : path))
  }

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Support Tickets</h1>
          <p>Manage and track your tickets easily</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
        >
          <Plus size={15} /> Add New Ticket
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="search-box">
            <Search size={14} />
            <input
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((status) => (
              <option value={status} key={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((priority) => (
              <option value={priority} key={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : visibleTickets.length === 0 ? (
        <div className="card empty-state">
          <Ticket size={42} />
          <h3>No tickets available</h3>
          <p>Create a new ticket to get started.</p>
        </div>
      ) : (
        <div className="card table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTickets.map((ticket) => {
                const priority = getPriorityBadge(ticket.priority)
                const status = getStatusBadge(ticket.status)
                return (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td>{ticket.title}</td>
                    <td>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <span className={`badge ${status.cls}`}>{status.label}</span>
                        <div
                          style={{
                            width: '100%',
                            height: 5,
                            borderRadius: 999,
                            background: 'var(--bg-2)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${status.progress}%`,
                              height: '100%',
                              background: 'linear-gradient(135deg, var(--blue), var(--purple))',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${priority.cls}`}>
                        {priority.icon} {priority.label}
                      </span>
                    </td>
                    <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(ticket)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setViewingTicket(ticket)}>
                          View
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(ticket)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewingTicket && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setViewingTicket(null)}>
          <div className="modal" style={{ maxWidth: 1200, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                  {viewingTicket.category?.toUpperCase() || 'TICKET'} • #{viewingTicket.id}
                </div>
                <h1 style={{ margin: '0 0 12px 0', fontSize: 24 }}>{viewingTicket.title}</h1>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span className={`badge ${getStatusBadge(viewingTicket.status).cls}`}>
                    {getStatusBadge(viewingTicket.status).label}
                  </span>
                  <span className={`badge ${getPriorityBadge(viewingTicket.priority).cls}`}>
                    {getPriorityBadge(viewingTicket.priority).icon} {getPriorityBadge(viewingTicket.priority).label}
                  </span>
                </div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingTicket(null)} style={{ minWidth: 60 }}>
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Left Column */}
              <div>
                {/* Detailed Description */}
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Detailed Description</h3>
                  <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{viewingTicket.description}</p>
                </div>

                {/* Resource Location & Contact Details */}
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Location & Contact Information</h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {viewingTicket.resourceLocation && (
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Resource/Location</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{viewingTicket.resourceLocation}</div>
                      </div>
                    )}
                    {viewingTicket.contactEmail && (
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Contact Email</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
                          <a href={`mailto:${viewingTicket.contactEmail}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                            {viewingTicket.contactEmail}
                          </a>
                        </div>
                      </div>
                    )}
                    {viewingTicket.contactPhone && (
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Contact Phone</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
                          <a href={`tel:${viewingTicket.contactPhone}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                            {viewingTicket.contactPhone}
                          </a>
                        </div>
                      </div>
                    )}
                    {viewingTicket.preferredContact && (
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Preferred Contact Method</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', textTransform: 'capitalize' }}>{viewingTicket.preferredContact}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attachments */}
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600 }}>Attachments ({getAttachmentUrls(viewingTicket).length})</h3>
                  </div>
                  {getAttachmentUrls(viewingTicket).length === 0 ? (
                    <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No images uploaded for this ticket.</p>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
                        {getAttachmentUrls(viewingTicket).slice(0, 3).map((url, index) => (
                          <a key={`${viewingTicket.id}-asset-${index}`} href={url} target="_blank" rel="noreferrer">
                            <img
                              src={url}
                              alt={`ticket-${viewingTicket.id}-asset-${index + 1}`}
                              style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}
                            />
                          </a>
                        ))}
                      </div>
                      {getAttachmentUrls(viewingTicket).length > 3 && (
                        <a href="#" onClick={(e) => { e.preventDefault() }} style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>
                          VIEW ALL ASSETS
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Activity Log */}
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Activity Log</h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                        S
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Status updated to {getStatusBadge(viewingTicket.status).label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Today, {new Date(viewingTicket.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--green)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                        T
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Ticket Created</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date(viewingTicket.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Internal Communication */}
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Internal Communication</h3>
                  <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                    <div style={{ padding: 12, background: 'var(--bg-2)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--blue)', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>System</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Now</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>Ticket has been created and assigned.</p>
                    </div>
                  </div>
                  <textarea
                    placeholder="Add a resolution note or comment..."
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-1)',
                      color: 'var(--text-2)',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      marginBottom: 8,
                      resize: 'vertical',
                      minHeight: 60
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewingTicket(null)}>
                      Discard
                    </button>
                    <button type="button" className="btn btn-primary btn-sm">
                      Post Comment
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                {/* Management Control */}
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Management Control</h3>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>ASSIGNED TECHNICIAN</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg-2)', borderRadius: 6 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                        A
                      </div>
                      <select style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                        <option>Admin User</option>
                        <option>User 1</option>
                        <option>User 2</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>CHANGE STATUS</div>
                    <button type="button" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                      Mark as {viewingTicket.status === 'OPEN' ? 'In Progress' : 'In Progress'}
                    </button>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}>
                    ✓ Resolve Ticket
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                    ✕ Reject Ticket
                  </button>
                </div>

                {/* SLA Status */}
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>SLA Status</h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Response Deadline</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: viewingTicket.priority === 'HIGH' ? 'var(--red)' : 'var(--text-2)' }}>
                        {viewingTicket.priority === 'HIGH' ? 'Met (0.5h)' : 'Met (2h)'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Resolution Target</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: viewingTicket.priority === 'HIGH' ? 'var(--red)' : 'var(--text-2)' }}>
                        {viewingTicket.priority === 'HIGH' ? '2h 45m left' : '8h 30m left'}
                      </div>
                    </div>
                    <div>
                      <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'var(--bg-2)', overflow: 'hidden', marginTop: 8 }}>
                        <div
                          style={{
                            width: viewingTicket.priority === 'HIGH' ? '65%' : '40%',
                            height: '100%',
                            background: viewingTicket.priority === 'HIGH' ? 'var(--red)' : 'var(--blue)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Details</h3>
                  <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ color: 'var(--text-3)', marginBottom: 3 }}>Category</div>
                      <div style={{ fontWeight: 500 }}>{viewingTicket.category || 'Not specified'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-3)', marginBottom: 3 }}>Created</div>
                      <div style={{ fontWeight: 500 }}>{new Date(viewingTicket.createdAt).toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-3)', marginBottom: 3 }}>Ticket ID</div>
                      <div style={{ fontWeight: 500 }}>#{viewingTicket.id}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>{editingTicket ? 'Edit Ticket' : 'Create Ticket'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Enter issue title"
                />
                {errors.title && <p className="field-error">{errors.title}</p>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe your issue in detail"
                  rows={4}
                />
                {errors.description && <p className="field-error">{errors.description}</p>}
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    className="form-control"
                    value={form.priority}
                    onChange={(e) => handleChange('priority', e.target.value)}
                  >
                    <option value="">Select priority</option>
                    {PRIORITIES.map((priority) => (
                      <option value={priority} key={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                  {errors.priority && <p className="field-error">{errors.priority}</p>}
                </div>
                <div className="form-group">
                  <label>Category (optional)</label>
                  <select
                    className="form-control"
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((category) => (
                      <option value={category} key={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resource/Location and Contact Details */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Resource/Location</label>
                  <input
                    className="form-control"
                    value={form.resourceLocation}
                    onChange={(e) => handleChange('resourceLocation', e.target.value)}
                    placeholder="Enter resource or location details"
                  />
                  {errors.resourceLocation && <p className="field-error">{errors.resourceLocation}</p>}
                </div>
              </div>

              {/* Contact Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    placeholder="your@email.com"
                  />
                  {errors.contactEmail && <p className="field-error">{errors.contactEmail}</p>}
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={form.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors.contactPhone && <p className="field-error">{errors.contactPhone}</p>}
                </div>
              </div>

              {/* Preferred Contact */}
              <div className="form-group">
                <label>Preferred Contact Method</label>
                <select
                  className="form-control"
                  value={form.preferredContact}
                  onChange={(e) => handleChange('preferredContact', e.target.value)}
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="both">Both Email & Phone</option>
                </select>
              </div>

              {!editingTicket && (
                <div className="form-group">
                  <label>Attachment (optional)</label>
                  <div className="file-upload-area ticket-upload-area">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        handleFiles(e.target.files)
                        e.target.value = ''
                      }}
                      id="ticketAttachmentInput"
                    />
                    <label htmlFor="ticketAttachmentInput">
                      <span className="ticket-upload-icon">
                        <ImageUp size={16} />
                      </span>
                      <span style={{ display: 'block', fontWeight: 700, color: 'var(--text-2)' }}>
                        Drag and drop images here
                      </span>
                      <span style={{ fontSize: 12 }}>
                        Or click to browse from your device (Max 3 files, PNG/JPG)
                      </span>
                    </label>
                  </div>
                  {attachments.length > 0 && (
                    <div className="ticket-preview-grid">
                      {attachments.map((file, index) => (
                        <div className="ticket-preview-card" key={`${file.name}-${index}`}>
                          <img src={URL.createObjectURL(file)} alt={file.name} className="ticket-preview-image" />
                          <button
                            type="button"
                            className="ticket-preview-remove"
                            onClick={() => removeAttachment(index)}
                            title="Remove image"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
                  {submitting ? 'Saving...' : editingTicket ? 'Update' : 'Submit'}
                </button>
              </div>
            </form>
            <div style={{ display: 'flex', gap: 6, marginTop: 12, color: 'var(--text-3)', fontSize: 12 }}>
              <CircleAlert size={14} />
              Required fields: title, description, and priority
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
