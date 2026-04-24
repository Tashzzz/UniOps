import React, { useEffect, useMemo, useState } from 'react'
import resourceService from '../services/resourceService'
import { useAuth } from '../context/AuthContext'

export default function BookingForm({ onSubmit, onCancel, initialResourceId = '' }) {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [resourceQuery, setResourceQuery] = useState('')
  const [resourceMenuOpen, setResourceMenuOpen] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState({
    resourceId: initialResourceId ? String(initialResourceId) : '', title: '', startTime: '', endTime: '', notes: '',
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

  useEffect(() => {
    if (!initialResourceId) return
    setForm(current => ({ ...current, resourceId: String(initialResourceId) }))
  }, [initialResourceId])

  const selectedResource = useMemo(
    () => bookableResources.find(resource => String(resource.id) === String(form.resourceId)),
    [bookableResources, form.resourceId]
  )

  const DAY_INDEX = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  }

  const toMinutes = (timeValue) => {
    if (!timeValue) return null
    const [hour, minute] = String(timeValue).split(':').map(Number)
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null
    return (hour * 60) + minute
  }

  const isDayAllowed = (dayValue, selectedDay) => {
    if (!dayValue || dayValue === 'ALL_DAYS') return true
    if (dayValue === 'WEEKDAYS') return selectedDay >= 1 && selectedDay <= 5
    if (dayValue === 'WEEKENDS') return selectedDay === 0 || selectedDay === 6
    return DAY_INDEX[dayValue] === selectedDay
  }

  const validateAgainstAvailability = () => {
    if (!selectedResource || !form.startTime || !form.endTime) return null

    const startDate = new Date(form.startTime)
    const endDate = new Date(form.endTime)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null

    if (!isDayAllowed(selectedResource.availableDays, startDate.getDay())) {
      return `Selected resource is available on ${String(selectedResource.availableDays || 'ALL_DAYS').replace(/_/g, ' ')} only.`
    }

    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
    const fromMinutes = toMinutes(selectedResource.availableFrom)
    const toWindowMinutes = toMinutes(selectedResource.availableTo)

    if (fromMinutes != null && startMinutes < fromMinutes) {
      return `Start time must be within availability window (${String(selectedResource.availableFrom).slice(0, 5)} - ${String(selectedResource.availableTo || '--:--').slice(0, 5)}).`
    }
    if (toWindowMinutes != null && endMinutes > toWindowMinutes) {
      return `End time must be within availability window (${String(selectedResource.availableFrom || '--:--').slice(0, 5)} - ${String(selectedResource.availableTo).slice(0, 5)}).`
    }
    return null
  }

  const resourceOptions = resourceMenuOpen
    ? bookableResources
    : []

  const handleResourceChange = (value) => {
    set('resourceId', value)
    const nextResource = bookableResources.find(resource => String(resource.id) === String(value))
    setResourceQuery(nextResource ? formatResourceLabel(nextResource) : '')
    setResourceMenuOpen(false)
  }

  useEffect(() => {
    if (!form.resourceId) return
    const selected = resources.find(resource => String(resource.id) === String(form.resourceId))
    if (selected) {
      setResourceQuery(formatResourceLabel(selected))
    }
  }, [form.resourceId, resources])

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitError('')

    const availabilityError = validateAgainstAvailability()
    if (availabilityError) {
      setSubmitError(availabilityError)
      return
    }

    const payload = {
      ...form,
      resourceId: Number(form.resourceId),
      userId: user.id,
      // Keep local datetime-local values to avoid UTC timezone shifts.
      startTime: form.startTime,
      endTime: form.endTime,
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
      {selectedResource && (selectedResource.availableFrom || selectedResource.availableTo) && (
        <p className="field-error" style={{ color: 'var(--text-3)', marginTop: -6, marginBottom: 12 }}>
          Availability: {(selectedResource.availableDays || 'ALL_DAYS').replace(/_/g, ' ')}{' '}
          {selectedResource.availableFrom ? String(selectedResource.availableFrom).slice(0, 5) : '--:--'} -{' '}
          {selectedResource.availableTo ? String(selectedResource.availableTo).slice(0, 5) : '--:--'}
        </p>
      )}
      <div className="form-group">
        <label>Notes</label>
        <textarea className="form-control" rows={2} value={form.notes}
          onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
      </div>
      {submitError && (
        <p className="field-error" style={{ marginTop: -4, marginBottom: 10 }}>
          {submitError}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Submit Booking</button>
      </div>
    </form>
  )
}