import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import ResourcesPage from './pages/ResourcesPage'
import TicketsPage from './pages/TicketsPage'
import BookingsPage from './pages/BookingsPage'
// import TicketsPage from './pages/TicketsPage'
import NotificationsPage from './pages/NotificationsPage'
import LoginPage from './pages/LoginPage'

function AppLayout() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/resources"     element={<ResourcesPage />} />
          <Route path="/tickets"       element={<TicketsPage />} />
          <Route path="/bookings"      element={<BookingsPage />} />
          
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="*"              element={<Navigate to="/dashboard" replace />} /> 
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*"     element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}