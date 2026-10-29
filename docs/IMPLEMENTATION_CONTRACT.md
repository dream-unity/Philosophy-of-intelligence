# Current implementation contract

The current practice interface is manual and shared across all fourteen shapes. Legacy authored-challenge modules remain for archived-data compatibility and historical tests; they must not reintroduce quiz missions or scoring into the current practice routes.

## Shared page and routing

`FormTraining.mount({root, stageId, onStageChange})` mounts the practice interface and returns `{setStage, pause, hasDraft, destroy}`. `#practice/<stageId>` selects a shape; the earlier `#studio` route forwards to practice. `app.js` owns routing, page visibility, the home composition and access to the earlier archive.

One mounted controller owns exercise selection, settings, timer/audio lifecycle, optional note drafts and its manual store. A stage or exercise change ends the current period; opening the return form pauses it. Hiding the page or leaving practice pauses it. Drafts are kept per shape/exercise during this mount and are not browser-persisted. The app uses a `beforeunload` warning for unfinished writing and accepted records that could not be persisted. Active timers are not restored after reload.

## Shape content: `FormShapePractice`

`STAGES` is the immutable ordered set of fourteen teaching configurations. Each has `id`, `name`, `verb`, `defaultLag`, `theory`, separate `heart` and `body` objects containing `notice`, `recall`, `relate`, `revise`, and a `readiness` checklist. `getStage(id)` falls back to Circle. `INTRO` and `BREATH_BACK` state the teaching and return principles.

Shape identifiers are `circle`, `half-circle`, `triangle`, `square`, `pentagon`, `hexagon`, `prism`, `heptagon`, `octagon`, `cube`, `dodecahedron`, `icosahedron`, `geodesic`, `sphere`. Readiness is the learner's reversible assessment for both exercises; it is never inferred from duration, notes, sensations or breathing.

## Exercises: `FormExercises`

`HEART_DURATIONS` is `[15,30,60,120,180]` and `BODY_DURATIONS` is `[15,30,60]`, in minutes for the UI. `BREATH_SECONDS` is 5 and `BODY_STEP_SECONDS` is 30. `HEART_PHASES` defines the three phases; `BODY_STEPS` defines the seven ordered mapping dimensions. `FREQUENCIES` is `[0,1,2,3,8,10,12]`, with zero meaning no ambient pad.

`new ExerciseClock({exercise, duration, now?, onTick?, onComplete?})` takes a duration in **seconds**, unlike the UI choices. Methods are `start()`, `tick()`, `snapshot()`, `pause()`, `resume()` and `end()`. Status is `idle|running|paused|completed|ended`. Snapshots include elapsed/remaining seconds, normalized progress, heart phase index, breath phase and remainder, body-step index and remainder. Heart transitions occur at 0.33 and 0.66 progress; body steps wrap every seven 30-second intervals. Paused time does not accrue. Completion fires once.

`new ExerciseAudio(options?)` supports injected audio/timer facilities for tests. Methods are `start({frequency,bellVolume})`, `cue(inhale)`, `complete()`, `stop()` and `destroy()`. Audio starts only through a deliberate user action. It uses synthesized bowls and ambient sound, not downloaded media. Pause/end/navigation must stop active cues; teardown must clean up owned timers and audio nodes. A sound failure must leave the exercise usable silently.

The UI defaults to natural breathing and sound off. Optional paced breathing has five seconds per phase, no holds and no adjustable physiological target. No timer or audio event commits an observation or establishes readiness.

## Private manual store: `FormTrainingStore`

`createStore(storage)` returns getters `data`, `writable`, `warning`, `originalRaw`, plus `save(nextData)`, `exportJSON()`, `reset()` and `reload()`. The module exports `STORAGE_KEY`, `STAGE_IDS` and `LIMITS`. The storage key is `poi.manual-practice.v1`; legacy `form.progress.v1` is not read or changed by this module.

The active object is:

```text
{schemaVersion: 1, entries: [], sessions: [], readiness: {}}
```

An entry contains `id, stageId, exercise, streamId, createdAt, source, recollection, referenceId, referenceSource, lag, relation, revision`. Exercise is `heart|body`; lag is an integer 1–4; source is required nonempty text. Optional narrative fields default to empty strings, and an empty reference ID becomes null. Dates are valid UTC ISO timestamps. All text fields have a 3,000-character maximum.

The referenced observation must be the exact lag target among earlier entries in the same shape, exercise and stream. Its source snapshot must match the original exactly. Existing entries cannot be edited, removed or reordered through `save`; only appending is allowed. The UI locks the present observation and recollection before revealing the earlier source, then adds a relation and revision before saving the complete entry. Later corrections require new entries.

A session contains `id, stageId, exercise, endedAt, seconds, completed`; seconds is finite and nonnegative. Readiness maps a shape ID to `{heart:boolean, body:boolean}`. Each collection has a limit of 500. Unsupported fields, invalid records, duplicate identifiers and overflow cause rejection, never silent shortening or deletion.

`data` returns a defensive copy. `save`, `reset` and `reload` return `{ok,error}`. Validation failure leaves active data unchanged. A valid candidate becomes active in memory even if persistence fails, so `exportJSON()` includes that accepted work. The UI clears an accepted note by checking its new ID in `store.data`, not solely by checking `ok`.

Before writing, the store compares the current browser value with its last observed baseline. A conflict blocks writes without overwriting the external value. Invalid stored content is preserved and blocks automatic writes. `originalRaw` provides the unchanged stored value for explicit recovery download. A quota/access failure leaves accepted data exportable and can be retried. The UI offers an explicit, confirmed Load saved version action and preserves its unfinished form drafts. Store reload replaces active committed data only when the stored value validates; reset clears only the manual key and requires UI confirmation. Export or copy unfinished work before either action.

`exportJSON()` returns the complete active manual object, including private text. It must be called for a deliberate download action. There is no manual-record import feature. Drafts and an active clock are not part of this object.

## Legacy archive and offline build

The archive continues using `FormProgress` and its separate original schema/key. Its import, export and reset controls apply only to that archive. Older quiz records do not become new readiness assessments. Historical curriculum, session, progress, breath and lab code may remain in source/build compatibility paths; current navigation does not expose the old missions.

`FormGeometry` supplies the same accessible shape SVGs. `scripts/build.mjs` embeds local scripts, styles, textures and artwork in source order; no runtime downloads are introduced. Tests must distinguish legacy-module compatibility from the current manual-practice behavior.

## Invariants

- Only shape tiles navigate from the home symbol composition; its medallions are descriptive.
- One practice page provides distinct instructions for every shape in both exercises.
- Breath-back counts marked observations, never inhalations, seconds or clicks.
- Original observations and reference snapshots stay immutable; private text is escaped when rendered.
- Readiness is explicit, reversible and personal. No quiz score, badge threshold or timer completion substitutes for it.
- Natural breathing, stopping and silent practice remain available. No sensor readings, medical effects or universal optimal pace are claimed.
- Drafts are not silently represented as saved; failures retain accepted in-tab records for export.
- Current practice and the earlier archive remain separate. No analytics, remote AI calls or automatic personal-data upload are introduced.
