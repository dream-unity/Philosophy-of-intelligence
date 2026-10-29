# FORM implementation contract

FORM is a buildless, offline-capable browser game, not a reskin of Sentience N-back. Modules are plain scripts with UMD-style `module.exports` for Node tests and named `globalThis` exports for the browser. No runtime dependencies, remote fonts, analytics, AI calls or external audio. Each module owns only its assigned files.

## Names and order

`circle`, `half-circle`, `triangle`, `square`, `pentagon`, `hexagon`, `prism`, `heptagon`, `octagon`, `cube`, `dodecahedron`, `icosahedron`, `geodesic`, `sphere`.

Labels run 70..200 by 10. They are symbolic philosophy labels, never measured IQ or a graduation prerequisite. Routes are `journey`, `practice/:stageId`, `studio`, `palace` and `philosophy`; `philosophy/lab` opens the model-lab section. No clinical outcomes.

Classic-script load order: curriculum, progress, breath, geometry, session, lab, app. The source edition and single-file offline build preserve this order.

## Curriculum / challenge API (global FormContent)

`STAGES`: array with `{id,index,name,label,verb,chapter,tagline,description,lesson,workedExample,breathBridge,steps:[{title,body}],skills:[...],lagUnit}`. Content must be concrete and concise.

`generateChallenge(stageId,{seed,ordinal,history=[],lag=1,focusFeature=null})` returns a serializable challenge:

```
{
 id,stageId,kind:'choice'|'connect'|'order'|'mapping'|'function'|'sequence'|'recall'|'warmup',
 title,prompt,source:{title,body,items:[{id,label,value?,color?,shape?,role?}]},
 secondary?:{title,body,items:[...]},
 study?:{title,body,items:[...]},
 options?:[{id,label,detail?}],
 nodes?:[{id,label,value?}],
 left?:[{id,label}],right?:[{id,label}],
 steps?:[{id,prompt,options:[{id,label}]}],
 answer: string | string[] | {[key:string]:string},
 explanation,hint,principle,transferPrompt,
 channel:'observation'|'binding'|'relation'|'mapping'|'function'|'revision',
 channels?:{...}, expectedClass?:'match'|'nonmatch'|'unknown',
 memoryRecord?:{id,label,features:{color,shape,value},locus},
 reference?:{id,label,...},warmup?:boolean,
 focusFeature?:'color'|'shape'|'value'|null,comparedFeature?:string|null
}
```

All kinds have objective answers from supplied material. Recall requires study then hidden recall. `connect` is ordered two-node selection with a declared direction. `order` is ordered selection of all options. `mapping` maps left ids to unique right ids. `function` and `sequence` use `steps` and an answer object keyed by step id. Keep at most three steps per challenge. Choices are shuffled deterministically. `evaluateChallenge(challenge,response)` returns `{correct,channelResults:{channel:{correct,total}},explanation}`. `answerFor(challenge)` returns a deep clone of the correct response (tests/tutorial only).

Square generates exact N-back comparisons. History consists only of prior committed `memoryRecord`s; first N are warmup. A warmup still has a source and memoryRecord; it is not scored. Square has separate `binding` and `relation` steps so correct identity cannot substitute for correct comparison. Other stage memory is supported independently; don't pretend every advanced task is N-back. Every new source must be immutable after generation. Seed/ordinal determine variation. Never encode answers into option position.

`focusFeature` fixes Square's comparison lens; `null` requests mixed features. The session layer permits a fixed lens only in guided Square missions. Independent missions always use mixed features. Sequential evidence belongs to its step and must not appear before earlier responses have been committed.

## Session API (global FormSession)

`create(stageId,{mode,lag,target,seed,id,focusFeature})` returns an immutable session. Modes are `guided|independent|explore`; scored targets are 8 or 20. Square uses lag 1..4 committed observations; other stages use lag 0 and unit `none`. Guided Square defaults to the `color` lens; explicit `null` means mixed. Settings remain fixed for the mission.

