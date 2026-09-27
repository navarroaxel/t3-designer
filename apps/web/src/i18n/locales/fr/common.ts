export default {
  app: {
    eyebrow: 'Quimper / Studio d’architecture',
    areaLabel: 'Surface Carrez déclarée',
    navigation: 'Choisir une vue du projet',
    loading: 'Ouverture : {{workspace}}…',
    title: 'T3 Designer · {{workspace}}',
  },
  workspaces: {
    apartment: { title: 'Ensoleillement de l’appartement', badge: 'Dimensions estimées', nav: 'Appartement' },
    building: { title: 'Bâtiment et environs', badge: 'IGN + reconstruction visuelle', nav: 'Bâtiment et soleil' },
    documentation: { title: 'Documentation', badge: 'Données et sources', nav: 'Documentation' },
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
