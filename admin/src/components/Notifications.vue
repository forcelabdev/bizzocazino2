<template>
  <div class="notification-container">
    <transition-group name="fade" tag="div">
      <div
        v-for="n in notifications"
        :key="n.id"
        class="notification-item"
        :class="n.type"
      >
        <VIcon
          size="18"
          :icon="iconType[n.type]"
          class="mr-2"
        />
        <span>{{ n.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { notifications } from '@/composables/useNotify';
const iconType = {
  success: 'tabler-check',
  error: 'tabler-alert-triangle',
  info: 'tabler-info-circle',
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.notification-item {
  display: flex;
  align-items: center;
  background: rgb(var(--v-theme-primary)) !important;
  border-radius: 8px;
  padding: 10px 14px;
  min-width: 250px;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  animation: slideIn 0.3s ease;
}
.notification-item.success {
  border-left: 4px solid var(--v-theme-success);
  color: var(--v-theme-success);
}
.notification-item.error {
  border-left: 4px solid var(--v-theme-error);
  color: var(--v-theme-error);
}
.notification-item.info {
  border-left: 4px solid var(--v-theme-primary);
  color: var(--v-theme-primary);
}
@keyframes slideIn {
  from { transform: translateX(50px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
