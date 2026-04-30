import React, { useState } from 'react'
import { resolveMediaUrl } from '../services/api'

const TYPES = ['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'SPORTS', 'STUDY_ROOM', 'AUDITORIUM', 'OTHER']
const STATUSES = ['ACTIVE', 'OUT_OF_SERVICE']
const AVAILABLE_DAYS = ['ALL_DAYS', 'WEEKDAYS', 'WEEKENDS', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export default function ResourceForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '', type: 'LECTURE_HALL', location: '',
    capacity: 10, status: 'ACTIVE', description: '',
    availableFrom: '', availableTo: '', availableDays: 'ALL_DAYS',
    ...(initial ? { ...initial, status: initial.status === 'AVAILABLE' ? 'ACTIVE' : initial.status } : {}),
  })
  const [imageFile, setImageFile] = useState(null)
  const [submitError, setSubmitError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const imagePreview = imageFile
    ? URL.createObjectURL(imageFile)
    : resolveMediaUrl(form.imageUrl)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitError('')

    const trimmedName = String(form.name || '').trim()
    const trimmedLocation = String(form.location || '').trim()
    const numericCapacity = Number(form.capacity)
    const hasFrom = Boolean(form.availableFrom)
    const hasTo = Boolean(form.availableTo)

    if (!trimmedName) {
      setSubmitError('Resource name is required.')
      return
    }
    if (!trimmedLocation) {
      setSubmitError('Resource location is required.')
      return
    }
    if (trimmedName.length > 120) {
      setSubmitError('Resource name must be 120 characters or fewer.')
      return
    }
    if (trimmedLocation.length > 180) {
      setSubmitError('Resource location must be 180 characters or fewer.')
      return
    }
    if ((form.description || '').length > 1000) {
      setSubmitError('Description must be 1000 characters or fewer.')
      return
    }
    if (!Number.isInteger(numericCapacity) || numericCapacity < 1 || numericCapacity > 10000) {
      setSubmitError('Capacity must be a whole number between 1 and 10000.')
      return
    }
    if (hasFrom !== hasTo) {
      setSubmitError('Please provide both Available From and Available To.')
      return
    }
    if (hasFrom && hasTo && form.availableFrom >= form.availableTo) {
      setSubmitError('Available From must be earlier than Available To.')
      return
    }
    if (imageFile) {
      if (!String(imageFile.type || '').startsWith('image/')) {
        setSubmitError('Selected file must be an image.')
        return
      }
      if (imageFile.size > 5 * 1024 * 1024) {
        setSubmitError('Image size must be 5MB or less.')
        return
      }
    }

    onSubmit(
      {
        ...form,
        name: trimmedName,
        location: trimmedLocation,
        description: String(form.description || '').trim(),
        capacity: numericCapacity,
      },
      imageFile,
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Resource Name *</label>
          <input className="form-control" required value={form.name}
            onChange={e => set('name', e.target.value)} placeholder="e.g. Lecture Hall A" maxLength={120} />
        </div>
        <div className="form-group">
          <label>Type *</label>
          <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPES.map(t => <option key={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Location *</label>
          <input className="form-control" required value={form.location}
            onChange={e => set('location', e.target.value)} placeholder="e.g. Block A, Ground Floor" maxLength={180} />
        </div>
        <div className="form-group">
          <label>Capacity *</label>
          <input className="form-control" type="number" required min={1} value={form.capacity}
            onChange={e => set('capacity', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Available From</label>
          <input className="form-control" type="time" value={form.availableFrom || ''}
            onChange={e => set('availableFrom', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Available To</label>
          <input className="form-control" type="time" value={form.availableTo || ''}
            onChange={e => set('availableTo', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Available Days</label>
          <select className="form-control" value={form.availableDays || 'ALL_DAYS'} onChange={e => set('availableDays', e.target.value)}>
            {AVAILABLE_DAYS.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea className="form-control" rows={3} value={form.description}
          onChange={e => set('description', e.target.value)} placeholder="Optional description..." maxLength={1000} />
      </div>
      <div className="form-group">
        <label>Resource Photo</label>
        <div className="file-upload-area">
          <label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setImageFile(e.target.files?.[0] || null)}
            />
            Click to select an image (JPG/PNG)
          </label>
        </div>
        {imagePreview && (
          <div className="resource-image-preview-wrap">
            <img src={imagePreview} alt="Resource preview" className="resource-image-preview" />
          </div>
        )}
      </div>
      {submitError && (
        <p className="field-error" style={{ marginTop: -6, marginBottom: 10 }}>
          {submitError}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Update Resource' : 'Create Resource'}
        </button>
      </div>
    </form>
  )
}