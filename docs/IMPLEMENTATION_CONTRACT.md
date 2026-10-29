# Current implementation contract

One manual component serves fourteen shapes and three settings. Circle selects one explicit conceptual relationship (ocean contains boat), even though it has two participants. Half-circle coordinates two distinct conceptual meanings between its participants. The circular frame is not an extra self-loop; object/property lists are not the curriculum. The previous authored quiz, session and laboratory lesson engines are removed; retaining archive data does not require executing them.

## Routing and lifecycle

`FormTraining.mount({root, stageId, onStageChange})` returns `{setStage, pause, hasDraft, destroy}`. `#practice/<stageId>` selects a shape; `#studio` forwards to practice. `app.js` owns routing, visibility, the home composition and archive access.

One controller owns exercise settings, timer/audio lifecycle, drafts and its store. Stage/exercise changes end the current period. Opening notes, leaving practice or hiding the page pauses it. Drafts are scoped to shape/exercise and kept during the mount, not across reloads. Unfinished writing and accepted unsaved records activate the unload guard. Timers do not resume after reload.

## Content and models

`FormShapePractice.STAGES` is the ordered immutable teaching configuration. `getStage(id)` falls back to Circle. `INTRO` and `BREATH_BACK` state the common method. Each exercise supplies receive/encode, retrieve, compare and revise guidance plus four examples. `FormRelationalModels.getModel(stageId, exercise)` provides an inspectable model.

IDs in order: `circle`, `half-circle`, `triangle`, `square`, `pentagon`, `hexagon`, `heptagon`, `octagon`, `prism`, `cube`, `dodecahedron`, `icosahedron`, `geodesic`, `sphere`. Working counts: `1,2,3,4,5,6,7,8,9,12,30,30,120,120`. The final two counts describe the specified models, not intrinsic counts of their geometric names.

Models identify stage, exercise, preparation, relationship count, nodes and typed relationships; optional faces describe topology. Frozen static models are distinct from user records. Prepared constructions and partial patches must not be represented as spontaneous complete structures.

## Ordered note capture

The form implements N over 1–4 committed observations within the same shape, exercise and stream. A timer tick or bell does not create an entry or establish an actual breath anchor.

With history available, source-lock freezes the current source, lag and exact target snapshot before showing the recollection field. Recollection must be supplied before reveal. Reveal freezes it and exposes the original; comparison and revision follow, then commitment. Initial entries seed history without a fabricated reference. Draft locks are not persistence events. After a reload, a locked draft whose exact target is absent cannot be committed or silently retargeted. Its recovery action downloads the unfinished fields and frozen target, then starts fresh history with the same current source.

## Exercise engine

`FormExercises` exposes `STREAM_DURATIONS=[15,30,60]`, `HEART_DURATIONS=[15,30,60,120,180]` and `BODY_DURATIONS=[15,30,60]` in UI minutes. `BREATH_SECONDS=5`, `BODY_STEP_SECONDS=30`; `HEART_PHASES`, `BODY_STEPS` and `FREQUENCIES=[0,1,2,3,8,10,12]` retain source exercise and audio choices.

`ExerciseClock({exercise, duration, now?, onTick?, onComplete?})` takes **seconds**. Methods: `start`, `tick`, `snapshot`, `pause`, `resume`, `end`. Status: `idle|running|paused|completed|ended`. Paused time does not accrue; completion fires once. Heart boundaries are 0.33/0.66 of duration; body dimensions repeat every seven 30-second intervals.

`ExerciseAudio` supports `start({frequency,bellVolume})`, `cue(inhale)`, `complete`, `stop` and `destroy`. Sound is locally synthesized, explicitly activated and stopped on pause/end/navigation. Heart initially has paced breathing and phase bells independently of ambient sound. Stream/body initially use natural breathing and silence; stream has no automatic phase-bell cadence. Audio failure must leave practice usable.

## Manual store and compatibility

`FormTrainingStore.createStore(storage)` exposes `data`, `writable`, `warning`, `originalRaw`, `save`, `exportJSON`, `reset` and `reload`. Key: `poi.manual-practice.v1`. Schema: `{schemaVersion:1, entries:[], sessions:[], readiness:{}}`.

Entry fields: `id, stageId, exercise, streamId, createdAt, source, recollection, referenceId, referenceSource, lag, relation, revision`. Exercise accepts `stream|heart|body`. Source is required; text is bounded to 3,000 characters. A supplied reference must preserve the exact target ID and source text at the declared lag. Existing observations cannot be edited, removed or reordered through `save`.

Session fields: `id, stageId, exercise, endedAt, seconds, completed`. Both collections have a 500-record limit. Starting a new recorded timer is blocked once the session limit is reached; untimed practice remains available. Readiness is a personal Boolean per exercise. Existing v1 heart/body assessments remain valid; missing stream readiness becomes false in memory without an automatic storage write. Unknown fields, malformed data and overflow are rejected without trimming private text.

`data` returns a defensive copy. `save`, `reset`, `reload` return `{ok,error}`. Valid accepted work stays exportable in memory if persistence fails. Before writes, the store checks its saved baseline; conflicting changes block replacement. Corrupt originals remain accessible through `originalRaw`. Reset affects only this key. Reload/reset require deliberate UI handling. Export includes committed private records, not drafts or the clock. No current-practice import is provided.

## Archive and build

`FormProgress` retains the separate `form.progress.v1` schema, validation and archive controls. Archived active-session content remains inert, without restoration by a lesson engine. Navigation must not rewrite archive bytes. Removing lessons does not authorise deleting user records.

`FormGeometry` supplies the existing accessible SVGs. `FormModelView.render(model, breathNumber, selectedRelationId)` renders each complete semantic network with numbered roles and optional relationship highlighting. Its high-shape layouts are checked against the geometric meshes. `scripts/prepare-homepage.mjs` renders static shape links and hashes linked assets. `scripts/build.mjs` embeds local resources in application order in both offline filenames. Home artwork and styling remain unchanged.

Checks cover all fourteen routes, three settings and four examples per setting; encoding before retrieval; source/recollection locks; exact N-target isolation; archive preservation; manual readiness; and clock/audio cleanup. Shapes do not claim validated capacities, physiological outcomes or IQ values.
