import { useEffect, useRef, useState } from 'react'
import { dossierFacts, dossierObservations, dossierQuestions, dossierSources, type DossierFact, type DossierSource } from '../data/dossier'
import { BUILDING_SITE, SITE_BUILDINGS, SITE_PARCEL } from '../data/building-site'
import { t3Apartment } from '../data/t3'
import { DossierApartmentPlan, DossierIcon, DossierSitePlan } from './DossierVisuals'
import '../dossier.css'

type Section = 'overview' | 'apartment' | 'building' | 'energy' | 'sources' | 'questions'
type OpenSource = (id: string) => void
const number = (value: number, digits = 0) => value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const statusLabels: Record<DossierFact['status'], string> = {
  official: 'Fuente pública', reported: 'Reportado', estimated: 'Estimado',
  observed: 'Observado', pending: 'Por documentar', derived: 'Calculado',
}
const sourceKinds: Record<DossierSource['kind'], string> = {
  'public-record': 'Registro público', reference: 'Referencia aportada',
  model: 'Reconstrucción del proyecto', 'official-guide': 'Guía oficial de consulta',
}
const reviewNotes: Partial<Record<DossierFact['review'], string>> = {
  'original-pending': 'Original pendiente de cotejo', disputed: 'Discrepancia por resolver', pending: 'Documentación pendiente',
}
const sections: { id: Section; title: string; icon: Parameters<typeof DossierIcon>[0]['name'] }[] = [
  { id: 'overview', title: 'Resumen', icon: 'book' },
  { id: 'apartment', title: 'El departamento', icon: 'home' },
  { id: 'building', title: 'Edificio y parcela', icon: 'building' },
  { id: 'energy', title: 'Energía y entorno', icon: 'sun' },
  { id: 'sources', title: 'Biblioteca de fuentes', icon: 'source' },
  { id: 'questions', title: 'Por completar', icon: 'question' },
]
const titles: Record<Section, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: '01 / El expediente', title: 'Una mirada completa.', description: 'Lo que sabemos del lugar, desde la parcela hasta cada ambiente.' },
  apartment: { eyebrow: '02 / Escala interior', title: 'El departamento, en detalle.', description: 'Superficies reportadas, estado visible y referencias de la reconstrucción.' },
  building: { eyebrow: '03 / Escala del edificio', title: 'El lugar que lo contiene.', description: 'Identidad, catastro y características del edificio según las bases públicas.' },
  energy: { eyebrow: '04 / Contexto y prestaciones', title: 'Energía y entorno.', description: 'Las fuentes que tenemos y la evidencia que necesitamos para ir más lejos.' },
  sources: { eyebrow: '05 / La evidencia', title: 'Cada dato tiene un origen.', description: 'Una biblioteca de registros públicos, referencias y documentación del proyecto.' },
  questions: { eyebrow: '06 / Próximas piezas', title: 'Un expediente que crece.', description: 'Estas son las preguntas abiertas y los documentos que nos ayudarán a resolverlas.' },
}
const matches = (query: string, text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').includes(query.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es'))

function Status({ status }: { status: DossierFact['status'] }) {
  return <span className={`dossier-status status-${status}`}><span />{statusLabels[status]}</span>
}

function SourceLinks({ ids, onOpen }: { ids: readonly string[]; onOpen: OpenSource }) {
  return <div className="dossier-source-links">{ids.map(id => {
    const source = dossierSources.find(item => item.id === id)
    return source ? <button key={id} onClick={() => onOpen(id)} title={`Ver evidencia: ${source.title}`}><DossierIcon name="source" size={12} />{source.publisher}<span aria-hidden="true">↗</span></button> : null
  })}</div>
}

function Facts({ facts, onOpenSource }: { facts: readonly DossierFact[]; onOpenSource: OpenSource }) {
  return <div className="dossier-facts">{facts.map(fact => <article className="dossier-fact" key={fact.id}>
    <div className="dossier-fact-top"><span className="dossier-field-label">{fact.label}</span><Status status={fact.status} /></div>
    <p className={`dossier-fact-value${String(fact.value).length > 34 ? ' value-long' : ''}`}>{fact.value}{fact.unit && <span> {fact.unit}</span>}</p>
    <span className="dossier-scope">{fact.scope}</span>
    <p className="dossier-fact-note">{fact.note}</p>
    <SourceLinks ids={fact.sourceIds} onOpen={onOpenSource} />
  </article>)}</div>
}

