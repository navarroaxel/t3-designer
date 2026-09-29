export default {
  app: {
    eyebrow: 'Tapalque / Solar study',
    loading: 'Opening {{workspace}}…',
    title: 'T3 Designer · {{workspace}}',
  },
  workspaces: {
    building: { title: 'House and surroundings' },
  },
  settings: {
    title: 'Settings',
    close: 'Close settings',
    general: 'General',
    generalDescription: 'Choose how T3 Designer looks and which language it uses.',
    appearance: 'Appearance',
    appearanceDescription: 'Choose a theme or follow your device’s appearance.',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    automatic: 'Changes apply and save automatically in this browser.',
    sessionOnly: 'The browser could not save a change. It applies for this session but may be lost when you reload.',
  },
  language: {
    label: 'Language',
    automatic: 'Browser language',
    description: 'Your language choice is saved locally in this browser.',
    changed: 'Language changed to {{language}}',
    es: 'Español',
    en: 'English',
  },
} as const