- `setResponse(session,response)` accepts valid responses only during `respond`. A sequential response must extend the existing prefix by one step; earlier steps lock, while the final choice can change before submission.
- `responseComplete(challenge,response)` checks response completeness. `stepProgress(session)` returns `{currentIndex,visibleCount,lockedIds,complete}`; the UI renders only the permitted steps.
- `resetResponse(session)` archives the previous response and revealed depth, clears the current response and permanently marks the attempt aided. The latest 16 response revisions are retained; `resetCount` preserves the fact of earlier resets.
- `reveal(session)` permanently marks help use. `finishStudy(session)` advances recall from study to response. `commitWarmup(session)` commits an unscored record.
- `submit(session,{skip})` returns `{session,attempt}`; an invalid or duplicate submission returns a null attempt. Skip gives no credited channels. `advance(session)` commits the current memory occurrence once and moves to the next challenge or completion.
- `pause(session)` and `resume(session)` preserve the current operation. `sessionRecord(session,complete)` creates the progress-log record.
- `restore(raw)` returns a paused, reconstructed session or `null`. It regenerates challenges from seed and committed history, checks occurrence order and response prefixes, and reconstructs current feedback rather than trusting imported explanations or scores. Completed missions are not restored as active sessions.

## Progress API (global FormProgress)

`defaultProgress()` returns `{schemaVersion:1,preferences,attempts,sessions,palace,journal,activeSession}`. `STORAGE_KEY` is `form.progress.v1`; defaults are conservative. `loadProgress(storage)` returns `{state,warning}`; `saveProgress(storage,state)` returns `{ok,error}`; `validateProgress(raw)` accepts a JSON string or plain object and returns sanitized state or throws. `clearProgress()` returns fresh state.

`recordAttempt(state,attempt)` and `recordSession(state,session)` return new states with deduplicated IDs. Attempt fields are `{id,stageId,mode,lag,lagUnit,correct,aided,tutorial,at,sessionId,channelResults,expectedClass?,responseClass?}`. Session fields are `{id,stageId,mode,lag,lagUnit,complete,at,attemptIds}`. Warmups are excluded; aid status cannot be cleared by submitting a duplicate.

`stageSummary(state,stageId)` returns `{attempts,correct,accuracy,independentCount,practiceComplete,ready,mastered,days,stars,channels}`. Practice completion requires a completed session with at least six qualifying attempts and 75% accuracy. Mastery requires two distinct UTC dates, each with at least twenty unaided independent attempts from completed sessions at the same lag/unit, 85% whole-challenge accuracy and 85% in every required channel. Nonmatch accuracy must reach 90% where applicable; Square needs at least five match and five nonmatch trials per qualifying date. Two dates do not imply a 24-hour interval. All summaries use retained stage-specific evidence.

`exportProgress(state,{includePrivate:false})` returns a JSON-safe validated object; default export removes the journal, private Palace entries and active session. `importProgress(raw)` validates the same schema. The app writes compact JSON. Its own valid exports must round-trip without shortening included private records; unsaved form drafts and model-lab state are not export data.

`canStorePrivate(state)` checks whether a proposed Palace/journal state fits validation and capacity; callers treat any falsy result as refusal. `LIMITS` sets 128 Palace entries, 100 journal entries and an 8 MiB combined collection budget, measured as compact UTF-8 JSON. Private size/count violations throw `FORM_PRIVATE_LIMIT` rather than truncate. Most private fields allow 3,000 characters; an entry allows twenty later notes and twenty evidence records. Attempts roll to the newest 3,000 records within 4 MiB; sessions roll to the newest 1,000 within a separate 4 MiB. Imports allow at most 32 MiB; active-session data is bounded to 256 KiB.

The app checks proposed private writes before replacing state. At capacity it leaves the draft unsaved in its form. Browser quota failures can occur below these budgets and must produce a visible warning with an export route. Cross-tab storage events, plus a pre-write snapshot comparison, pause older state and block writes; offer export of that tab's committed data and reload of the saved version. Do not merge automatically or claim browser local storage is encrypted or transactional.

### Private predictions and evidence

