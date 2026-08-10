import axios from '@axios'
import { defineStore } from 'pinia'

const sanitizeParams = params => {
  const clean = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '')
      clean[key] = value
  })
  return clean
}

export const useEchoPayzStore = defineStore('echopayz', {
  actions: {
    fetchTransactions(params = {}) {
      return axios.get('/admin/echopayz/transactions', {
        params: sanitizeParams({
          search: params.search,
          status: params.status,
          page: params.page,
          limit: params.limit,
          userId: params.userId,
        }),
      })
    },

    getTransaction(id) {
      return axios.get(`/admin/echopayz/transactions/${id}`)
    },

    approveTransaction(id) {
      // Manual approve/remove disabled for EchoPayz (automatic system)
      return Promise.reject(new Error('Manual approve is disabled for EchoPayz.'))
    },
    rejectTransaction(id, reason = '') {
      // Manual reject disabled
      return Promise.reject(new Error('Manual reject is disabled for EchoPayz.'))
    },

    getStats() {
      return axios.get('/admin/echopayz/stats')
    },
  },
})
