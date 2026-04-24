import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import resourceService from '../services/resourceService'
import ResourceList from '../components/ResourceList'
import ResourceForm from '../components/ResourceForm'
import ResourceAnalyticsPanel from '../components/ResourceAnalyticsPanel'

const TYPES = ['LECTURE_HALL','LAB','MEETING_ROOM','SPORTS','STUDY_ROOM','AUDITORIUM','OTHER']
const STATUSES = ['ACTIVE', 'OUT_OF_SERVICE']

export default function ResourcesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [resources,  setResources]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [minCapacity, setMinCapacity] = useState('')
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [analytics, setAnalytics] = useState(null)
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState(null)

  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF'
  const canBook = user?.role === 'STUDENT'
  const isAdmin = user?.role === 'ADMIN'

  const getFilterParams = useCallback(() => ({
    search: search || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    location: locationFilter || undefined,
    minCapacity: minCapacity ? Number(minCapacity) : undefined,
  }), [search, typeFilter, statusFilter, locationFilter, minCapacity])

  const load = useCallback((filters = {}) => {
    setLoading(true)
    resourceService.getAll(filters)
      .then(r => {
        const d = Array.isArray(r.data) ? r.data : []
        setResources(d)
      })
      .catch(() => toast.error('Failed to load resources'))
      .finally(() => setLoading(false))
  }, [])

  const loadAnalytics = useCallback((days = analyticsDays) => {
    if (!isAdmin) return
    resourceService.getUsageAnalytics(days)
      .then(r => setAnalytics(r.data))
      .catch(() => toast.error('Failed to load resource analytics'))
  }, [analyticsDays, isAdmin])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      load(getFilterParams())
    }, 250)

    return () => clearTimeout(timeoutId)
  }, [getFilterParams, load])

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics(analyticsDays)
    }
  }, [isAdmin, analyticsDays, loadAnalytics])

  const handleSubmit = async (data, imageFile) => {
    try {
      let saved
      if (editing) {
        saved = (await resourceService.update(editing.id, data)).data
      } else {
        saved = (await resourceService.create(data)).data
      }

      if (imageFile && saved?.id) {
        await resourceService.uploadImage(saved.id, imageFile)
      }

      toast.success(editing ? 'Resource updated' : 'Resource created')
      setShowModal(false); setEditing(null); load(getFilterParams()); loadAnalytics()
    } catch (err) { toast.error(err.message) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return
    try { await resourceService.delete(id); toast.success('Deleted'); load(getFilterParams()); loadAnalytics() }
    catch (err) { toast.error(err.message) }
  }

  const handleBook = (resource) => {
    navigate(`/bookings?resourceId=${resource.id}`)
  }

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Campus Resources</h1>
          <p>Manage all campus facilities and assets</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={15}/> Add Resource
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={14}/>
          <input placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
        </select>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <input
          className="filter-select"
          placeholder="Location"
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
        />
        <input
          className="filter-select"
          type="number"
          min="1"
          placeholder="Min Capacity"
          value={minCapacity}
          onChange={e => setMinCapacity(e.target.value)}
          style={{ width: 130 }}
        />
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-3)' }}>
          {resources.length} resource{resources.length !== 1 ? 's' : ''}
        </span>
      </div>

      {isAdmin && (
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Analytics Window:</span>
          <select
            className="filter-select"
            value={analyticsDays}
            onChange={e => setAnalyticsDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      )}

      {isAdmin && <ResourceAnalyticsPanel analytics={analytics} days={analyticsDays} />}

      {loading
        ? <div className="loading-container"><div className="spinner"/></div>
        : <ResourceList
            resources={resources}
            onEdit={r => { setEditing(r); setShowModal(true) }}
            onDelete={handleDelete}
            onBook={handleBook}
            canManage={canManage}
            canBook={canBook}
          />
      }

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>{editing ? 'Edit Resource' : 'Add Resource'}</h2>
            <ResourceForm initial={editing} onSubmit={handleSubmit} onCancel={() => { setShowModal(false); setEditing(null) }}/>
          </div>
        </div>
      )}
    </div>
  )
}