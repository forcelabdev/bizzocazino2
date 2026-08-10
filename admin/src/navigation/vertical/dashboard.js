export default [
  {
    title: 'Dashboards',
    icon: { icon: 'tabler-smart-home' },
    action: 'read',
    subject: 'dashboard',
    children: [
      {
        title: 'Analytics',
        to: 'dashboards-analytics',
        action: 'read',
        subject: 'dashboard',
      },
    ],
    badgeContent: '3',
    badgeClass: 'bg-primary',
  },
]
