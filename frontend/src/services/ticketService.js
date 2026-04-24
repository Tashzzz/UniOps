import api from './api'

const ticketService = {
  getAll: (params) => api.get('/tickets', { params }),
  getByUser: (userId) => api.get('/tickets', { params: { requesterId: userId } }),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  updateStatus: (id, status, reason) => api.patch(`/tickets/${id}/status`, null, { params: { status, reason } }),
  assign: (id, assigneeId) => api.patch(`/tickets/${id}/assign`, null, { params: { assigneeId } }),
  updateResolution: (id, resolutionNotes) => api.patch(`/tickets/${id}/resolution`, { resolutionNotes }),
  delete: (id) => api.delete(`/tickets/${id}`),
  getComments: (id) => api.get(`/tickets/${id}/comments`),
  addComment: (id, content) => api.post(`/tickets/${id}/comments`, { content }),
  updateComment: (commentId, content) => api.put(`/tickets/comments/${commentId}`, { content }),
  deleteComment: (commentId) => api.delete(`/tickets/comments/${commentId}`),
  uploadAttachment: (id, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/tickets/${id}/attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadAttachments: (id, files) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return api.post(`/tickets/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default ticketService
