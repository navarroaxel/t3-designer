export default {
  app: {
    eyebrow: 'Tapalque / Estudio solar',
    loading: 'Abriendo {{workspace}}…',
    title: 'T3 Designer · {{workspace}}',
  },
  workspaces: {
    building: { title: 'Casa y entorno', badge: 'Medido con Google Earth' },
  },
  settings: {
    title: 'Ajustes',
    close: 'Cerrar ajustes',
    general: 'General',
    generalDescription: 'Personalizá cómo se ve y en qué idioma usás T3 Designer.',
    appearance: 'Apariencia',
    appearanceDescription: 'Elegí un tema o seguí la apariencia de tu dispositivo.',
    system: 'Sistema',
    light: 'Claro',
    dark: 'Oscuro',
    automatic: 'Los cambios se aplican y se guardan automáticamente en este navegador.',
    sessionOnly: 'El navegador no permitió guardar algún cambio. Se aplicó para esta sesión; al recargar puede perderse.',
  },
  language: {
    label: 'Idioma',
    automatic: 'Idioma del navegador',
    description: 'El idioma elegido se guarda localmente en este navegador.',
    changed: 'Idioma cambiado a {{language}}',
    es: 'Español',
    en: 'English',
  },
} as const
