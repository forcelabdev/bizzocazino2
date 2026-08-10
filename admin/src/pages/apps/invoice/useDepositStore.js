// pages/apps/invoice/useDepositStore.js
import axios from 'axios'
import { defineStore } from 'pinia'

export const useDepositStore = defineStore('deposit', {
  state: () => ({
    items: [],
    total: 0,
    loading: false,
  }),

  actions: {
    async fetchDeposits({ q, startDate, endDate, page, itemsPerPage }) {
      this.loading = true
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/transactions-deposit`, {
          params: {
            q,
            startDate,
            endDate,
            page,
            itemsPerPage,
          },
        })

        if (res.data.success) {
          this.items = res.data.data.transactions
          this.total = res.data.data.total
        }
      } catch (err) {
        console.error('❌ Deposit fetch error:', err)
      } finally {
        this.loading = false
      }
    },
  },
})
