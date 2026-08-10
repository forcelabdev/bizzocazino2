import axios from '@axios'
import { defineStore } from 'pinia'

export const useDepositStore = defineStore('deposit', {
  actions: {
    async fetchDeposits(params) {
      try {
        const res = await axios.get('/admin/transactions-deposit', {
          params: {
            q: params.search || '',
            startDate: params.startDate,
            endDate: params.endDate,
            page: params.page || 1,
            itemsPerPage: params.limit || 10,
          },
        })
        return res
      } catch (err) {
        console.error('❌ Deposit fetch error:', err)
        throw err
      }
    },
  },
})
