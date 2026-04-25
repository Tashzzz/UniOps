import React from 'react'
import { BarChart3 } from 'lucide-react'

const formatHour = (hour) => {
  const normalized = Number(hour)
  if (Number.isNaN(normalized)) return '-'
  const h12 = normalized % 12 || 12
  const suffix = normalized >= 12 ? 'PM' : 'AM'
  return `${h12}:00 ${suffix}`
}

export default function ResourceAnalyticsPanel({ analytics, days }) {
  const topResources = (analytics?.topResources || [])
    .slice()
    .sort((a, b) => Number(b.totalBookings || 0) - Number(a.totalBookings || 0))
  const peakHours = analytics?.peakBookingHours || []
  const totalBookings = topResources.reduce((sum, item) => sum + Number(item.totalBookings || 0), 0)
  const totalHours = topResources.reduce((sum, item) => sum + Number(item.totalBookedHours || 0), 0)
  const mostUsed = topResources[0]
  const averageDuration = totalBookings > 0 ? totalHours / totalBookings : 0
  const maxResourceBookings = Math.max(1, ...topResources.map((item) => Number(item.totalBookings || 0)))
  const maxHourBookings = Math.max(1, ...peakHours.map((item) => Number(item.bookings || 0)))

  return (
    <section className="card resource-analytics-simple" style={{ marginBottom: 18 }}>
      <div className="resource-analytics-head">
        <div className="resource-analytics-heading">
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
        <div className="resource-analytics-block">
          <div className="resource-analytics-title-row">
            <h4 className="resource-analytics-title">Top Resources</h4>
            <span className="resource-analytics-count">{topResources.length} rows</span>
          </div>
          {!topResources.length ? (
            <p className="resource-analytics-empty">No approved booking data yet.</p>
          ) : (
            <div className="resource-analytics-simple-table-wrap">
              <table className="resource-analytics-simple-table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Bookings</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {topResources.map((item, index) => (
                    <tr key={`${item.resourceId}-${index}`}>
                      <td>{item.resourceName}</td>
                      <td>{item.resourceType}</td>
                      <td>{item.location}</td>
                      <td>
                        <div className="analytics-cell-with-bar">
                          <span>{item.totalBookings}</span>
                          <span className="analytics-mini-bar-track">
                            <span
                              className="analytics-mini-bar-fill"
                              style={{ width: `${Math.max(6, (Number(item.totalBookings || 0) / maxResourceBookings) * 100)}%` }}
                            />
                          </span>
                        </div>
                      </td>
                      <td>{Number(item.totalBookedHours || 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="resource-analytics-block">
          <div className="resource-analytics-title-row">
            <h4 className="resource-analytics-title">Peak Booking Hours</h4>
            <span className="resource-analytics-count">{peakHours.length} rows</span>
          </div>
          {!peakHours.length ? (
            <p className="resource-analytics-empty">No hourly pattern data yet.</p>
          ) : (
            <div className="resource-analytics-simple-table-wrap">
              <table className="resource-analytics-simple-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Hour</th>
                    <th>Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {peakHours.map((item, index) => (
                    <tr key={`${item.hourOfDay}-${index}`}>
                      <td>#{index + 1}</td>
                      <td>{formatHour(item.hourOfDay)}</td>
                      <td>
                        <div className="analytics-cell-with-bar">
                          <span>{item.bookings}</span>
                          <span className="analytics-mini-bar-track">
                            <span
                              className="analytics-mini-bar-fill analytics-mini-bar-fill-hour"
                              style={{ width: `${Math.max(6, (Number(item.bookings || 0) / maxHourBookings) * 100)}%` }}
                            />
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
