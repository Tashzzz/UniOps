import api from './api'

const ticketService = {
  getAll: (params) => api.get('/tickets', { params }),
  create: (data) => api.post('/tickets', data),
  uploadAttachment: (id, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/tickets/${id}/attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default ticketService
