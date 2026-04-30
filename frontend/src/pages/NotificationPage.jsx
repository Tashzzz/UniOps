import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const TYPE_STYLE = {
  BOOKING: { bg: '#eef2ff', color: '#2563eb' },
  TICKET:  { bg: '#fef2f2', color: '#dc2626' },
  SYSTEM:  { bg: '#ecfdf5', color: '#059669' },
  GENERAL: { bg: '#f3f4f6', color: '#6b7280' },
}

export function NotificationPanel({ userId }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!userId) {
      setLoading(false)
      return
    }

    api.get(`/notifications/user/${userId}`)
      .then(r => setNotifications(Array.isArray(r.data) ? r.data : []))
      .catch(err => {
        console.error('Notification load error:', err)
        toast.error('Failed to load notifications')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [userId])

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
    } catch (err) {
      toast.error('Failed to mark as read')
    }
  }

  const markAll = async () => {
    try {
      await api.patch(`/notifications/user/${userId}/read-all`)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('All marked as read')
    } catch (err) {
      toast.error('Failed to mark all as read')
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    )
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontWeight:700, fontSize:14, color:'var(--text, #111827)' }}>
            All Notifications
          </span>
          {unread > 0 && <span className="badge badge-blue">{unread} unread</span>}
        </div>

        {unread > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAll}>
            <CheckCheck size={13}/> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <BellOff size={40}/>
          <h3>No notifications</h3>
          <p>You&apos;re all caught up in UniOps!</p>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map(n => {
            const s = TYPE_STYLE[n.type] || TYPE_STYLE.GENERAL

            return (
              <div
                key={n.id}
                className={`notif-item${n.read ? '' : ' unread'}`}
                onClick={() => !n.read && markRead(n.id)}
                style={{ cursor: n.read ? 'default' : 'pointer' }}
              >
                <div style={{
                  width:34,
                  height:34,
                  borderRadius:9,
                  background:s.bg,
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  flexShrink:0
                }}>
                  <Bell size={15} color={s.color}/>
                </div>

                <div className="notif-content">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">
                    {n.createdAt
                      ? format(new Date(n.createdAt), 'MMM d, yyyy · HH:mm')
                      : 'No date'}
                  </div>
                </div>

                {!n.read && <div className="notif-dot"/>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  const { user } = useAuth()

  return (
    <div>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>Stay updated with your tickets, resources, bookings, and UniOps system alerts</p>
      </div>

      <div className="card">
        <NotificationPanel userId={user?.id || 1}/>
      </div>
    </div>
  )
}