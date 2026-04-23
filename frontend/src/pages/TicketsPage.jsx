import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CircleAlert, Clock3, ImageUp, Plus, Search, Ticket, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ticketService from '../services/ticketService'

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']
const CATEGORIES = ['IT', 'FACILITIES', 'ACADEMIC', 'ADMIN', 'OTHER']
const STAFF_OPTIONS = [
  { email: 'admin@campus.edu', name: 'Admin Team', role: 'ADMIN' },
  { email: 'bob@campus.edu', name: 'Bob Perera', role: 'TECHNICIAN' },
  { email: 'tech@campus.edu', name: 'Tech Support', role: 'TECHNICIAN' },
]
const META_KEY = 'uniops_ticket_meta_v1'

const initialForm = {
  category: '',
  description: '',
  priority: '',
  contactPhone: '',
}

const labelize = (value) => value.replace('_', ' ')

const getPriorityBadge = (priority) => {
  if (priority === 'HIGH') return { cls: 'badge-red', label: 'High' }
  if (priority === 'MEDIUM') return { cls: 'badge-yellow', label: 'Medium' }
  return { cls: 'badge-green', label: 'Low' }
}

const getStatusBadge = (status) => {
  if (status === 'IN_PROGRESS') return { cls: 'badge-blue', label: 'In Progress' }
  if (status === 'RESOLVED') return { cls: 'badge-cyan', label: 'Resolved' }
  if (status === 'CLOSED') return { cls: 'badge-green', label: 'Closed' }
  if (status === 'REJECTED') return { cls: 'badge-red', label: 'Rejected' }
  return { cls: 'badge-purple', label: 'Open' }
}

const getAttachmentUrls = (ticket) => {
  const raw = ticket?.attachmentUrl || ''
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((path) => (path.startsWith('/uploads') ? `http://localhost:8081${path}` : path))
}

