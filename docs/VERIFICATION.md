# Verification — manual heart and body training

Verified 29 October 2026.

## Automated checks

- 174 Node tests cover the current manual flow and the retained legacy data modules.
- All 14 shape routes use one mounted practice controller and provide both exercise applications.
- Tests execute the actual training UI event handlers, clock, content and storage modules: exact two-back recall, source concealment before reveal, locked recollection, separate shape/exercise streams, preserved drafts, and reversible readiness.
- Heart practice starts with the five-second inhale/exhale pacer and its independent bell enabled after Begin. Tests check the first cue and every phase boundary, visible mute/unmute, silent natural breathing, ambient independence, and no duplicate cues on resume. Body practice retains its natural/silent default.
- Heart phases transition at the source 33% and 66% boundaries; optional pacing alternates every five seconds. Mapping changes every 30 seconds and repeats all seven dimensions. Source bowl parity is preserved across the repeated seven-step sequence.
- Pauses exclude inactive time. Late ticks do not accumulate drift or repeat completion. A completed or ended timer never grants readiness.
- Audio tests cover explicit activation, unavailable Web Audio, both ambient bands, bowl synthesis, cancellation of delayed completion cues, and cleanup on pause/navigation/destroy.
- Storage tests preserve corrupt originals, reject altered source snapshots, detect cross-tab conflicts, retain quota-failed work for export, and keep unload protection active. New manual practice never rewrites the legacy archive during navigation.
- Offline build embeds all linked scripts, styles, artwork and fonts/assets; syntax, resource order and no-runtime-network checks pass. Static homepage links and content-hash asset versions are checked.

## Browser verification

Desktop preview: opened a shape from the static homepage, began paced Heart-Coherence, switched to natural breathing, opened a breath-back return and confirmed that the timer paused. Saved a synthetic observation, recorded its recollection before revealing the preserved source, verified the two fields became read-only, and saved a comparison. Ended practice and switched to Body-Sensation Mapping; confirmed the seven dimensions, rereading controls, and separate stream.

Responsive preview: inspected 390-pixel and 768-pixel frames. Layout remains within its viewport; shape selection, titles, exercise choices and the manual guide remain readable. On smaller screens the shape guide follows the exercise before optional notes and readiness. Homepage symbol assets and main-artwork sizing are unchanged. Shape-card SVG boxes are now 120px on wide screens and up to 96px on narrower screens, capped to card width. The visible desktop Circle measures 86px across, up from 57.3px in the previous release (50% larger); the artwork retains the same measured 764px square and position in the 1363 × 936 browser viewport. All 14 labels clear their icons on desktop and at 390px, and the 768px cards also show the larger 96px icons.

The browser checks use synthetic QA notes, not personal observations. Full-duration timing and completion are tested with a controlled clock rather than waiting through multi-hour sessions. Synthesized audio is verified structurally; no physiological measurement or clinical outcome is tested or claimed.

## Known limits

The practice operates locally in a browser. Notes and readiness do not synchronize across devices; exported manual records include private notes and currently have no import UI. Drafts and active timers are not restored after reload. Browser storage can fail or be cleared, so explicit backups matter. Readiness remains the learner’s assessment, not a measured cognitive or health result.
