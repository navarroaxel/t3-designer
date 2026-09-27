export default {
  app: {
    eyebrow: 'Quimper / Architecture studio',
    areaLabel: 'Reported Carrez area',
    navigation: 'Choose project view',
    loading: 'Opening {{workspace}}…',
    title: 'T3 Designer · {{workspace}}',
  },
  workspaces: {
    apartment: { title: 'Apartment daylight', badge: 'Estimated measurements', nav: 'Apartment' },
    building: { title: 'Building and surroundings', badge: 'IGN + visual reconstruction', nav: 'Building and sun' },
    documentation: { title: 'Documentation', badge: 'Data and sources', nav: 'Documentation' },
  },
  language: {
    label: 'Language',
    automatic: 'Browser language',
    description: 'Your language choice is saved locally in this browser.',
    changed: 'Language changed to {{language}}',
    es: 'Español',
    en: 'English',
    fr: 'Français',
  },
} as const