const formatDuration = (ms) => {
  if (ms == null || Number.isNaN(ms) || ms < 0) return 'N/A'
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes} min`
  return `${hours}h ${minutes}m`
}

const getTimerBadge = (ms, fastLimitMs, moderateLimitMs) => {
  if (ms == null) return 'badge-gray'
  if (ms <= fastLimitMs) return 'badge-green'
  if (ms <= moderateLimitMs) return 'badge-yellow'
  return 'badge-red'
}

export default function TicketsPage() {
  const { user } = useAuth()
  const role = user?.role || 'STUDENT'
  const isUser = role === 'STUDENT' || role === 'USER'
  const canManage = role === 'ADMIN' || role === 'STAFF'
  const canTechnician = role === 'TECHNICIAN' || role === 'STAFF' || role === 'ADMIN'
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [attachments, setAttachments] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [viewingTicketId, setViewingTicketId] = useState(null)
  const [editingTicketId, setEditingTicketId] = useState(null)
  const [ticketMeta, setTicketMeta] = useState({})
  const [statusDraft, setStatusDraft] = useState('OPEN')
  const [assignDraft, setAssignDraft] = useState('')
  const [resolutionDraft, setResolutionDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [nowMs, setNowMs] = useState(Date.now())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(META_KEY)
      setTicketMeta(raw ? JSON.parse(raw) : {})
    } catch {
      setTicketMeta({})
    }
  }, [])

  const saveMeta = (nextMeta) => {
    setTicketMeta(nextMeta)
    localStorage.setItem(META_KEY, JSON.stringify(nextMeta))
  }

  const updateTicketMeta = (ticketId, patch) => {
    const key = String(ticketId)
    const existing = ticketMeta[key] || { assignedStaff: '', resolutionNotes: '', comments: [] }
    const nextMeta = {
      ...ticketMeta,
      [key]: { ...existing, ...patch },
    }
    saveMeta(nextMeta)
  }

  const loadTickets = useCallback(() => {
    setLoading(true)
    ticketService
      .getAll({
        search: search || undefined,
        status: statusFilter || undefined,
      })
      .then((res) => setTickets(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false))
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(loadTickets, 250)
    return () => clearTimeout(t)
  }, [loadTickets])

  const allVisibleTickets = useMemo(() => {
    const withPriority = priorityFilter
      ? tickets.filter((ticket) => ticket.priority === priorityFilter)
      : tickets
    if (!isUser) return withPriority
    return withPriority.filter((ticket) => ticket.contactEmail === user?.email)
  }, [tickets, priorityFilter, isUser, user?.email])

  const viewingTicket = useMemo(
    () => allVisibleTickets.find((ticket) => ticket.id === viewingTicketId) || null,
    [allVisibleTickets, viewingTicketId],
  )

  const viewingMeta = viewingTicket ? ticketMeta[String(viewingTicket.id)] || { comments: [] } : { comments: [] }

  useEffect(() => {
    if (!viewingTicket) return
    setStatusDraft(viewingTicket.status || 'OPEN')
    setAssignDraft(viewingMeta.assignedStaff || '')
    setResolutionDraft(viewingMeta.resolutionNotes || '')
  }, [viewingTicketId, viewingTicket, viewingMeta.assignedStaff, viewingMeta.resolutionNotes])

  useEffect(() => {
    if (!viewingTicket) return undefined
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [viewingTicket])

  const dashboardStats = useMemo(() => {
    const total = allVisibleTickets.length
    const open = allVisibleTickets.filter((ticket) => ticket.status === 'OPEN').length
    const inProgress = allVisibleTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length
    const resolved = allVisibleTickets.filter((ticket) => ticket.status === 'RESOLVED').length
    return { total, open, inProgress, resolved }
  }, [allVisibleTickets])

  const validate = (state) => {
    const nextErrors = {}
    if (!state.category) nextErrors.category = 'Category is required'
    if (!state.description.trim()) nextErrors.description = 'Description is required'
    if (state.description.trim() && state.description.trim().length < 10) {
      nextErrors.description = 'Description must be at least 10 characters'
    }
    if (!state.priority) nextErrors.priority = 'Priority is required'
    if (!state.contactPhone.trim()) nextErrors.contactPhone = 'Contact number is required'
    if (state.contactPhone && !state.contactPhone.match(/^[0-9\s\-+()]+$/)) {
      nextErrors.contactPhone = 'Invalid phone format'
    }
    return nextErrors
  }

  const isValid = useMemo(() => Object.keys(validate(form)).length === 0, [form])

  const handleChange = (key, value) => {
    const next = { ...form, [key]: value }
    setForm(next)
    setErrors(validate(next))
  }

  const resetForm = () => {
    setForm(initialForm)
    setErrors({})
    setAttachments([])
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

  const handleCreate = async (e) => {
    e.preventDefault()
    const formErrors = validate(form)
    setErrors(formErrors)
    if (Object.keys(formErrors).length > 0) return
    setSubmitting(true)
    try {
      const payload = {
        title: `${form.category} request`,
        description: form.description.trim(),
        priority: form.priority,
        category: form.category,
        contactPhone: form.contactPhone.trim(),
        contactEmail: user?.email || '',
        status: 'OPEN',
        preferredContact: 'phone',
      }
      const created = await ticketService.create(payload)
      let createdTicket = created?.data
      if (attachments.length > 0 && createdTicket?.id) {
        const uploaded = await ticketService.uploadAttachments(createdTicket.id, attachments)
        createdTicket = uploaded?.data || createdTicket
      }
      if (createdTicket) {
        setTickets((prev) => [createdTicket, ...prev])
      }
      toast.success('Ticket submitted successfully')
      setShowCreate(false)
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (ticket) => {
    setEditingTicketId(ticket.id)
    setForm({
      category: ticket.category || '',
      description: ticket.description || '',
      priority: ticket.priority || '',
      contactPhone: ticket.contactPhone || '',
    })
    setErrors({})
    setAttachments([])
    setShowEdit(true)
  }

  const handleUpdateTicket = async (e) => {
    e.preventDefault()
    if (!editingTicketId) return
    const formErrors = validate(form)
    setErrors(formErrors)
    if (Object.keys(formErrors).length > 0) return
    setSubmitting(true)
    try {
      const ticketToUpdate = tickets.find((ticket) => ticket.id === editingTicketId)
      if (!ticketToUpdate) {
        toast.error('Ticket not found')
        return
      }
      const payload = {
        ...ticketToUpdate,
        title: `${form.category} request`,
        description: form.description.trim(),
        priority: form.priority,
        category: form.category,
        contactPhone: form.contactPhone.trim(),
      }
      const updated = await ticketService.update(editingTicketId, payload)
      if (updated?.data) {
        setTickets((prev) => prev.map((ticket) => (ticket.id === updated.data.id ? updated.data : ticket)))
      }
      toast.success('Ticket updated successfully')
      setShowEdit(false)
      setEditingTicketId(null)
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to update ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTicket = async (ticketId) => {
    const confirmed = window.confirm(`Delete ticket #${ticketId}?`)
    if (!confirmed) return
    try {
      await ticketService.delete(ticketId)
      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId))
      if (viewingTicketId === ticketId) setViewingTicketId(null)
      toast.success('Ticket deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete ticket')
    }
  }

  const applyStatus = async (statusValue) => {
    if (!viewingTicket) return
    try {
      const updated = await ticketService.update(viewingTicket.id, {
        ...viewingTicket,
        status: statusValue,
      })
      if (updated?.data) {
        setTickets((prev) => prev.map((ticket) => (ticket.id === updated.data.id ? updated.data : ticket)))
        setStatusDraft(statusValue)
      }
      toast.success(`Ticket moved to ${labelize(statusValue)}`)
    } catch {
      toast.error('Status update failed')
    }
  }

  const saveAssignment = () => {
    if (!viewingTicket) return
    updateTicketMeta(viewingTicket.id, { assignedStaff: assignDraft })
    toast.success('Technician assigned')
  }

  const saveResolution = () => {
    if (!viewingTicket) return
    updateTicketMeta(viewingTicket.id, { resolutionNotes: resolutionDraft })
    toast.success('Resolution notes saved')
  }

  const addComment = () => {
    if (!viewingTicket || !commentDraft.trim()) return
    const newComment = {
      id: Date.now(),
      text: commentDraft.trim(),
      authorEmail: user?.email || 'unknown@campus.edu',
      role: role,
      createdAt: new Date().toISOString(),
    }
    updateTicketMeta(viewingTicket.id, {
      comments: [...(viewingMeta.comments || []), newComment],
    })
    setCommentDraft('')
  }

  const beginEditComment = (comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.text)
  }

  const saveEditComment = () => {
    if (!viewingTicket || !editingCommentText.trim()) return
    const nextComments = (viewingMeta.comments || []).map((comment) =>
      comment.id === editingCommentId ? { ...comment, text: editingCommentText.trim() } : comment,
    )
    updateTicketMeta(viewingTicket.id, { comments: nextComments })
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const deleteComment = (commentId) => {
    if (!viewingTicket) return
    const nextComments = (viewingMeta.comments || []).filter((comment) => comment.id !== commentId)
    updateTicketMeta(viewingTicket.id, { comments: nextComments })
  }

  const canTransition = (current, next) => {
    const allowed = {
      OPEN: ['IN_PROGRESS', 'REJECTED'],
      IN_PROGRESS: ['RESOLVED', 'REJECTED'],
      RESOLVED: ['CLOSED', 'IN_PROGRESS'],
      CLOSED: [],
      REJECTED: [],
    }
    return (allowed[current] || []).includes(next)
  }

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Ticket Management</h1>
          <p>
            {isUser
              ? 'Create and track your support tickets.'
              : 'Monitor all tickets, assign technicians, and complete the workflow.'}
          </p>
        </div>
        {isUser && (
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm()
              setShowCreate(true)
            }}
          >
            <Plus size={15} /> Submit Ticket
          </button>
        )}
      </div>

      {!isUser && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Ticket size={16} /></div>
            <div className="stat-info"><div className="stat-value">{dashboardStats.total}</div><div className="stat-label">Total Tickets</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><Ticket size={16} /></div>
            <div className="stat-info"><div className="stat-value">{dashboardStats.open}</div><div className="stat-label">Open Tickets</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><Ticket size={16} /></div>
            <div className="stat-info"><div className="stat-value">{dashboardStats.inProgress}</div><div className="stat-label">In Progress</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Ticket size={16} /></div>
            <div className="stat-info"><div className="stat-value">{dashboardStats.resolved}</div><div className="stat-label">Resolved</div></div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="search-box">
            <Search size={14} />
            <input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{labelize(status)}</option>
            ))}
          </select>
          <select className="filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : allVisibleTickets.length === 0 ? (
        <div className="card empty-state">
          <Ticket size={42} />
          <h3>No tickets available</h3>
          <p>{isUser ? 'Create your first ticket from the Submit Ticket button.' : 'No tickets match your current filters.'}</p>
        </div>
      ) : (
        <div className="card table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                {!isUser && <th>Assigned Staff</th>}
                {isUser && <th>Created Date</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allVisibleTickets.map((ticket) => {
                const priority = getPriorityBadge(ticket.priority)
                const status = getStatusBadge(ticket.status)
                const meta = ticketMeta[String(ticket.id)] || {}
                return (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td>{ticket.category || 'General'}</td>
                    <td><span className={`badge ${priority.cls}`}>{priority.label}</span></td>
                    <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                    {!isUser && <td>{meta.assignedStaff || 'Unassigned'}</td>}
                    {isUser && <td>{new Date(ticket.createdAt).toLocaleString()}</td>}
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => setViewingTicketId(ticket.id)}>
                          {isUser ? 'View' : 'View / Update'}
                        </button>
                        {isUser && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(ticket)}>
                              Edit
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTicket(ticket.id)}>
                              Delete
                            </button>
                          </>
                        )}
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
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setViewingTicketId(null)}>
          <div className="modal" style={{ maxWidth: 1100 }}>
            <div className="ticket-detail-grid">
              <div>
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="page-header" style={{ marginBottom: 8 }}>
                    <h1 style={{ fontSize: 18, marginBottom: 2 }}>Ticket #{viewingTicket.id}</h1>
                    <p>{viewingTicket.category || 'General'} issue</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <span className={`badge ${getPriorityBadge(viewingTicket.priority).cls}`}>{getPriorityBadge(viewingTicket.priority).label}</span>
                    <span className={`badge ${getStatusBadge(viewingTicket.status).cls}`}>{getStatusBadge(viewingTicket.status).label}</span>
                  </div>
                  <p style={{ color: 'var(--text-2)' }}>{viewingTicket.description}</p>
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 3 }}>Created</div>
                      <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
                        {new Date(viewingTicket.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 3 }}>Contact Number</div>
                      <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{viewingTicket.contactPhone || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 12 }}>
                  <h3 className="card-heading">Images Preview</h3>
                  <div className="ticket-preview-grid">
                    {getAttachmentUrls(viewingTicket).length === 0 && (
                      <p style={{ color: 'var(--text-3)' }}>No images uploaded.</p>
                    )}
                    {getAttachmentUrls(viewingTicket).map((url, idx) => (
                      <div key={`${viewingTicket.id}-${idx}`} className="ticket-preview-card">
                        <img className="ticket-preview-image" src={url} alt={`ticket-${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 12 }}>
                  <h3 className="card-heading">Comments</h3>
                  <div className="comment-list">
                    {(viewingMeta.comments || []).length === 0 && (
                      <p style={{ color: 'var(--text-3)' }}>No comments yet.</p>
                    )}
                    {(viewingMeta.comments || []).map((comment) => {
                      const isOwn = comment.authorEmail === user?.email
                      const bubbleClass = isOwn ? 'comment-bubble own' : 'comment-bubble'
                      return (
                        <div key={comment.id} className={bubbleClass}>
                          <div className="comment-head">
                            <span>{comment.authorEmail}</span>
                            <span>{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                          {editingCommentId === comment.id ? (
                            <>
                              <textarea
                                className="form-control"
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                rows={2}
                              />
                              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingCommentId(null)}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={saveEditComment}>Save</button>
                              </div>
                            </>
                          ) : (
                            <p style={{ marginTop: 8 }}>{comment.text}</p>
                          )}
                          {isOwn && editingCommentId !== comment.id && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => beginEditComment(comment)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteComment(comment.id)}>Delete</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Add a comment..."
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                  />
                  <div style={{ marginTop: 10 }}>
                    <button className="btn btn-primary btn-sm" onClick={addComment}>Add Comment</button>
                  </div>
                </div>
              </div>

              <div>
                <div className="card" style={{ marginBottom: 12 }}>
                  <h3 className="card-heading">Workflow</h3>
                  <p style={{ color: 'var(--text-3)', fontSize: 12 }}>
                    User creates ticket (OPEN) → Admin assigns (IN_PROGRESS) → Technician fixes (RESOLVED) → Admin confirms (CLOSED)
                  </p>
                  <div className="workflow-strip">
                    {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((state) => (
                      <span key={state} className={`badge ${viewingTicket.status === state ? 'badge-blue' : 'badge-gray'}`}>{labelize(state)}</span>
                    ))}
                  </div>
                </div>

                {(canManage || canTechnician) && (
                  <div className="card" style={{ marginBottom: 12 }}>
                    <h3 className="card-heading">Ticket Details Actions</h3>
                    <div className="form-group">
                      <label>Status</label>
                      <select className="form-control" value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>{labelize(status)}</option>
                        ))}
                      </select>
                    </div>
                    {canManage && (
                      <>
                        <div className="form-group">
                          <label>Assign Technician</label>
                          <select className="form-control" value={assignDraft} onChange={(e) => setAssignDraft(e.target.value)}>
                            <option value="">Select technician</option>
                            {STAFF_OPTIONS.map((staff) => (
                              <option key={staff.email} value={staff.name}>{staff.name} ({staff.role})</option>
                            ))}
                          </select>
                        </div>
                        <button className="btn btn-secondary btn-sm" style={{ marginBottom: 10 }} onClick={saveAssignment}>Assign</button>
                      </>
                    )}
                    <div className="form-group">
                      <label>Resolution Notes</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={resolutionDraft}
                        onChange={(e) => setResolutionDraft(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => applyStatus(statusDraft)}>Update Status</button>
                      <button className="btn btn-success btn-sm" disabled={!canTransition(viewingTicket.status, 'RESOLVED')} onClick={() => applyStatus('RESOLVED')}>Mark Resolved</button>
                      <button className="btn btn-danger btn-sm" disabled={!canTransition(viewingTicket.status, 'REJECTED')} onClick={() => applyStatus('REJECTED')}>Reject Ticket</button>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <button className="btn btn-secondary btn-sm" onClick={saveResolution}>Save Notes</button>
                    </div>
                  </div>
                )}

                <div className="card">
                  <h3 className="card-heading"><Clock3 size={14} /> Response Timer</h3>
                  {(() => {
                    const createdMs = new Date(viewingTicket.createdAt).getTime()
                    const firstResponseMs =
                      viewingTicket.timeToFirstResponseMillis ??
                      (viewingTicket.firstResponseAt
                        ? new Date(viewingTicket.firstResponseAt).getTime() - createdMs
                        : null)
                    const resolutionMs =
                      viewingTicket.timeToResolutionMillis ??
                      (viewingTicket.resolvedAt
                        ? new Date(viewingTicket.resolvedAt).getTime() - createdMs
                        : null)
                    const liveFirstResponseMs = firstResponseMs ?? Math.max(0, nowMs - createdMs)
                    const liveResolutionMs = resolutionMs ?? Math.max(0, nowMs - createdMs)
                    const firstResponseBadge = getTimerBadge(liveFirstResponseMs, 30 * 60 * 1000, 60 * 60 * 1000)
                    const resolutionBadge = getTimerBadge(liveResolutionMs, 4 * 60 * 60 * 1000, 8 * 60 * 60 * 1000)
                    const showSlaWarning = firstResponseMs == null && liveFirstResponseMs > 60 * 60 * 1000
                    return (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-2)', fontSize: 13 }}>Time to First Response</span>
                          <span className={`badge ${firstResponseBadge}`}>
                            {firstResponseMs == null ? `Live: ${formatDuration(liveFirstResponseMs)}` : formatDuration(firstResponseMs)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-2)', fontSize: 13 }}>Time to Resolution</span>
                          <span className={`badge ${resolutionBadge}`}>
                            {resolutionMs == null ? `Live: ${formatDuration(liveResolutionMs)}` : formatDuration(resolutionMs)}
                          </span>
                        </div>
                        {showSlaWarning && (
                          <div className="badge badge-red" style={{ width: 'fit-content' }}>
                            SLA warning: first response exceeded 1 hour
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              {isUser && (
                <>
                  <button className="btn btn-secondary" onClick={() => openEditModal(viewingTicket)}>Edit Ticket</button>
                  <button className="btn btn-danger" onClick={() => handleDeleteTicket(viewingTicket.id)}>Delete Ticket</button>
                </>
              )}
              <button className="btn btn-secondary" onClick={() => setViewingTicketId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <h2>Create Ticket</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={form.category} onChange={(e) => handleChange('category', e.target.value)}>
                  <option value="">Select category</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && <p className="field-error">{errors.category}</p>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={4} value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
                {errors.description && <p className="field-error">{errors.description}</p>}
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-control" value={form.priority} onChange={(e) => handleChange('priority', e.target.value)}>
                    <option value="">Select priority</option>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                  {errors.priority && <p className="field-error">{errors.priority}</p>}
                </div>
                <div className="form-group">
                  <label>Contact Number</label>
                  <input className="form-control" value={form.contactPhone} onChange={(e) => handleChange('contactPhone', e.target.value)} />
                  {errors.contactPhone && <p className="field-error">{errors.contactPhone}</p>}
                </div>
              </div>

              <div className="form-group">
                <label>Upload Images (max 3)</label>
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
                    <span className="ticket-upload-icon"><ImageUp size={16} /></span>
                    <span style={{ display: 'block', fontWeight: 700, color: 'var(--text-2)' }}>Click to upload images</span>
                    <span style={{ fontSize: 12 }}>Maximum 3 files.</span>
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="ticket-preview-grid">
                    {attachments.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="ticket-preview-card">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="ticket-preview-image" />
                        <button type="button" className="ticket-preview-remove" onClick={() => removeAttachment(index)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
            <div style={{ display: 'flex', gap: 6, marginTop: 12, color: 'var(--text-3)', fontSize: 12 }}>
              <CircleAlert size={14} />
              Required fields: category, description, priority, contact number.
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowEdit(false)}>
          <div className="modal">
            <h2>Edit Ticket</h2>
            <form onSubmit={handleUpdateTicket}>
              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={form.category} onChange={(e) => handleChange('category', e.target.value)}>
                  <option value="">Select category</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && <p className="field-error">{errors.category}</p>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={4} value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
                {errors.description && <p className="field-error">{errors.description}</p>}
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-control" value={form.priority} onChange={(e) => handleChange('priority', e.target.value)}>
                    <option value="">Select priority</option>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                  {errors.priority && <p className="field-error">{errors.priority}</p>}
                </div>
                <div className="form-group">
                  <label>Contact Number</label>
                  <input className="form-control" value={form.contactPhone} onChange={(e) => handleChange('contactPhone', e.target.value)} />
                  {errors.contactPhone && <p className="field-error">{errors.contactPhone}</p>}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEdit(false)
                    setEditingTicketId(null)
                    resetForm()
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
                  {submitting ? 'Updating...' : 'Update Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
