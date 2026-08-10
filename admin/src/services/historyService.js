import axios from '@axios'

export const fetchFuturesHistory = async (params) => {
  const res = await axios.get('/admin/futures/history', { params })
  return res.data   // ✅ artık direkt { success, data, total, page } döner
}


export const fetchTurboHistory = (params) => {
  return axios.get('/admin/turbo/history', { params })
}

export const fetchWingoHistory = (params) => {
  return axios.get('/admin/wingo/history', { params })
}

// 📌 Battle
export const fetchBattleHistory = (params) => {
  return axios.get('/admin/battle/history', { params })
}

// 📌 Blackjack
export const fetchBlackjackHistory = (params) => {
  return axios.get('/admin/blackjack/history', { params })
}

// 📌 Crash
export const fetchCrashHistory = (params) => {
  return axios.get('/admin/crash/history', { params })
}

// 📌 Duels
export const fetchDuelsHistory = (params) => {
  return axios.get('/admin/duels/history', { params })
}

// 📌 Mines
export const fetchMinesHistory = (params) => {
  return axios.get('/admin/mines/history', { params })
}

// 📌 Roll
export const fetchRollHistory = (params) => {
  return axios.get('/admin/roll/history', { params })
}

// 📌 Towers
export const fetchTowersHistory = (params) => {
  return axios.get('/admin/towers/history', { params })
}

// 📌 Unbox
export const fetchUnboxHistory = (params) => {
  return axios.get('/admin/unbox/history', { params })
}