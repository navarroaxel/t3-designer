export default {
  app: {
    eyebrow: 'Tapalque / Étude solaire',
    loading: 'Ouverture : {{workspace}}…',
    title: 'T3 Designer · {{workspace}}',
  },
  workspaces: {
    building: { title: 'Maison et environs', badge: 'Mesuré avec Google Earth' },
  },
  settings: {
    title: 'Paramètres',
    close: 'Fermer les paramètres',
    general: 'Général',
    generalDescription: 'Personnalisez l’apparence et la langue de T3 Designer.',
    appearance: 'Apparence',
    appearanceDescription: 'Choisissez un thème ou suivez l’apparence de votre appareil.',
    system: 'Système',
    light: 'Clair',
    dark: 'Sombre',
    automatic: 'Les modifications sont appliquées et enregistrées automatiquement dans ce navigateur.',
    sessionOnly: 'Le navigateur n’a pas pu enregistrer une modification. Elle s’applique pour cette session mais peut être perdue au rechargement.',
  },
  language: {
    label: 'Langue',
    automatic: 'Langue du navigateur',
    description: 'Votre choix de langue est enregistré localement dans ce navigateur.',
    changed: 'Langue changée : {{language}}',
    es: 'Español',
    en: 'English',
    fr: 'Français',
  },
} as const
