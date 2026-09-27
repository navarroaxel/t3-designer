export default {
  app: {
    eyebrow: 'Quimper / Estudio de arquitectura',
    areaLabel: 'Superficie Carrez reportada',
    navigation: 'Elegir vista del proyecto',
    loading: 'Abriendo {{workspace}}…',
    title: 'T3 Designer · {{workspace}}',
  },
  workspaces: {
    apartment: { title: 'Luz en el departamento', badge: 'Medidas estimadas', nav: 'Departamento' },
    building: { title: 'Edificio y entorno', badge: 'IGN + reconstrucción visual', nav: 'Edificio y sol' },
    documentation: { title: 'Documentación', badge: 'Datos con sus fuentes', nav: 'Documentación' },
  },
  language: {
    label: 'Idioma',
    automatic: 'Idioma del navegador',
    description: 'El idioma elegido se guarda localmente en este navegador.',
    changed: 'Idioma cambiado a {{language}}',
    es: 'Español',
    en: 'English',
    fr: 'Français',
  },
} as const
