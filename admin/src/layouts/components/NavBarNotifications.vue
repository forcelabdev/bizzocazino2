<script setup>
import { useRouter } from 'vue-router'
import Notifications from '@core/components/Notifications.vue'
import { useAdminNotifications } from '@/composables/useAdminNotifications'

const router = useRouter()

const {
  notifications,
  init,
  markRead,
  markUnread,
  removeNotification: removeNotificationAction,
  isSoundMuted,
  toggleSound,
  testNotificationSound,
  isSoundBlocked,
  enableSound,
} = useAdminNotifications()

init()

const removeNotification = notificationId => {
  removeNotificationAction(notificationId)
}

const markReadAction = notificationIds => {
  markRead(notificationIds)
}

const markUnReadAction = notificationIds => {
  markUnread(notificationIds)
}

const handleNotificationClick = notification => {
  if (!notification.isSeen)
    markRead([notification.id])

  if (notification.link)
    router.push(notification.link)
}
</script>

<template>
  <Notifications
    :notifications="notifications"
    :sound-muted="isSoundMuted"
    :sound-blocked="isSoundBlocked"
    show-sound-test
    @remove="removeNotification"
    @read="markReadAction"
    @unread="markUnReadAction"
    @click:notification="handleNotificationClick"
    @toggle-sound="toggleSound"
    @test-sound="testNotificationSound"
    @enable-sound="enableSound"
  />
</template>
