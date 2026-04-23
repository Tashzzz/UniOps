import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, CalendarCheck, Ticket, Bell, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const links = [
    { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/resources',     icon: Building2,       label: 'Resources' },
    { to: '/bookings',      icon: CalendarCheck,   label: 'Bookings' },
    { to: '/tickets',       icon: Ticket,          label: 'Tickets' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Building2 size={17} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">UniOps</div>
          <div className="sidebar-logo-sub">Management</div>
        </div>
      </div>

      <nav>
        <div className="nav-section">Menu</div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={16} />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'Guest'}</div>
            <div className="sidebar-user-role">{user?.role || ''}</div>
          </div>
          <button className="btn-logout" onClick={logout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}