function SourceCards({ sources, onOpen }: { sources: readonly DossierSource[]; onOpen: OpenSource }) {
  return <div className="dossier-source-grid">{sources.map((source, index) => <button key={source.id} className="dossier-source-card" onClick={() => onOpen(source.id)}>
    <div className="dossier-source-card-top"><span className="dossier-source-symbol"><DossierIcon name="source" size={21} /></span><span className="dossier-source-number">{String(index + 1).padStart(2, '0')} <span aria-hidden="true">↗</span></span></div>
    <span className="dossier-source-publisher">{source.publisher}</span><strong>{source.title}</strong><p>{source.description}</p>
    <span className="dossier-source-card-footer">Ver ficha de la fuente <DossierIcon name="arrow" size={15} /></span>
  </button>)}</div>
}

function Questions({ questions, onOpenSource }: { questions: typeof dossierQuestions; onOpenSource: OpenSource }) {
  return <div className="dossier-questions">{questions.map((question, index) => <article key={question.id} className="dossier-question">
    <span className="dossier-question-index">{String(index + 1).padStart(2, '0')}</span><div><h4>{question.title}</h4><p>{question.description}</p><div className="dossier-needed"><DossierIcon name="source" size={14} /><span>{question.needed}</span></div><SourceLinks ids={question.sourceIds} onOpen={onOpenSource} /></div>
  </article>)}</div>
}

