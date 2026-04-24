import React from 'react'
import { BarChart3, Building2, Clock3, Trophy, Activity } from 'lucide-react'

const formatHour = (hour) => {
  const normalized = Number(hour)
  if (Number.isNaN(normalized)) return '-'
  const h12 = normalized % 12 || 12
  const suffix = normalized >= 12 ? 'PM' : 'AM'
  return `${h12}:00 ${suffix}`
}

export default function ResourceAnalyticsPanel({ analytics, days }) {
  const topResources = analytics?.topResources || []
  const peakHours = analytics?.peakBookingHours || []
  const maxBookings = Math.max(1, ...topResources.map((item) => Number(item.totalBookings || 0)))
  const maxPeakHour = Math.max(1, ...peakHours.map((item) => Number(item.bookings || 0)))
  const totalBookings = topResources.reduce((sum, item) => sum + Number(item.totalBookings || 0), 0)
  const totalHours = topResources.reduce((sum, item) => sum + Number(item.totalBookedHours || 0), 0)
  const mostUsed = topResources[0]
  const averageDuration = totalBookings > 0 ? totalHours / totalBookings : 0

  const getDemandLabel = (bookings, max) => {
    const ratio = max === 0 ? 0 : bookings / max
    if (ratio >= 0.75) return { text: 'High demand', cls: 'resource-demand-high' }
    if (ratio >= 0.4) return { text: 'Medium demand', cls: 'resource-demand-medium' }
    return { text: 'Low demand', cls: 'resource-demand-low' }
  }

  return (
    <section className="card resource-analytics-card" style={{ marginBottom: 18 }}>
      <div className="resource-analytics-head">
        <div>
          <div className="card-heading" style={{ marginBottom: 4 }}>
            <BarChart3 size={16} /> Resource Usage Analytics
          </div>
          <p className="resource-analytics-subhead">Performance snapshot for the last {days} days</p>
        </div>
        <div className="resource-analytics-mini-stats">
          <div className="resource-analytics-mini-stat">
            <span>Total Bookings</span>
            <strong>{totalBookings}</strong>
          </div>
          <div className="resource-analytics-mini-stat">
            <span>Total Hours</span>
            <strong>{totalHours.toFixed(1)}h</strong>
          </div>
          <div className="resource-analytics-mini-stat">
            <span>Avg / Booking</span>
            <strong>{averageDuration.toFixed(1)}h</strong>
          </div>
          <div className="resource-analytics-mini-stat">
            <span>Top Resource</span>
            <strong>{mostUsed?.resourceName || '-'}</strong>
          </div>
        </div>
      </div>

      <div className="resource-analytics-grid">
        <div>
          <h4 className="resource-analytics-title"><Trophy size={14} /> Top Resources</h4>
          {!topResources.length ? (
            <p className="resource-analytics-empty">No approved booking data yet.</p>
          ) : (
            <div className="resource-analytics-list">
              {topResources.map((item, index) => (
                <div className="resource-analytics-item" key={`${item.resourceId}-${index}`}>
                  <div className="resource-rank-badge">#{index + 1}</div>
                  <div className="resource-analytics-item-left">
                    <div className="resource-analytics-item-title">{item.resourceName}</div>
                    <div className="resource-analytics-item-sub">{item.resourceType} • {item.location}</div>
                    <div className="resource-analytics-bar-track">
                      <div
                        className="resource-analytics-bar-fill"
                        style={{ width: `${Math.max(6, (Number(item.totalBookings || 0) / maxBookings) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="resource-analytics-item-stats">
                    <span>{item.totalBookings} bookings</span>
                    <span>{Number(item.totalBookedHours || 0).toFixed(1)} hrs</span>
                    <span className={`resource-demand-chip ${getDemandLabel(Number(item.totalBookings || 0), maxBookings).cls}`}>
                      {getDemandLabel(Number(item.totalBookings || 0), maxBookings).text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="resource-analytics-title"><Activity size={14} /> Peak Booking Hours</h4>
          {!peakHours.length ? (
            <p className="resource-analytics-empty">No hourly pattern data yet.</p>
          ) : (
            <div className="resource-analytics-list">
              {peakHours.map((item, index) => (
                <div className="resource-analytics-item" key={`${item.hourOfDay}-${index}`}>
                  <div className="resource-rank-badge">{index + 1}</div>
                  <div className="resource-analytics-item-left">
                    <div className="resource-analytics-item-title">{formatHour(item.hourOfDay)}</div>
                    <div className="resource-analytics-bar-track">
                      <div
                        className="resource-analytics-bar-fill resource-analytics-bar-fill-hour"
                        style={{ width: `${Math.max(6, (Number(item.bookings || 0) / maxPeakHour) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="resource-analytics-item-stats">
                    <span>{item.bookings} bookings</span>
                    <span className={`resource-demand-chip ${getDemandLabel(Number(item.bookings || 0), maxPeakHour).cls}`}>
                      {getDemandLabel(Number(item.bookings || 0), maxPeakHour).text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
