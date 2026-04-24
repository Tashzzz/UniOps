import React, { useEffect, useMemo, useState } from 'react'
import resourceService from '../services/resourceService'
import { useAuth } from '../context/AuthContext'

export default function BookingForm({ onSubmit, onCancel }) {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [resourceQuery, setResourceQuery] = useState('')
  const [resourceMenuOpen, setResourceMenuOpen] = useState(false)
  const [form, setForm] = useState({
    resourceId: '', title: '', startTime: '', endTime: '', notes: '',
  })

  useEffect(() => {
    resourceService.getAll()
      .then(r => setResources(Array.isArray(r.data) ? r.data : []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const formatResourceLabel = (resource) => (
    `${resource.name} (${String(resource.type).replace('_', ' ')}) - ${resource.location} - Cap. ${resource.capacity}`
  )

  const bookableResources = useMemo(() => {
    const allowedStatuses = new Set(['ACTIVE', 'AVAILABLE'])
    const search = resourceQuery.trim().toLowerCase()

    return resources
      .filter(resource => allowedStatuses.has(resource.status))
      .filter(resource => {
        if (!search) return true
        return [resource.name, resource.location, resource.type, resource.description, resource.status]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(search))
      })
      .sort((left, right) => (left.name || '').localeCompare(right.name || ''))
  }, [resources, resourceQuery])

  const selectedResource = useMemo(
    () => bookableResources.find(resource => String(resource.id) === String(form.resourceId)),
    [bookableResources, form.resourceId]
  )

  const resourceOptions = resourceMenuOpen
    ? bookableResources
    : []

  const handleResourceChange = (value) => {
    set('resourceId', value)
    const nextResource = bookableResources.find(resource => String(resource.id) === String(value))
    setResourceQuery(nextResource ? formatResourceLabel(nextResource) : '')
    setResourceMenuOpen(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const payload = {
      ...form,
      resourceId: Number(form.resourceId),
      userId: user.id,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
    }

    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Resource *</label>
        <div className="resource-combobox">
          <input
            className="form-control"
            required
            value={resourceMenuOpen ? resourceQuery : (selectedResource ? formatResourceLabel(selectedResource) : resourceQuery)}
            onFocus={() => setResourceMenuOpen(true)}
            onChange={e => {
              setResourceQuery(e.target.value)
              set('resourceId', '')
              setResourceMenuOpen(true)
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setResourceMenuOpen(false)
              }
            }}
            placeholder="Search by name, location, type, or status"
            aria-autocomplete="list"
            aria-expanded={resourceMenuOpen}
            autoComplete="off"
          />
          {resourceMenuOpen && (
            <div className="resource-combobox-menu">
              {resourceOptions.length === 0 ? (
                <div className="resource-combobox-empty">No matching resources</div>
              ) : (
                resourceOptions.map(resource => (
                  <button
                    key={resource.id}
                    type="button"
                    className="resource-combobox-option"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleResourceChange(resource.id)
                    }}
                  >
                    <span className="resource-combobox-option-title">{resource.name}</span>
                    <span className="resource-combobox-option-meta">
                      {String(resource.type).replace('_', ' ')} · {resource.location} · Cap. {resource.capacity} · {resource.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <div className="form-group">
        <label>Booking Title *</label>
        <input className="form-control" required value={form.title}
          onChange={e => set('title', e.target.value)} placeholder="e.g. Group Project Meeting" />
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Start Time *</label>
          <input className="form-control" type="datetime-local" required value={form.startTime}
            onChange={e => set('startTime', e.target.value)} />
        </div>
        <div className="form-group">
          <label>End Time *</label>
          <input className="form-control" type="datetime-local" required value={form.endTime}
            onChange={e => set('endTime', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Notes</label>
        <textarea className="form-control" rows={2} value={form.notes}
          onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Submit Booking</button>
      </div>
    </form>
  )
}