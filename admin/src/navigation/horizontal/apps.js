export default [
  {
    title: 'Apps',
    icon: { icon: 'tabler-layout-grid-add' },
    children: [
      {
        title: 'Email',
        icon: { icon: 'tabler-mail' },
        to: 'apps-email',
      },
      {
        title: 'Chat',
        icon: { icon: 'tabler-message-circle' },
        to: 'apps-chat',
      },
      {
        title: 'Calendar',
        to: 'apps-calendar',
        icon: { icon: 'tabler-calendar' },
      },
      {
        title: 'Invoice',
        icon: { icon: 'tabler-file-dollar' },
        children: [
          { title: 'List', to: 'apps-invoice-list' },
          { title: 'Preview', to: { name: 'apps-invoice-preview-id', params: { id: '5036' } } },
          { title: 'Edit', to: { name: 'apps-invoice-edit-id', params: { id: '5036' } } },
          { title: 'Add', to: 'apps-invoice-add' },
        ],
      },
      {
        title: 'User',
        icon: { icon: 'tabler-users' },
        action: 'read',
        subject: 'users',
        children: [
          { title: 'List', to: 'apps-user-list', action: 'read', subject: 'users' },
          { title: 'View', to: { name: 'apps-user-view-id', params: { id: 21 } }, action: 'read', subject: 'users' },
        ],
      },
      {
        title: 'Roles & Permissions',
        icon: { icon: 'tabler-settings' },
        action: 'read',
        subject: 'roles',
        children: [
          { title: 'Roles', to: 'apps-roles', action: 'read', subject: 'roles' },
          { title: 'Permissions', to: 'apps-permissions', action: 'read', subject: 'roles' },
        ],
      },
    ],
  },
]
