import esCommon from './locales/es/common.ts'
import enCommon from './locales/en/common.ts'
import frCommon from './locales/fr/common.ts'
import esWorkspace from './locales/es/workspace.ts'
import enWorkspace from './locales/en/workspace.ts'
import frWorkspace from './locales/fr/workspace.ts'

export const resources = {
  es: { common: esCommon, workspace: esWorkspace },
  en: { common: enCommon, workspace: enWorkspace },
  fr: { common: frCommon, workspace: frWorkspace },
} as const

/** Preserve keys/structure, while allowing each locale to supply its own words. */
export type TranslationShape<T> = { [K in keyof T]: T[K] extends string ? string : TranslationShape<T[K]> }

// Adding/removing a source key makes incomplete translations fail typecheck.
const checkedResources: Record<'es' | 'en' | 'fr', TranslationShape<typeof resources.es>> = resources
void checkedResources
