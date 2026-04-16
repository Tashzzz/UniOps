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
          <div className="modal" style={{ maxWidth: 840 }}>
            <h2>{viewingTicket.title}</h2>
            <div className="card" style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>Detailed Description</div>
                  <p style={{ color: 'var(--text-2)' }}>{viewingTicket.description}</p>
                </div>
                <div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div><strong>Status:</strong> {getStatusBadge(viewingTicket.status).label}</div>
                    <div><strong>Priority:</strong> {getPriorityBadge(viewingTicket.priority).label}</div>
                    <div><strong>Category:</strong> {viewingTicket.category || '-'}</div>
                    <div><strong>Created:</strong> {new Date(viewingTicket.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>Attachments</div>
              {getAttachmentUrls(viewingTicket).length === 0 ? (
                <p style={{ color: 'var(--text-3)' }}>No images uploaded for this ticket.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                  {getAttachmentUrls(viewingTicket).map((url, index) => (
                    <a key={`${viewingTicket.id}-full-asset-${index}`} href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url}
                        alt={`ticket-${viewingTicket.id}-asset-${index + 1}`}
                        style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setViewingTicket(null)}>
                Close
              </button>
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
