# Philosophy of Intelligence verification record

Verification performed on 29 October 2026. This records implementation checks, not evidence of educational or clinical efficacy.

## Automated checks

The Node test suite passes **125 tests** across eight files:

| Area | Tests | Behaviours checked |
| --- | ---: | --- |
| Curriculum | 27 | Fourteen stages, seeded challenge generation, answer evaluation, varied trial types, supported inference, evidence boundaries and numerical distractors without a fixed answer rank. |
| Session | 21 | Exact observation lag, warmups, separate binding and comparison, progressive disclosure, committed answers, permanent assistance status, skip scoring and replay validation. |
| Progress | 26 | Stage-specific practice, two-date independent checks, channel thresholds, answer-class coverage, bounded storage, validation and privacy-preserving export/import. |
| App storage | 10 | Normal saves, unreadable originals, failed reads, stale tabs, external clearing, private-entry preflight, quota failure and exact recovery downloads. |
| Breathing | 13 | Independent phase clock, timing changes, pause/resume, reduced motion and sound scheduling. |
| Geometry | 13 | Geometric forms and construction diagrams, labels, escaping and accessibility structure. |
| Model lab | 8 | Predictions committed before outcomes, context/scope handling, distinct evidence and revision history. |
| Build/assets | 7 | CSS-relative resources, raster/SVG embedding, script order, inert assets and self-contained output. |

The curriculum, session, progress, breathing, geometry and lab tests run against the production modules. The app-storage tests run the actual initialization and storage helpers with minimal browser/storage substitutes; their extraction boundaries are explicitly checked. These are not a substitute for full browser tests.

`npm run check`, `npm run build` and `git diff --check` pass. The offline build embeds all seven script modules, three stylesheets, three image elements, the parchment texture and the icon. Its browser document has zero external script or stylesheet references. There are no npm runtime dependencies.

## Browser playthroughs

Chrome was used for direct interaction with the application. The source build, generated single-file build and published GitHub Pages site were opened successfully.

| Flow | Observed result |
| --- | --- |
| All fourteen forms | At least one complete correctly answered challenge per stage, including directed inference, ordering, mapping, conditional function selection, diagnostic tests and evidence-led revision. |
| Circle guided mission | Eight of eight answers correct; completed practice recorded. |
| Square guided mission | Eight of eight scored answers correct after the unscored initial record. One-back retrieval referred to the actual prior committed record; colour comparisons included match and nonmatch cases. |
| Circle independent mission | Twenty trials completed: nineteen correct and one deliberate skip. Selecting a correct response and then skipping still scored zero, including after reload. The result awarded one qualifying date, not independent mastery. |
| Progressive disclosure | Later evidence remained hidden until the required response was committed. Rebuilding with support reset the response sequence and kept the attempt assisted. |
| Mapping | Reassigning a partner displaced its old match; commitment remained unavailable until the mapping was complete. Cube distinguished a desired outcome from a reported failed outcome. |
| Model lab | Ambiguous initial evidence, distinguishing examples, locked prediction, in-scope agreement, changed context and extrapolation beyond the reference region all behaved as described. |
| Breathing guide | Editable inhale/exhale timing, optional tone control, reduced motion, visible phase changes and pause were checked. No physiological sensing or actual audio-volume measurement was performed. |
| Private studio | Two synthetic observations preserved the original source, a different recollection, a proposed relation and a prediction. Later contradictory evidence was appended without replacing the prediction. |
| Export/import | Default backup excluded private synthetic material. An explicitly private backup retained both observations, exact source/recollection fields, prediction and later evidence. Re-import restored the entries after confirmation. |
| Cross-tab protection | A second tab saved newer state. The older tab displayed its warning, paused and refused to start a new mission. This verifies sequential stale-write protection, not atomic simultaneous transactions. |
| Recovery protection | An isolated browser storage fixture containing an invalid private record displayed recovery options and made zero writes after navigation and an attempted mission start. |
| Offline edition | The generated HTML loaded and restored the saved Cube mission in a paused state. |
| Live site | The published app rendered correctly; a Circle answer committed and received correct feedback. Closing the unfinished mission retained the answer without awarding a completed mission. |

The source-build playthrough included 48 scored answers: 47 correct and one intentional skip. The live-site smoke test added one correct answer. After the final numerical-distractor review, another complete Sphere challenge was answered correctly, including prediction and revision after a counterexample. Final checks also remove predictable answer ranks in Octagon and in each Dodecahedron function family. Synthetic personal examples used for QA are not included in the repository.

## Layout and interaction

Desktop rendering was visually reviewed. Responsive layouts were inspected in browser frames set to **320, 390 and 820 pixels** wide. Their content widths were 305, 375 and 805 pixels after the browser scrollbar; document scroll width matched client width. Journey, narrow-screen Cube mapping and the model lab were inspected, including their working controls. This is viewport-layout verification, not testing on physical mobile devices.

Keyboard use, focus after committing/advancing and mapping reassignment, disabled states, visible progress semantics, source text alternatives and reduced-motion controls were checked during implementation. A full assistive-technology audit has not been performed. The preview image in this repository captures the current interface.

## Practical limits

- Browser tests used Chrome. Safari, Firefox, physical touch devices and directly opened `file:` storage behaviour still warrant platform-specific checks.
- Sound scheduling is tested, but comfortable loudness depends on the device and user settings.
- Local storage may have a smaller quota than the application budgets. Export remains the user's portable backup; there is no account sync or server recovery.
- Independent mastery was verified through automated two-date fixtures and a real one-date browser session. No claim is made that two days of human training were observed.
- The 70–200 labels, fourteen-stage order and mastery thresholds are creative product choices. These checks establish software behaviour; they do not validate IQ measurement, cognitive gains or a universal developmental sequence.

## Engraved design update

The parchment redesign was checked across Journey, a Circle lesson and scored challenge, Breath-back, Palace, the philosophy page, model lab and rhythm dialog. Home layouts at 320, 390 and 820 pixels had no horizontal document overflow. Mobile dialog content remained scrollable, and a Circle response still committed and received correct feedback. All 118 tests, source checks and the regenerated self-contained edition pass after the branding and geometry changes. The canonical offline file now uses the full project name; the old download filename remains an identical compatibility copy.


## Original-artwork restoration

The opening page was restored using the actual source artwork and parchment from the supplied reference. Browser frames at 1536×756, 1280×630, 1024×600, 390×844, 320×568 and 667×375 verified that all three lower panels and the final sentence fit inside the first viewport. The app header is absent from this screen and visible on internal screens. The four entry routes were checked through actual link clicks. These changes leave the training, scoring and saved-record model unchanged. The source checks and single-file build pass with all original artwork embedded in the offline edition.
