import axios from '@axios'
import { defineStore } from 'pinia'

export const useWithdrawStore = defineStore('withdraw', {
  actions: {
    async fetchWithdraws(params) {
      try {
        const res = await axios.get('/admin/transactions-withdraw', {
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
        console.error('❌ Withdraw fetch error:', err)
        throw err
      }
    },
  },
})
