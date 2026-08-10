import axios from '@axios'
import { defineStore } from 'pinia'

export const useUserListStore = defineStore('UserListStore', {
  actions: {
    // ✅ Yeni kullanıcıları çekme endpoint'i
    fetchUsers(params) {
      return axios.get('/admin/users', { params }).then(res => {
        return {
          users: res.data.data,
          totalUsers: res.data.totalUsers,
          totalPage: res.data.totalPage,
          page: res.data.page,
          searchMeta: res.data.searchMeta || null,
        }
      })
    },


    // ✅ Yeni kullanıcı oluşturma
    addUser(userData) {
      return axios.post('/admin/users', userData)
    },

    // ✅ Tek kullanıcıyı çekme
    fetchUser(id) {
      return axios.get(`/admin/users/${id}`)
    },

    editUser(id, updatedData) {
      return axios.put(`/admin/users/${id}`, updatedData).then(res => res.data)
    },

    suspendUser(id, payload = {}) {
      return axios.patch(`/admin/users/${id}/suspension`, payload).then(res => res.data)
    },

    unsuspendUser(id) {
      return axios.delete(`/admin/users/${id}/suspension`).then(res => res.data)
    },

    updateBetAccess(id, payload) {
      return axios.patch(`/admin/users/${id}/bet-access`, payload).then(res => res.data)
    },

    // ✅ Kullanıcının oyun geçmişini getir
    fetchUserGameHistory(userId) {
      return axios.get(`/admin/users/${userId}/history`).then(res => {
        return {
          games: res.data.data,
          total: res.data.total,
        }
      })
    },


    fetchUserBalanceTransactions(userId, params = {}) {
      return axios.get(`/admin/users/${userId}/transactions`, { params }).then(res => {
        return {
          transactions: res.data.data,
          total: res.data.total,
          page: res.data.page,
          totalPages: res.data.totalPages,
        }
      })
    },

    fetchUserManualAdjustments(userId, params = {}) {
      return axios.get(`/admin/users/${userId}/manual-adjustments`, { params }).then(res => {
        return {
          adjustments: res.data.data,
          total: res.data.total,
          page: res.data.page,
          totalPages: res.data.totalPages,
        }
      })
    },

    fetchUserMfaCodes(userId, params = {}) {
      return axios.get(`/admin/users/${userId}/mfa-codes`, { params }).then(res => {
        const limit = Number(res.data.limit || params.limit || 20)
        const total = Number(res.data.total || 0)

        return {
          codes: res.data.data || [],
          total,
          page: Number(res.data.page || 1),
          totalPages: Math.max(1, Math.ceil(total / limit)),
        }
      })
    },

    disableUserMfa(userId, payload = {}) {
      return axios.post(`/admin/users/${userId}/mfa/disable`, payload).then(res => res.data)
    },

    fetchManualAdjustments(params = {}) {
      return axios.get('/admin/manual-adjustments', { params }).then(res => {
        return {
          adjustments: res.data.data,
          total: res.data.total,
          page: res.data.page,
          totalPages: res.data.totalPages,
        }
      })
    },

    createUserManualAdjustment(userId, payload) {
      return axios.post(`/admin/users/${userId}/manual-adjustments`, payload).then(res => res.data)
    },

    fetchUserDepositWithdrawals(userId) {
      return axios.get(`/admin/users/${userId}/transactions/deposit-withdrawal`).then(res => {
        return {
          deposits: res.data.deposits,
          withdrawals: res.data.withdrawals,
        }
      })
    },

    // ✅ Kontroller sekmesi: dönemsel finansal rapor
    fetchUserFinancialReport(userId, params = {}) {
      return axios.get(`/admin/users/${userId}/financial-report`, { params }).then(res => res.data.data)
    },

    // ✅ Kontroller sekmesi: engelleme / kısıtlama / platform erişimi güncelleme
    updateUserControls(userId, payload) {
      return axios.patch(`/admin/users/${userId}/controls`, payload).then(res => res.data)
    },

    // ✅ Kontroller sekmesi: partnere ata
    assignUserPartner(userId, identifier) {
      return axios.patch(`/admin/users/${userId}/partner`, { identifier }).then(res => res.data)
    },

    // ✅ Kontroller sekmesi: partner bağlantısını kaldır
    removeUserPartner(userId) {
      return axios.delete(`/admin/users/${userId}/partner`).then(res => res.data)
    },

    // ✅ Kontroller sekmesi: etiket yönetimi (Tag Manager ile paylaşılan endpointler)
    fetchTags() {
      return axios.get('/admin/tags').then(res => res.data.data)
    },

    assignTagToUser(tagId, userId) {
      return axios.post(`/admin/tags/${tagId}/assign`, { userIds: [userId] }).then(res => res.data)
    },

    unassignTagFromUser(tagId, userId) {
      return axios.post(`/admin/tags/${tagId}/unassign`, { userIds: [userId] }).then(res => res.data)
    },

    // ✅ Kayıp Bonusu: kullanıcı özeti (Kontroller sekmesi için)
    fetchUserLossBonusSummary(userId) {
      return axios.get(`/admin/users/${userId}/loss-bonus`).then(res => res.data.data)
    },

    // ✅ Kayıp Bonusu: talebi onayla (Kontroller sekmesinden)
    approveLossBonusClaim(claimId) {
      return axios.post(`/admin/loss-bonus/claims/${claimId}/approve`).then(res => res.data)
    },

    // ✅ Kayıp Bonusu: talebi reddet (Kontroller sekmesinden)
    rejectLossBonusClaim(claimId, reason = "") {
      return axios.post(`/admin/loss-bonus/claims/${claimId}/reject`, { reason }).then(res => res.data)
    },

    // ✅ Yatırım Bonusu: kullanıcı özeti (Kontroller sekmesi için)
    fetchUserDepositBonusSummary(userId) {
      return axios.get(`/admin/users/${userId}/deposit-bonus`).then(res => res.data.data)
    },

    // ✅ Yatırım Bonusu: talebi onayla (Kontroller sekmesinden)
    approveDepositBonusClaim(claimId) {
      return axios.post(`/admin/deposit-bonus/claims/${claimId}/approve`).then(res => res.data)
    },

    // ✅ Yatırım Bonusu: talebi reddet (Kontroller sekmesinden)
    rejectDepositBonusClaim(claimId, reason = "") {
      return axios.post(`/admin/deposit-bonus/claims/${claimId}/reject`, { reason }).then(res => res.data)
    },

    // ✅ Reload Bonusu: genel ayarları getir
    fetchReloadBonusSettings() {
      return axios.get('/admin/reload-bonus/settings').then(res => res.data.data)
    },

    // ✅ Reload Bonusu: genel ayarları güncelle
    updateReloadBonusSettings(payload) {
      return axios.put('/admin/reload-bonus/settings', payload).then(res => res.data)
    },

    // ✅ Reload Bonusu: yeni atama önizlemesi (toplam tutar / parça başı tutar)
    previewReloadBonusAssignment(payload) {
      return axios.post('/admin/reload-bonus/preview', payload).then(res => res.data.data)
    },

    // ✅ Reload Bonusu: tüm atamaların listesi (sayfa geneli)
    fetchReloadBonusAssignments(params = {}) {
      return axios.get('/admin/reload-bonus/assignments', { params }).then(res => {
        return {
          assignments: res.data.data,
          total: res.data.total,
          page: res.data.page,
          totalPages: res.data.totalPages,
        }
      })
    },

    // ✅ Reload Bonusu: bir atamayı iptal et
    cancelReloadBonusAssignment(assignmentId) {
      return axios.post(`/admin/reload-bonus/assignments/${assignmentId}/cancel`).then(res => res.data)
    },

    // ✅ Reload Bonusu: kullanıcı özeti (Bonuslar sekmesi için)
    fetchUserReloadBonusSummary(userId) {
      return axios.get(`/admin/users/${userId}/reload-bonus`).then(res => res.data.data)
    },

    // ✅ Reload Bonusu: kullanıcıya manuel atama oluştur
    createUserReloadBonusAssignment(userId, payload) {
      return axios.post(`/admin/users/${userId}/reload-bonus`, payload).then(res => res.data)
    },

  },
})