function SourceDialog({ source, onClose }: { source: DossierSource; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  const linkedFacts = dossierFacts.filter(fact => fact.sourceIds.includes(source.id))
  return <dialog ref={dialog} className="dossier-dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="dossier-source-title">
    <div className="dossier-dialog-content">
      <div className="dossier-dialog-heading"><span className="dossier-kicker">Ficha de evidencia</span><button className="dossier-icon-button" onClick={onClose} aria-label="Cerrar ficha de fuente" autoFocus><DossierIcon name="close" /></button></div>
      <span className="dossier-dialog-symbol"><DossierIcon name="source" size={27} /></span>
      <p className="dossier-source-publisher">{source.publisher}</p><h2 id="dossier-source-title">{source.title}</h2><p className="dossier-dialog-description">{source.description}</p>
      <dl className="dossier-source-meta"><div><dt>Tipo de fuente</dt><dd>{sourceKinds[source.kind]}</dd></div><div><dt>Consulta o revisión</dt><dd><time dateTime={source.date}>{source.date.split('-').reverse().join('/')}</time></dd></div></dl>
      {source.label && <p className="dossier-caption">{source.label}</p>}
      <div className="dossier-dialog-actions">{source.url && <a href={source.url} target="_blank" rel="noreferrer" className="dossier-button primary">Abrir fuente original <span aria-hidden="true">↗</span></a>}{source.localUrl && <a href={source.localUrl} target="_blank" rel="noreferrer" className="dossier-button">Ver copia disponible <span aria-hidden="true">↗</span></a>}</div>
      {linkedFacts.length > 0 && <div className="dossier-linked-facts"><h3>Datos vinculados <span>{linkedFacts.length}</span></h3>{linkedFacts.map(fact => <div key={fact.id}><span>{fact.label}<small>{fact.scope} · {statusLabels[fact.status]}</small>{reviewNotes[fact.review] && <small className="dossier-review-note">{reviewNotes[fact.review]}</small>}{fact.evidence.filter(item => item.sourceId === source.id).map(item => <small className="dossier-evidence-locator" key={item.locator}>{item.locator}</small>)}</span><strong>{fact.value}{fact.unit && ` ${fact.unit}`}</strong></div>)}</div>}
      <p className="dossier-dialog-footnote">La fecha de consulta y la fecha del dato pueden ser diferentes. El alcance y la precisión se conservan en cada ficha.</p>
    </div>
  </dialog>
}

function SurfaceBreakdown() {
  return <div className="dossier-surfaces">
    <div className="dossier-area-strip" aria-hidden="true">{t3Apartment.rooms.map((room, index) => <span key={room.id} style={{ flex: room.reportedArea }} className={`room-tone-${index}`} />)}</div>
    <table><caption>Superficies transcritas de la captura del plano</caption><thead><tr><th scope="col">Ambiente</th><th scope="col">Superficie</th></tr></thead><tbody>{t3Apartment.rooms.map((room, index) => <tr key={room.id}><th scope="row"><i className={`room-tone-${index}`} />{room.name}</th><td>{number(room.reportedArea, 2)} <span>m²</span></td></tr>)}</tbody><tfoot><tr><th scope="row">Total reportado · Carrez</th><td>{number(t3Apartment.metadata.reportedCarrezArea, 2)} <span>m²</span></td></tr></tfoot></table>
    <p className="dossier-caption">La suma coincide con el total de la captura. El certificado original sigue pendiente de cotejo.</p>
  </div>
}

export function DossierExplorer({ onOpenApartment, onOpenBuilding }: { onOpenApartment: () => void; onOpenBuilding: () => void }) {
  const [section, setSection] = useState<Section>('overview')
  const [query, setQuery] = useState('')
  const [sourceId, setSourceId] = useState<string | null>(null)
  const panel = useRef<HTMLElement>(null)
  const source = dossierSources.find(item => item.id === sourceId)
  const search = query.trim()
  const foundFacts = search ? dossierFacts.filter(fact => matches(search, [fact.label, fact.value, fact.unit, fact.scope, fact.note, fact.section === 'energy' ? 'energía' : '', statusLabels[fact.status], ...fact.sourceIds.map(id => dossierSources.find(source => source.id === id)?.publisher)].join(' '))) : []
  const foundSources = search ? dossierSources.filter(source => matches(search, `${source.title} ${source.publisher} ${source.description}`)) : []
  const foundQuestions = search ? dossierQuestions.filter(question => matches(search, `${question.title} ${question.description} ${question.needed}`)) : []
  const foundObservations = search ? dossierObservations.filter(item => matches(search, `${item.room} ${item.title} ${item.description} ${item.evidence}`)) : []
  const count = foundFacts.length + foundSources.length + foundQuestions.length + foundObservations.length
  const targetBuilding = SITE_BUILDINGS.find(building => building.isTarget)
  function navigate(next: Section) {
    setSection(next)
    setQuery('')
    // Keep the workspace hash intact: these are sections within Documentation.
    if (panel.current && window.scrollY > panel.current.offsetTop) panel.current.scrollIntoView({ block: 'start' })
  }
  function observations(items = dossierObservations) {
    return <div className="dossier-observations">{items.map(item => <article key={item.id}><span className="dossier-observation-room">{item.room}</span><h4>{item.title}</h4><p>{item.description}</p><small>{item.evidence}</small><SourceLinks ids={item.sourceIds} onOpen={setSourceId} /></article>)}</div>
  }
  const overviewIdentity = dossierFacts.filter(fact => fact.section === 'identity').slice(0, 4)
  return <div className="dossier">
    <header className="dossier-hero">
      <div className="dossier-intro"><span className="dossier-kicker"><span className="dossier-live-dot" />El archivo de nuestro T3</span><h2>Un lugar para vivir.<br /><span>Y conocer en detalle.</span></h2><p>El departamento, su edificio y las fuentes que cuentan cómo es. Toda la información reunida, con su origen a la vista.</p><div className="dossier-hero-meta"><span>Quimper, Bretagne</span><span>Revisión documental · 27 sep 2026</span></div></div>
      <div className="dossier-map"><DossierSitePlan /><div className="dossier-map-label"><span className="dossier-map-pin" /><div><strong>Jean-Baptiste Colbert</strong><span>Parcela {SITE_PARCEL.label} · IGN / Catastro</span></div></div><span className="dossier-map-coordinates">{BUILDING_SITE.latitude.toFixed(4)}° N · {Math.abs(BUILDING_SITE.longitude).toFixed(4)}° O</span></div>
    </header>

    <div className="dossier-stats" aria-label="Cifras del expediente">
      <button onClick={() => navigate('apartment')}><span>Superficie del T3</span><strong>{number(t3Apartment.metadata.reportedCarrezArea, 2)}<small>m²</small></strong><div>Carrez reportada <span aria-hidden="true">↗</span></div></button>
      <button onClick={() => navigate('building')}><span>La parcela</span><strong>{number(SITE_PARCEL.area)}<small>m²</small></strong><div>Contenance catastral <span aria-hidden="true">↗</span></div></button>
      <button onClick={() => navigate('building')}><span>Altura del edificio</span><strong>{targetBuilding ? number(targetBuilding.height, 1) : 'Sin dato'}<small>m</small></strong><div>Registro IGN{targetBuilding?.verticalAccuracy != null && ` · precisión ${number(targetBuilding.verticalAccuracy, 1)} m`} <span aria-hidden="true">↗</span></div></button>
      <button onClick={() => navigate('sources')}><span>Evidencia reunida</span><strong>{String(dossierSources.length).padStart(2, '0')}<small>fuentes</small></strong><div>Registros y referencias <span aria-hidden="true">↗</span></div></button>
    </div>

    <div className="dossier-body">
      <aside className="dossier-sidebar"><span className="dossier-kicker">Explorar el expediente</span><nav aria-label="Secciones de documentación">{sections.map(item => <button key={item.id} aria-current={section === item.id && !search ? 'page' : undefined} onClick={() => navigate(item.id)}><DossierIcon name={item.icon} size={17} /><span>{item.title}</span>{item.id === 'questions' && <small>{dossierQuestions.length}</small>}</button>)}</nav><div className="dossier-legend"><span className="dossier-kicker">Cómo leer los datos</span><Status status="official" /><Status status="reported" /><Status status="estimated" /><p>Una fuente pública describe su propio ámbito. Una estimación siempre conserva esa condición.</p></div><button className="dossier-print" onClick={() => window.print()}><DossierIcon name="print" size={16} />Imprimir esta sección</button></aside>

      <section className="dossier-content" ref={panel} aria-label="Contenido del expediente">
        <div className="dossier-content-heading"><div><span className="dossier-kicker">{search ? 'Búsqueda en el expediente' : titles[section].eyebrow}</span><h3>{search ? 'Encontrar entre las fuentes.' : titles[section].title}</h3></div><div className="dossier-search"><DossierIcon name="search" size={17} /><label htmlFor="dossier-search" className="sr-only">Buscar en el expediente</label><input id="dossier-search" type="search" placeholder="Buscar un dato o una fuente…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><DossierIcon name="close" size={15} /></button>}</div></div>
        <p className="dossier-section-description" aria-live="polite">{search ? `${count} ${count === 1 ? 'resultado' : 'resultados'} para “${search}”` : titles[section].description}</p>

        {search ? <div className="dossier-search-results">{count === 0 && <div className="dossier-empty"><DossierIcon name="search" size={28} /><h4>No encontramos ese dato.</h4><p>Probá con “superficie”, “catastro” o “energía”.</p><button className="dossier-button" onClick={() => setQuery('')}>Volver al expediente</button></div>}{foundFacts.length > 0 && <><h4 className="dossier-subheading">Datos y características</h4><Facts facts={foundFacts} onOpenSource={setSourceId} /></>}{foundSources.length > 0 && <><h4 className="dossier-subheading">Fuentes</h4><SourceCards sources={foundSources} onOpen={setSourceId} /></>}{foundQuestions.length > 0 && <><h4 className="dossier-subheading">Preguntas abiertas</h4><Questions questions={foundQuestions} onOpenSource={setSourceId} /></>}{foundObservations.length > 0 && <><h4 className="dossier-subheading">Estado observado</h4>{observations(foundObservations)}</>}</div>
        : section === 'overview' ? <>
          <div className="dossier-overview-grid"><article className="dossier-summary-card"><div className="dossier-card-eyebrow"><DossierIcon name="home" size={18} /><span>Departamento / T3</span><Status status="reported" /></div><div className="dossier-apartment-summary"><div><h4>Ocho ambientes.<br />Una misma historia.</h4><p>Dos dormitorios, living, cocina y espacios de servicio. Balcón y cave consignados por separado.</p><button className="dossier-text-button" onClick={() => navigate('apartment')}>Explorar superficies <DossierIcon name="arrow" size={16} /></button></div><DossierApartmentPlan /></div><div className="dossier-card-foot">Plano reconstruido · proporciones estimadas</div></article>
          <article className="dossier-summary-card dossier-address-card"><span className="dossier-kicker">Identidad del lugar</span><h4>1ter impasse<br />Jean-Baptiste Colbert</h4><p>29000 Quimper · Finistère</p><div className="dossier-address-detail"><span>Un edificio, tres direcciones</span><strong>1 · 1 bis · 1 ter</strong><small>Relación explícita en el registro RNB.</small></div><button className="dossier-text-button" onClick={() => navigate('building')}>Consultar edificio y parcela <DossierIcon name="arrow" size={16} /></button></article></div>
          <div className="dossier-note"><span className="dossier-note-icon"><DossierIcon name="question" size={21} /></span><div><h4>Una pieza importante por confirmar: el piso.</h4><p>El plano indica «4e étage» y la reconstrucción está ubicada en un tercer piso estimado. Conservamos ambas referencias hasta cotejar el documento del departamento.</p></div><button onClick={() => navigate('questions')} aria-label="Ver pendientes y discrepancia de piso"><DossierIcon name="arrow" size={19} /></button></div>
          <div className="dossier-section-line"><h4>La identidad, documentada</h4><button className="dossier-text-button" onClick={() => navigate('sources')}>Ver todas las fuentes <span aria-hidden="true">↗</span></button></div><Facts facts={overviewIdentity} onOpenSource={setSourceId} />
          <div className="dossier-model-links"><button onClick={onOpenApartment}><DossierIcon name="home" size={22} /><span><strong>Recorrer el departamento</strong><small>Volver al interior y su luz</small></span><DossierIcon name="arrow" /></button><button onClick={onOpenBuilding}><DossierIcon name="sun" size={22} /><span><strong>Mirar el edificio y el sol</strong><small>Situarlo en su entorno</small></span><DossierIcon name="arrow" /></button></div>
        </> : section === 'apartment' ? <>
          <div className="dossier-apartment-layout"><SurfaceBreakdown /><figure className="dossier-plan-card"><a href="/dossier/apartment-plan.png" target="_blank" rel="noreferrer" aria-label="Abrir captura del plano y sus superficies"><img src="/dossier/apartment-plan.png" alt="Plano proporcional del T3 con las superficies reportadas y la referencia al diagnóstico" /></a><figcaption>La referencia que tenemos hoy.<span>Áreas transcritas; formas y longitudes estimadas.</span></figcaption><a href="/dossier/apartment-plan.png" target="_blank" rel="noreferrer" className="dossier-text-button">Abrir plano completo ↗</a></figure></div>
          <h4 className="dossier-subheading">Superficies, anexos y dimensiones</h4><Facts facts={dossierFacts.filter(fact => fact.section === 'apartment' && !fact.roomId)} onOpenSource={setSourceId} />
          <div className="dossier-section-line"><h4>Lo que muestran las referencias</h4><Status status="observed" /></div>{observations()}<p className="dossier-caption">Observaciones recogidas en el índice de 11 fotografías y 4 videos. La presencia de un elemento no confirma su dimensión ni sus prestaciones.</p>
        </> : section === 'building' ? <><div className="dossier-building-lead"><div><span className="dossier-kicker">Del catastro al edificio</span><h4>La parcela, la huella<br />y el volumen.</h4><p>Son escalas distintas del mismo lugar. Cada superficie y altura conserva su definición y la precisión de su fuente.</p><button className="dossier-text-button" onClick={onOpenBuilding}>Ver el contexto en 3D <span aria-hidden="true">↗</span></button></div><div className="dossier-building-map"><DossierSitePlan /><span>Geometría IGN y catastro · norte arriba</span></div></div><Facts facts={dossierFacts.filter(fact => fact.section === 'identity' || fact.section === 'building')} onOpenSource={setSourceId} /></>
        : section === 'energy' ? <><div className="dossier-energy-intro"><span className="dossier-energy-icon"><DossierIcon name="sun" size={31} /></span><div><span className="dossier-kicker">La próxima capa del expediente</span><h4>Conocer sus prestaciones,<br />a partir de sus documentos.</h4><p>El DPE del departamento todavía no está identificado. Los diagnósticos asociados al grupo de edificios no se atribuyen automáticamente a este T3.</p></div></div><div className="dossier-energy-types"><div><span>01</span><h4>Diagnóstico energético</h4><p>Prestaciones convencionales y método del DPE.</p></div><div><span>02</span><h4>Coste estimado</h4><p>Rango del diagnóstico y precios de referencia.</p></div><div><span>03</span><h4>Consumo real</h4><p>Facturas, energía y período medido.</p></div></div><Facts facts={dossierFacts.filter(fact => fact.section === 'energy' || fact.section === 'context')} onOpenSource={setSourceId} /></>
        : section === 'sources' ? <><div className="dossier-library-note"><DossierIcon name="check" size={18} /><p>Cinco servicios públicos reconsultados el 27/09/2026. Las demás referencias conservan su alcance y sus pendientes.</p><a href="/dossier/official-sources-2026-09-27.json" download><DossierIcon name="download" size={16} />Descargar extracto</a></div><SourceCards sources={dossierSources} onOpen={setSourceId} /></>
        : <><div className="dossier-questions-intro"><DossierIcon name="book" size={23} /><p>El próximo documento puede convertir una hipótesis en un dato respaldado. Estas preguntas mantienen visible lo que todavía no sabemos.</p></div><Questions questions={dossierQuestions} onOpenSource={setSourceId} /></>}
      </section>
    </div>
    <footer className="dossier-footer"><span><DossierIcon name="book" size={14} />T3 · Expediente documental</span><p>Registros públicos, referencias aportadas y estimaciones identificadas.</p><span>Quimper · Septiembre 2026</span></footer>
    {source && <SourceDialog key={source.id} source={source} onClose={() => setSourceId(null)} />}
  </div>
}
