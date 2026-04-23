import React from 'react'
import { Building2, MapPin, Users, Pencil, Trash2 } from 'lucide-react'

const statusBadge = {
  ACTIVE:      'badge-green',
  OUT_OF_SERVICE: 'badge-red',
  AVAILABLE:   'badge-green',
  OCCUPIED:    'badge-yellow',
  MAINTENANCE: 'badge-orange',
  RETIRED:     'badge-gray',
}

export default function ResourceList({ resources, onEdit, onDelete, canManage }) {
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
        <div className="resource-card" key={r.id}>
          <div className="resource-card-img">
            <Building2 size={40} />
          </div>
          <div className="resource-card-body">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div className="resource-card-title">{r.name}</div>
              <span className={`badge ${statusBadge[r.status]||'badge-gray'}`}>{r.status}</span>
            </div>
            <div className="resource-card-meta">
              <div><MapPin size={11}/> {r.location}</div>
              <div><Users size={11}/> Capacity: {r.capacity}</div>
            </div>
            {r.description && (
              <p style={{ fontSize:12, color:'var(--text-3)', marginTop:8, lineHeight:1.5 }}>
                {r.description.length > 80 ? r.description.slice(0,80)+'…' : r.description}
              </p>
            )}
            <div className="resource-card-footer">
              <span className="type-chip">{r.type.replace('_',' ')}</span>
              {canManage && (
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-sm btn-secondary btn-icon" onClick={()=>onEdit(r)}><Pencil size={12}/></button>
                  <button className="btn btn-sm btn-danger   btn-icon" onClick={()=>onDelete(r.id)}><Trash2 size={12}/></button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}