import React from 'react'
import { Building2, MapPin, Users, Pencil, Trash2, Clock3, CircleDot } from 'lucide-react'
import { resolveMediaUrl } from '../services/api'

const statusBadge = {
  ACTIVE:      'badge-green',
  OUT_OF_SERVICE: 'badge-red',
  AVAILABLE:   'badge-green',
  OCCUPIED:    'badge-yellow',
  MAINTENANCE: 'badge-orange',
  RETIRED:     'badge-gray',
}

const DAY_INDEX = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
}

const isWithinTimeRange = (now, availableFrom, availableTo) => {
  if (!availableFrom || !availableTo) return true
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const [fromHour, fromMinute] = String(availableFrom).split(':').map(Number)
  const [toHour, toMinute] = String(availableTo).split(':').map(Number)
  const fromMinutes = fromHour * 60 + fromMinute
  const toMinutes = toHour * 60 + toMinute
  return nowMinutes >= fromMinutes && nowMinutes < toMinutes
}

const isWithinDayRule = (now, availableDays) => {
  if (!availableDays || availableDays === 'ALL_DAYS') return true
  const day = now.getDay()
  if (availableDays === 'WEEKDAYS') return day >= 1 && day <= 5
  if (availableDays === 'WEEKENDS') return day === 0 || day === 6
  return DAY_INDEX[availableDays] === day
}

const isResourceOpenNow = (resource) => {
  if (resource.status !== 'ACTIVE' && resource.status !== 'AVAILABLE') return false
  const now = new Date()
  return isWithinDayRule(now, resource.availableDays) && isWithinTimeRange(now, resource.availableFrom, resource.availableTo)
}

const formatStatus = (status) => (status === 'AVAILABLE' ? 'ACTIVE' : status)

const toLabel = (value = '') => value.replace(/_/g, ' ')

const getAvailabilityState = (resource) => {
  if (resource.status === 'OUT_OF_SERVICE') {
    return {
      label: 'Out of Service',
      tone: 'out',
      reason: 'Temporarily unavailable for booking',
    }
  }
  if (resource.status === 'MAINTENANCE') {
    return {
      label: 'Maintenance',
      tone: 'maint',
      reason: 'Under maintenance work',
    }
  }
  if (isResourceOpenNow(resource)) {
    return {
      label: 'Open Now',
      tone: 'open',
      reason: resource.availableFrom && resource.availableTo
        ? `Open until ${String(resource.availableTo).slice(0, 5)}`
        : 'Currently accepting bookings',
    }
  }
  return {
    label: 'Currently Closed',
    tone: 'closed',
    reason: resource.availableFrom && resource.availableTo
      ? `Opens ${String(resource.availableFrom).slice(0, 5)} on ${toLabel(resource.availableDays || 'ALL_DAYS')}`
      : 'Outside availability window',
  }
}

export default function ResourceList({ resources, onEdit, onDelete, onBook, canManage, canBook }) {
  if (!resources.length) {
    return (
      <div className="empty-state">
        <Building2 size={44} />
        <h3>No resources found</h3>
        <p>Add your first campus resource to get started.</p>
      </div>
    )
  }

  return (
    <div className="resource-grid">
      {resources.map(r => (
        <div className={`resource-card resource-card-${getAvailabilityState(r).tone}`} key={r.id}>
          <div className="resource-card-strip">
            <span className={`resource-availability-pill resource-availability-pill-${getAvailabilityState(r).tone}`}>
              <CircleDot size={11} /> {getAvailabilityState(r).label}
            </span>
          </div>
          <div className="resource-card-img">
            {r.imageUrl ? (
              <img src={resolveMediaUrl(r.imageUrl)} alt={r.name} className="resource-card-img-photo" />
            ) : (
              <Building2 size={40} />
            )}
          </div>
          <div className="resource-card-body">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div>
                <div className="resource-card-title">{r.name}</div>
                <div className="resource-card-subtitle">{toLabel(r.type)}</div>
              </div>
              <span className={`badge ${statusBadge[formatStatus(r.status)]||'badge-gray'}`}>{formatStatus(r.status)}</span>
            </div>
            <div className="resource-card-meta">
              <div><MapPin size={11}/> {r.location}</div>
              <div><Users size={11}/> Capacity: {r.capacity}</div>
              <div className={`resource-open-state resource-open-state-${getAvailabilityState(r).tone}`}>
                <Clock3 size={11} /> {getAvailabilityState(r).reason}
              </div>
              {(r.availableFrom && r.availableTo) && (
                <div>{toLabel(r.availableDays || 'ALL_DAYS')} {r.availableFrom.slice(0,5)} - {r.availableTo.slice(0,5)}</div>
              )}
            </div>
            {r.description && (
              <p style={{ fontSize:12, color:'var(--text-3)', marginTop:8, lineHeight:1.5 }}>
                {r.description.length > 80 ? r.description.slice(0,80)+'…' : r.description}
              </p>
            )}
            <div className="resource-card-footer">
              <span className="type-chip">{r.type.replace('_',' ')}</span>
              <div style={{ display:'flex', gap:6 }}>
                {canBook && (
                  <button className="btn btn-sm btn-primary" onClick={() => onBook?.(r)}>Book</button>
                )}
                {canManage && (
                  <>
                  <button className="btn btn-sm btn-secondary btn-icon" onClick={()=>onEdit(r)}><Pencil size={12}/></button>
                  <button className="btn btn-sm btn-danger   btn-icon" onClick={()=>onDelete(r.id)}><Trash2 size={12}/></button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}