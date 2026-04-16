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
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [attachments, setAttachments] = useState([])
  const [submitting, setSubmitting] = useState(false)

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
      const created = await ticketService.create({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        category: form.category || null,
      })

      if (attachments.length > 0 && created?.data?.id) {
        await ticketService.uploadAttachments(created.data.id, attachments)
      }

      toast.success('Ticket created')
      setShowModal(false)
      resetForm()
      loadTickets()
    } catch (err) {
      toast.error(err.message || 'Failed to create ticket')
    } finally {
      setSubmitting(false)
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
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : tickets.length === 0 ? (
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
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>Create Ticket</h2>
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
                  {submitting ? 'Submitting...' : 'Submit'}
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
