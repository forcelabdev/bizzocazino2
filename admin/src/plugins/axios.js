import router from '@/router'
import axios from 'axios'

const axiosIns = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  adapter: 'xhr',
  env: {
    FormData: globalThis.FormData,
    Blob: globalThis.Blob,
  },
})

axiosIns.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')

  if (token) {
    config.headers = config.headers || {}

    // Token may be stored as JSON string ("...") or as a raw string.
    let parsedToken = token
    try {
      parsedToken = JSON.parse(token)
    } catch (e) {
      // ignore
    }

    config.headers.Authorization = `Bearer ${parsedToken}`
  }

  return config
})

axiosIns.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('userData')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('userAbilities')
      localStorage.removeItem('userPermissions')
      localStorage.removeItem('adminMfaChallenge')
      router.push('/login')
    }
    
    return Promise.reject(error)
  },
)

export default axiosIns
