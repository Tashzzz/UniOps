import React from 'react'
import { BarChart3, Building2, Clock3 } from 'lucide-react'

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

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-heading">
        <BarChart3 size={16} /> Resource Usage Analytics ({days} days)
      </div>

      <div className="resource-analytics-grid">
        <div>
          <h4 className="resource-analytics-title"><Building2 size={14} /> Top Resources</h4>
          {!topResources.length ? (
            <p className="resource-analytics-empty">No approved booking data yet.</p>
          ) : (
            <div className="resource-analytics-list">
              {topResources.map((item, index) => (
                <div className="resource-analytics-item" key={`${item.resourceId}-${index}`}>
                  <div>
                    <div className="resource-analytics-item-title">{item.resourceName}</div>
                    <div className="resource-analytics-item-sub">{item.resourceType} • {item.location}</div>
                  </div>
                  <div className="resource-analytics-item-stats">
                    <span>{item.totalBookings} bookings</span>
                    <span>{Number(item.totalBookedHours || 0).toFixed(1)} hrs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="resource-analytics-title"><Clock3 size={14} /> Peak Booking Hours</h4>
          {!peakHours.length ? (
            <p className="resource-analytics-empty">No hourly pattern data yet.</p>
          ) : (
            <div className="resource-analytics-list">
              {peakHours.map((item, index) => (
                <div className="resource-analytics-item" key={`${item.hourOfDay}-${index}`}>
                  <div className="resource-analytics-item-title">{formatHour(item.hourOfDay)}</div>
                  <div className="resource-analytics-item-stats">
                    <span>{item.bookings} bookings</span>
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