From Heptagon onward, the studio optionally commits `prediction:{condition,expected,revisionTrigger,committedAt}` with an observation. All three form fields must be supplied together. Original source and prediction stay unchanged. Later `evidence:[{observation,verdict,revision,at}]` records append separately; verdict is `supports|challenges|unclear`, and evidence cannot predate the prediction. General later notes remain in `revisions:[{text,at}]`. Predictions, evidence or personal revisions make an entry private. These are the user's unscored interpretations, not truth judgments made by FORM.

## Model-lab API (global FormLab)

`mount(container)` returns `{getState,reset,destroy}`. Mounting again destroys the previous controller for that container. `getState()` returns a copy; `destroy()` removes listeners and markup. The lab is unscored and remains only in memory until reset/reload; it has no progress, export, breath or mastery dependency.

Pure exports: `createState()`, `transition(state,action)`, `candidatePrediction(model,input)`, `observeMachine(input,context)`, `withinModelScope(input,context)` and `compareModels(evidence)`. Models are `add2|double`, inputs are integers 0..8 and contexts are `green|amber`. The declared reference region is green 0..6. The authored machine adds two there and doubles elsewhere.

Actions are `choose-model`, `choose-input`, `choose-context`, `reveal-example`, `commit`, `observe`, `revise` and `reset`. The immutable lifecycle is `configure → committed → observed → configure`. Committing freezes the settings, prediction, scope status and available evidence IDs before the outcome is revealed. Revision preserves prior tests and evidence. `compareModels` counts distinct in-scope conditions and returns `{total,add2:{agrees,differs},double:{agrees,differs},compatible}`. Repeated deterministic observations do not increase evidence coverage. Results outside the reference region are extrapolations, not automatic refutations of the bounded model.

## Breath API (global FormBreath)

Class `BreathGuide({onTick,onState,config})`; methods `start()`, `pause()`, `resume()`, `stop()`, `setConfig({inhale,exhale,sound,volume})`, `getSnapshot()`, `destroy()`. Start/resume is called from a user gesture. Default 4s inhale/4s exhale, no holds; adjustable 2..8s each; optional free mode is app-controlled. Sound is off by default and uses WebAudio only, with soft distinct phase tones. Both callbacks receive a snapshot with `phase:'inhale'|'exhale'`, phase-local `elapsed`/`duration` in seconds, `progress` 0..1, zero-based `cycle`, `totalElapsedMs`, `running`, `status` and copied `config`. Status is `idle|running|paused|destroyed`. Sound stops on pause/stop/destroy; resume must not burst missed ticks. No trial advancement or scoring in this module. Export pure `phaseAt(elapsedMs,config)` and `sanitizeConfig` plus `DEFAULT_CONFIG`. The phase clock is independent from training; the app pauses it when hidden.

## Geometry API (global FormGeometry)

`shapeSVG(stageId,{size=240,progress=0,color='#237a72',animated=false,label})` returns accessible standalone SVG markup (no script, no external assets). All14 distinct shapes, accurate wireframe 3D solids. `miniIcon(stageId,size=24)` convenience. `relationSVG(nodes,edges,{width=500,height=200})` uses nodes ids/labels with generated layout, edges `{from,to,label}`. Escape labels. No global infinite RAF; CSS handles optional motion, reduced-motion honored. SVG stage meshes can visually accumulate edges using progress. Support a clean ivory/teal/coral editorial visual theme.

## Module boundaries

`curriculum.js` owns authored challenges; `session.js` owns trial transitions; `progress.js` owns validation, persistence data and summaries; `breath.js` owns the optional clock/audio; `geometry.js` owns SVG output; `lab.js` owns the transient model experiment. `app.js` owns DOM integration, routing, storage-conflict handling and private form commits. Build/check scripts package and verify the same sources without introducing runtime dependencies.

## Runtime invariants

No hidden breathing sensor or medical-safety claims. Pacer is optional, comfortable and never a deadline; no forced breath holds. No typing or private narratives required to score. Preserve source records, append revisions, distinguish supported learning from measured independent tasks, pause when tab hides, freeze session settings, prohibit duplicate submissions, avoid script injection from imported text, export without personal content by default, validate import sizes and schema. All14 stages must be functional, not locked placeholders.
