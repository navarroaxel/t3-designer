# T3 Designer design system
A spatial design studio for understanding one measured apartment and its building in Quimper. The apartment view is an editable design foundation; the building view explores geometry, neighbors and physically oriented sunlight throughout the year.

Preserve the existing Inter/system sans font, cream page (#f9faf6), warm white panels (#fffefa), slate/sage ink (#354139), muted sage (#7d8978), subtle borders (#e0e5db), and selected sage (#eaf0e1). Solar interactions add restrained ochre (#ac7d37), pale sunlight (#f4e9ce), and dark sage (#4c6150). No decorative branding marks, gradients, external assets or invented property photography.

A prominent interactive scene fills the left area; a 300px right inspector contains date, local time, season presets, daily playback and solar readings. Corners 6–10px. Calm spacing, small uppercase section labels and a 36px time display. Use a compact altitude arc to relate the control to the daily cycle. Explicit source/accuracy disclosures appear after controls, not over the scene. A responsive layout stacks scene and inspector on narrow screens, with touch controls of at least 40px height. The active building viewport has a schematic architectural background only in the design draft; the implementation is a Three.js georeferenced model.

Keep UI Spanish. State the Europe/Paris timezone and handle DST without silently interpreting local user time in the browser timezone. Playback is user-triggered, loops across one selected calendar day and can be paused. No unsolicited animation.
