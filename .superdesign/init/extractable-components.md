# Extractable patterns
## AppHeader
- Source: `apps/web/src/App.tsx`
- Category: layout
- Description: Project title, stage badge and area metadata.
- Extractable props: activeView (string)
- Hardcoded: T3 Designer title, labels, CSS, project location.

## CameraViewButtons
- Source: `apps/web/src/App.tsx`
- Category: basic
- Description: Segmented perspective/top camera controls.
- Extractable props: mode (string)
- Hardcoded: Perspective/top labels, CSS.

## DisplayOptions
- Source: `apps/web/src/App.tsx`
- Category: basic
- Description: Compact checkbox layer fieldset over viewport.
- Extractable props: cutaway, showFixtures, showLabels (boolean)
- Hardcoded: Layer labels, CSS.

## EvidenceNotes
- Source: `apps/web/src/App.tsx`
- Category: basic
- Description: Collapsed source and reconstruction limitations disclosure.
- Extractable props: none
- Hardcoded: Source text, heading, CSS.
