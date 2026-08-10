import { ref } from 'vue'

const notifications = ref([])

export function useNotify() {
  const push = (type, message) => {
    const id = Date.now()
    notifications.value.push({ id, type, message })
    setTimeout(() => remove(id), 3500)
  }

  const remove = id => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  return {
    notifications,
    success: msg => push('success', msg),
    error: msg => push('error', msg),
    info: msg => push('info', msg),
  }
}

export { notifications }

