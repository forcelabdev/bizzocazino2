<script setup>
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { avatarText } from '@core/utils/formatters'

const props = defineProps({
  notifications: {
    type: Array,
    required: true,
  },
  badgeProps: {
    type: null,
    required: false,
    default: undefined,
  },
  location: {
    type: null,
    required: false,
    default: 'bottom end',
  },
  soundMuted: {
    type: Boolean,
    required: false,
    default: false,
  },
  showSoundTest: {
    type: Boolean,
    default: false,
  },
  soundBlocked: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'read',
  'unread',
  'remove',
  'click:notification',
  'toggle-sound',
  'testSound',
  'enableSound',
])

const isAllMarkRead = computed(() => props.notifications.some(item => item.isSeen === false))

const markAllReadOrUnread = () => {
  const allNotificationsIds = props.notifications.map(item => item.id)
  if (!isAllMarkRead.value)
    emit('unread', allNotificationsIds)
  else
    emit('read', allNotificationsIds)
}

const totalUnseenNotifications = computed(() => {
  return props.notifications.filter(item => item.isSeen === false).length
})
</script>

<template>
  <IconBtn id="notification-btn">
    <VBadge
      v-bind="props.badgeProps"
      :model-value="props.notifications.some(n => !n.isSeen)"
      color="error"
      :content="totalUnseenNotifications"
      class="notification-badge"
    >
      <VIcon
        size="26"
        icon="tabler-bell"
      />
    </VBadge>

    <VMenu
      activator="parent"
      width="380px"
      :location="props.location"
      offset="14px"
      :close-on-content-click="false"
    >
      <VCard class="d-flex flex-column">
        <!-- 👉 Header -->
        <VCardItem class="notification-section">
          <VCardTitle class="text-lg">
            Notifications
          </VCardTitle>

          <template #append>
            <div class="d-flex align-center gap-1">
              <IconBtn
                v-if="props.showSoundTest"
                @click="$emit('testSound')"
              >
                <VIcon icon="tabler-volume-2" />

                <VTooltip
                  activator="parent"
                  location="start"
                >
                  Bildirim sesini test et
                </VTooltip>
              </IconBtn>

              <IconBtn @click="$emit('toggle-sound')">
                <VIcon :icon="props.soundMuted ? 'tabler-volume-3' : 'tabler-volume'" />

                <VTooltip
                  activator="parent"
                  location="start"
                >
                  {{ props.soundMuted ? 'Bildirim sesini aç' : 'Bildirim sesini kapat' }}
                </VTooltip>
              </IconBtn>

              <IconBtn
                v-show="props.notifications.length"
                @click="markAllReadOrUnread"
              >
                <VIcon :icon="!isAllMarkRead ? 'tabler-mail' : 'tabler-mail-opened' " />

                <VTooltip
                  activator="parent"
                  location="start"
                >
                  {{ !isAllMarkRead ? 'Mark all as unread' : 'Mark all as read' }}
                </VTooltip>
              </IconBtn>
            </div>
          </template>
        </VCardItem>

        <VDivider />

        <!-- 👉 Ses engeli uyarısı: tarayıcı autoplay politikası bu sekimde
             henüz hiç etkileşim olmadığı için sesi engelliyor. Admin bunu
             görüp tek tıkla etkinleştirebilir; aksi halde bildirim gelir
             ama ses hiç çalmaz ve admin bunun nedenini anlayamaz. -->
        <VAlert
          v-if="props.soundBlocked"
          type="warning"
          variant="tonal"
          density="compact"
          class="ma-2"
        >
          <div class="d-flex align-center justify-space-between gap-2">
            <span class="text-caption">Bildirim sesi tarayıcı tarafından engellendi.</span>
            <VBtn
              size="x-small"
              variant="flat"
              color="warning"
              @click="$emit('enableSound')"
            >
              Sesi Etkinleştir
            </VBtn>
          </div>
        </VAlert>

        <!-- 👉 Notifications list -->
        <PerfectScrollbar
          :options="{ wheelPropagation: false }"
          style="max-block-size: 23.75rem;"
        >
          <VList class="notification-list rounded-0 py-0">
            <template
              v-for="(notification, index) in props.notifications"
              :key="notification.title"
            >
              <VDivider v-if="index > 0" />
              <VListItem
                link
                lines="one"
                min-height="66px"
                class="list-item-hover-class"
                @click="$emit('click:notification', notification)"
              >
                <!-- Slot: Prepend -->
                <!-- Handles Avatar: Image, Icon, Text -->
                <template #prepend>
                  <VListItemAction start>
                    <VAvatar
                      size="40"
                      :color="notification.color && notification.icon ? notification.color : undefined"
                      :image="notification.img || undefined"
                      :icon="notification.icon || undefined"
                      :variant="notification.img ? undefined : 'tonal' "
                    >
                      <span v-if="notification.text">{{ avatarText(notification.text) }}</span>
                    </VAvatar>
                  </VListItemAction>
                </template>

                <VListItemTitle>{{ notification.title }}</VListItemTitle>
                <VListItemSubtitle>{{ notification.subtitle }}</VListItemSubtitle>
                <span class="text-xs text-disabled">{{ notification.time }}</span>

                <!-- Slot: Append -->
                <template #append>
                  <div class="d-flex flex-column align-center gap-4">
                    <VBadge
                      dot
                      :color="!notification.isSeen ? 'primary' : '#a8aaae'"
                      :class="`${notification.isSeen ? 'visible-in-hover' : ''} ms-1`"
                      @click.stop="$emit(notification.isSeen ? 'unread' : 'read', [notification.id])"
                    />

                    <div style="block-size: 28px; inline-size: 28px;">
                      <IconBtn
                        size="small"
                        class="visible-in-hover"
                        @click="$emit('remove', notification.id)"
                      >
                        <VIcon
                          size="20"
                          icon="tabler-x"
                        />
                      </IconBtn>
                    </div>
                  </div>
                </template>
              </VListItem>
            </template>

            <VListItem
              v-show="!props.notifications.length"
              class="text-center text-medium-emphasis"
              style="block-size: 56px;"
            >
              <VListItemTitle>No Notification Found!</VListItemTitle>
            </VListItem>
          </VList>
        </PerfectScrollbar>

        <VDivider />

        <!-- 👉 Footer -->
        <VCardActions
          v-show="props.notifications.length"
          class="notification-footer"
        >
          <VBtn block>
            View All Notifications
          </VBtn>
        </VCardActions>
      </VCard>
    </VMenu>
  </IconBtn>
</template>

<style lang="scss">
.notification-section {
  padding: 14px !important;
}

.notification-footer {
  padding: 6px !important;
}

.list-item-hover-class {
  .visible-in-hover {
    display: none;
  }

  &:hover {
    .visible-in-hover {
      display: block;
    }
  }
}

.notification-list.v-list {
  .v-list-item {
    border-radius: 0 !important;
    margin: 0 !important;
  }
}

// Badge Style Override for Notification Badge
.notification-badge {
  .v-badge__badge {
    /* stylelint-disable-next-line liberty/use-logical-spec */
    min-width: 18px;
    padding: 0;
    block-size: 18px;
  }
}
</style>
