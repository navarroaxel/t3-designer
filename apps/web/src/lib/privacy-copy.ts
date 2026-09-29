import { privacyDetails } from './privacy-settings'
import { CONSENT_MONTHS } from './analytics-policy'

type PrivacySection = {
  id: string
  title: string
  paragraphs: readonly string[]
  links?: readonly { label: string; href: string }[]
}

type PrivacyCopy = {
  preferences: string
  policy: string
  title: string
  introduction: string
  accept: string
  reject: string
  withdraw: string
  close: string
  backToApp: string
  pageIntro: string
  pageAnalyticsOff: string
  contents: string
  reviewedOnLabel: string
  contactLabel: string
  choiceTitle: string
  choice: Record<'pending' | 'accepted' | 'rejected', string>
  status: Record<'available' | 'config' | 'signals' | 'storage' | 'tracker', string>
  active: string
  inactive: string
  lifetime: string
  version: string
  sections: readonly PrivacySection[]
}

const cnilComplaints = 'https://www.cnil.fr/fr/plaintes'

/** Separate from the app's translation catalogs; operational facts have one source. */
export const privacyCopy: Record<'es' | 'en', PrivacyCopy> = {
  es: {
    preferences: 'Preferencias de privacidad',
    policy: 'Política de privacidad',
    title: 'Analytics opcional',
    introduction: 'Con tu permiso usamos Umami para contar visitas y entender qué funciones de T3 Designer resultan útiles. Hasta que aceptes, no cargamos el tracker ni enviamos solicitudes de analytics. Podés rechazar y seguir usando toda la app.',
    accept: 'Aceptar analytics',
    reject: 'Rechazar analytics',
    withdraw: 'Retirar el permiso',
    close: 'Cerrar privacidad',
    backToApp: 'Volver a T3 Designer',
    pageIntro: 'Esta política explica qué datos se tratan al visitar T3 Designer, para qué se usan y cómo ejercer tus derechos. La medición de audiencia es opcional y se controla por separado de los registros operativos del sitio.',
    pageAnalyticsOff: 'Esta página de privacidad no se mide. Tu elección de analytics se aplica al volver a la app.',
    contents: 'En esta página',
    reviewedOnLabel: 'Última revisión',
    contactLabel: 'Contacto de privacidad',
    choiceTitle: 'Tu elección',
    choice: {
      pending: 'Todavía no diste tu permiso.',
      accepted: 'Aceptaste analytics opcional.',
      rejected: 'Rechazaste analytics opcional.',
    },
    status: {
      available: '',
      config: 'Analytics está deshabilitado: la configuración de este sitio no está habilitada o está incompleta.',
      signals: 'Tu navegador comunica Do Not Track o Global Privacy Control. Respetamos esa señal y mantenemos analytics apagado.',
      storage: 'No podemos guardar o leer tu preferencia de forma segura. Analytics permanece apagado.',
      tracker: 'El tracker no está disponible o está bloqueado. La app sigue funcionando.',
    },
    active: 'Analytics habilitado con tu permiso.',
    inactive: 'Analytics apagado.',
    lifetime: 'Guardamos en tu navegador la elección sobre analytics, la versión de esta política y su vencimiento durante {months} meses. Podés cambiar la elección cuando quieras. Al vencer, analytics se apaga y volvemos a pedir permiso.',
    version: 'Versión de la política',
    sections: [
      {
        id: 'controller',
        title: 'Responsable y contacto',
        paragraphs: [
          `${privacyDetails.controllerName} es el responsable del tratamiento de datos de T3 Designer. Para hacer consultas sobre privacidad o ejercer tus derechos, usá el contacto indicado en esta página.`,
        ],
      },
      {
        id: 'analytics',
        title: 'Medición de audiencia opcional',
        paragraphs: [
          'Con tu consentimiento, Umami mide visitas y aperturas del estudio solar. La finalidad es entender el uso del sitio y mejorar sus funciones. La base jurídica de esta medición es tu consentimiento, conforme al artículo 6.1.a del RGPD.',
          'Se usan secciones y eventos predefinidos, sin enviar nombres, emails, texto libre, coordenadas GPS ni identificadores personales personalizados. Las direcciones de analytics no incluyen parámetros ni fragmentos; tampoco enviamos la página de procedencia. No grabamos sesiones, movimientos del cursor ni cada ajuste de los controles.',
          'Las solicitudes llegan al servidor con datos de conexión, como la dirección IP y cabeceras del navegador. Umami puede obtener de ellos información técnica y una ubicación aproximada: país, región o ciudad, según la configuración. No se solicita geolocalización al navegador.',
        ],
      },
      {
        id: 'choices',
        title: 'Consentimiento y preferencias locales',
        paragraphs: [
          'La medición solo se inicia después de aceptar. Rechazar no limita el acceso a la app. Desde «Preferencias de privacidad» podés retirar tu permiso en cualquier momento; se detienen los nuevos envíos sin perder el trabajo abierto. El retiro no afecta a la licitud del tratamiento anterior ni borra por sí mismo los datos ya recibidos.',
          `Respetamos Do Not Track y Global Privacy Control y no intentamos eludir bloqueadores. La elección de analytics, la versión de la política y su vencimiento se guardan únicamente en este navegador durante ${CONSENT_MONTHS} meses. Esta duración no es el plazo de conservación de los datos del servidor.`,
          'Si elegís un idioma, la app también lo recuerda localmente hasta que selecciones «Automático» o borres los datos del sitio. Esta preferencia funcional no se envía como evento de analytics.',
        ],
      },
      {
        id: 'operational-logs',
        title: 'Registros operativos',
        paragraphs: [
          'La infraestructura genera registros técnicos para mantener la disponibilidad, proteger el servicio y diagnosticar fallas. Los registros de Traefik incluyen direcciones IP y cabeceras y se centralizan en Loki.',
          'Estos registros pueden generarse al visitar el sitio aunque rechaces Umami. La elección de analytics no los desactiva. No se presentan como datos anónimos ni como parte de la medición opcional.',
        ],
      },
      {
        id: 'hosting',
        title: 'Alojamiento y destinatarios',
        paragraphs: [
          `La infraestructura de alojamiento está en Helsinki, Finlandia (Unión Europea), con ${privacyDetails.hostingProvider}. Umami y los registros centralizados también se alojan allí, en la infraestructura administrada por el responsable.`,
          'Los destinatarios son el responsable y los proveedores de infraestructura que intervienen en la prestación del servicio. El alcance de los accesos de soporte y las posibles transferencias internacionales adicionales sigue en verificación; no se afirma que todos los tratamientos queden limitados a los países de alojamiento indicados.',
        ],
      },
      {
        id: 'retention',
        title: 'Conservación de los datos',
        paragraphs: [
          `Loki está configurado para conservar los registros operativos durante ${privacyDetails.operationalLogsRetentionDays} días. Ese plazo corresponde a los registros centralizados en Loki, no a todas las copias de la infraestructura.`,
          'La activación de Umami para T3 está pendiente. Su plazo de conservación y eliminación debe definirse y verificarse antes de habilitar la medición.',
          'La conservación de registros locales y copias de seguridad sigue en revisión. No hay un plazo de eliminación automática verificado para esas copias.',
        ],
      },
      {
        id: 'rights',
        title: 'Tus derechos',
        paragraphs: [
          'Podés solicitar acceso, rectificación, supresión y limitación del tratamiento de tus datos. También podés ejercer oposición y portabilidad cuando correspondan. Para solicitarlo, contactá al responsable con los datos indicados arriba.',
          'Solo se pedirá la información necesaria para atender la solicitud y, si existen dudas razonables, confirmar tu identidad. Algunos datos de medición pueden no permitir vincular una visita con una persona; si esto impide atender una solicitud, se explicará el motivo. La medición no se amplía solo para poder identificar visitantes.',
          'Podés presentar una reclamación ante la autoridad de protección de datos competente, incluida la CNIL en Francia. La app no toma decisiones automatizadas con efectos jurídicos o similares sobre visitantes.',
        ],
        links: [{ label: 'Presentar una reclamación ante la CNIL', href: cnilComplaints }],
      },
      {
        id: 'changes',
        title: 'Cambios en esta política',
        paragraphs: [
          'La fecha de revisión identifica la información publicada. Los cambios relevantes en la medición o sus finalidades se comunicarán en esta página y, cuando corresponda, se solicitará un nuevo consentimiento.',
        ],
      },
    ],
  },
  en: {
    preferences: 'Privacy preferences',
    policy: 'Privacy policy',
    title: 'Optional analytics',
    introduction: 'With your permission, we use Umami to count visits and understand which T3 Designer features are useful. Until you accept, we do not load the tracker or send analytics requests. You can reject analytics and keep using the whole app.',
    accept: 'Accept analytics',
    reject: 'Reject analytics',
    withdraw: 'Withdraw permission',
    close: 'Close privacy',
    backToApp: 'Back to T3 Designer',
    pageIntro: 'This policy explains how T3 Designer processes data when you visit, what the data is used for and how to exercise your rights. Audience measurement is optional and controlled separately from the records used to operate the website.',
    pageAnalyticsOff: 'This privacy page is not measured. Your analytics choice applies when you return to the app.',
    contents: 'On this page',
    reviewedOnLabel: 'Last reviewed',
    contactLabel: 'Privacy contact',
    choiceTitle: 'Your choice',
    choice: {
      pending: 'You have not given permission yet.',
      accepted: 'You accepted optional analytics.',
      rejected: 'You rejected optional analytics.',
    },
    status: {
      available: '',
      config: 'Analytics is disabled: this site’s configuration is disabled or incomplete.',
      signals: 'Your browser sends Do Not Track or Global Privacy Control. We respect that signal and keep analytics off.',
      storage: 'We cannot safely save or read your preference. Analytics remains off.',
      tracker: 'The tracker is unavailable or blocked. The app still works.',
    },
    active: 'Analytics enabled with your permission.',
    inactive: 'Analytics off.',
    lifetime: 'Your analytics choice, this policy’s version and the expiry date are saved in your browser for {months} months. You can change your choice at any time. On expiry, analytics stops and we ask again.',
    version: 'Policy version',
    sections: [
      {
        id: 'controller',
        title: 'Controller and contact',
        paragraphs: [
          `${privacyDetails.controllerName} is the data controller for T3 Designer. For privacy questions or to exercise your rights, use the contact details on this page.`,
        ],
      },
      {
        id: 'analytics',
        title: 'Optional audience measurement',
        paragraphs: [
          'With your consent, Umami measures visits and openings of the solar study. The purpose is to understand website usage and improve its features. The legal basis for this measurement is your consent under Article 6(1)(a) of the GDPR.',
          'Only predefined sections and events are used. Events do not contain names, emails, free text, GPS coordinates or custom personal identifiers. Analytics addresses exclude query parameters and fragments; we also omit the referring page. We do not record sessions, cursor movements or each control adjustment.',
          'Requests reach the server with connection data such as IP addresses and browser headers. Umami may derive technical information and an approximate location from them: country, region or city, depending on configuration. We do not request browser geolocation.',
        ],
      },
      {
        id: 'choices',
        title: 'Consent and local preferences',
        paragraphs: [
          'Measurement starts only after acceptance. Rejecting it does not restrict access to the app. You can withdraw permission at any time through “Privacy preferences”; new requests stop without losing your open work. Withdrawal does not affect the lawfulness of earlier processing or automatically erase data already received.',
          `We respect Do Not Track and Global Privacy Control and do not try to bypass blockers. Your analytics choice, the policy version and the expiry date are stored only in this browser for ${CONSENT_MONTHS} months. This period is separate from server data retention.`,
          'If you select a language, the app also remembers it locally until you select “Automatic” or clear the website’s data. This functional preference is not sent as an analytics event.',
        ],
      },
      {
        id: 'operational-logs',
        title: 'Operational logs',
        paragraphs: [
          'The infrastructure generates technical records to maintain availability, protect the service and diagnose faults. Traefik logs include IP addresses and headers and are centralised in Loki.',
          'These records may be generated when you visit even if you reject Umami. The analytics preference does not disable them. They are not described as anonymous data or as part of optional audience measurement.',
        ],
      },
      {
        id: 'hosting',
        title: 'Hosting and recipients',
        paragraphs: [
          `The hosting infrastructure is in Helsinki, Finland (European Union), with ${privacyDetails.hostingProvider}. Umami and the centralised logs are also hosted there, within infrastructure managed by the controller.`,
          'Recipients are the controller and the infrastructure providers involved in delivering the service. The scope of support access and any additional international transfers is still being verified; processing is not represented as limited entirely to the listed hosting countries.',
        ],
      },
      {
        id: 'retention',
        title: 'Data retention',
        paragraphs: [
          `Loki is configured to retain operational logs for ${privacyDetails.operationalLogsRetentionDays} days. This period applies to logs centralised in Loki, not to every infrastructure copy.`,
          'Umami activation for T3 is pending. Its retention and deletion period must be defined and verified before measurement is enabled.',
          'Retention of local logs and backups is still under review. No automatic deletion period has been verified for these copies.',
        ],
      },
      {
        id: 'rights',
        title: 'Your rights',
        paragraphs: [
          'You can request access, rectification, erasure and restriction of the processing of your personal data. You may also exercise objection and portability rights where applicable. To make a request, contact the controller using the details above.',
          'Only information needed to handle your request will be requested, including confirmation of identity if there are reasonable doubts. Some measurement data may not allow a visit to be linked to a person; if this prevents fulfilling a request, the reason will be explained. We do not expand audience measurement solely to identify visitors.',
          'You can lodge a complaint with the competent data protection authority, including the CNIL in France. The app does not make automated decisions that produce legal or similarly significant effects on visitors.',
        ],
        links: [{ label: 'Lodge a complaint with the CNIL', href: cnilComplaints }],
      },
      {
        id: 'changes',
        title: 'Changes to this policy',
        paragraphs: [
          'The review date identifies the published information. Material changes to measurement or its purposes will be explained on this page and new consent will be requested where appropriate.',
        ],
      },
    ],
  },
}
