# Philosophy of Intelligence

A manual practice of organising relationships in the stream of consciousness.

[Open the site](https://www.philosophyofintelligence.life/) · [Practice guide](docs/PRACTICE_GUIDE.md) · [Offline edition](dist/Philosophy-of-Intelligence-Offline.html)

The fourteen shapes open one shared practice page. Each has theory, instructions and four worked cycles for **Consciousness Stream**, **Heart-Coherence** and **Body-Sensation Mapping**. The shape changes the selected relationships; the full breath-back procedure remains available from Circle onward.

The guided rehearsal presents receive, encode, retrieve and compare one step at a time for all 42 lessons. Its entry selector updates the full diagram and relationship register together. Advance when ready; the pacer never advances the rehearsal or records an observation. Expand **Read all four worked entries** for the complete reference. Running practice also keeps the selected shape's organisation and an exercise-specific example close to the breathing or body prompts.

## The method

1. **Inhale: receive and choose.** Select the current meaningful relationship or relational model.
2. **Exhale: encode first.** Preserve that selection at a distinct memory-palace address.
3. **Then retrieve.** Return to the exact earlier entry selected by the chosen lag.
4. **Compare and annotate.** Keep the current source, earlier source and interpretation distinguishable. Preserve both entries.

Circle is one explicit meaningful relationship: **ocean contains boat**. Two participants make one relationship, not two. At Half-circle, select two meanings together: **ocean contains boat** and **boat enables passage across ocean**. The circular frame adds no self-loop. Later forms use a declared number and organisation of substantive relationships; lists of objects or properties do not complete them. Palace addresses, retrieval and historical comparison do not add to the current source's shape count. All shapes remain available; readiness is a reversible personal assessment, not an automatic award.

## Three practice settings

| Setting | Material and timing | Available minutes |
| --- | --- | --- |
| Consciousness Stream | Inner images, words, remembered sounds and other mental contents; optional paced or natural breathing. | 15, 30, 60 |
| Heart-Coherence | Retained heart-focused, heart-feeling and deepening phases; transitions at 33% and 66%. | 15, 30, 60, 120, 180 |
| Body-Sensation Mapping | Seven dimensions, each lasting 30 seconds before the sequence repeats. | 15, 30, 60 |

Every exercise opens with its first instruction visible before the timer starts. Set the length, breathing mode and inhale/exhale timing directly below the preview; expand Sound settings for ambient sound and bell volume. One **Start** button applies these settings and starts practice. Stream and heart default to a five-second phase guide (or your saved timing); body defaults to natural breathing. Bells and ambient sound are enabled but stay silent until Start or Test bell. Pause, end or follow your own rhythm; the task does not require finishing a thought within one breath.

Larger worked models are prepared constructions, not instructions to discover thirty or 120 new relationships in one breath. Their registers make the declared contents inspectable.

An optional da Vinci disclosure explains source, constructed counterpart and role correspondence before the historical return. It is a separate mental extension, not a required step or an automatically tracked paired-record mode. Honest partial selections can be encoded and compared without claiming completion of the selected shape.

## Returns and private notes

The app uses **N-back over committed observations**, with a distance of one to four entries in the same shape, exercise and stream. A timer does not count actual breaths or create observations. One-entry-back coincides with one-breath-back only when one complete entry is made on every consecutive breath.

When history exists, the form first locks the current source and lag. Only then can the recollection be recorded; revealing the original locks that recollection. Comparison and correction follow. Draft locks are not a save: the complete entry is committed afterwards. Initial entries seed history without inventing a target.

Current records use `poi.manual-practice.v1`. Existing heart/body records remain compatible; loading them does not automatically rewrite storage. Observations are append-only, with limits of 500 observations, 500 practice periods and 3,000 characters per text field. Overflow is rejected rather than silently trimmed.

The practice-record download includes committed private notes and assessments, not drafts or active timers. Drafts survive in-app navigation, not a reload. Export accepted in-tab work if persistence fails. Corrupt data and competing tab versions retain recovery/export paths. Reload and reset are explicit controls. If a saved reload removes a locked return's exact target, a separate recovery download preserves that unfinished return before new history begins; the target is never silently substituted. There is no current-practice import or individual observation deletion.

The separate **Archive** retains its `form.progress.v1` data and backup controls. Removing old lesson engines does not erase those records or resume an archived mission.

## Run and develop

No account, API key or npm installation is required. Use Node.js 20 or later for development.

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000), or use the offline edition. Browser profiles and origins have separate storage; export before moving between them.

```bash
npm test
npm run build
npm run check
```

The build embeds local scripts, styles and artwork in both offline filenames. The home symbol, parchment appearance and geometry remain the visual reference. See [verification](docs/VERIFICATION.md) for checks actually performed.

- [Design](docs/DESIGN.md)
- [Implementation contract](docs/IMPLEMENTATION_CONTRACT.md)
- [Sources and boundaries](docs/REFERENCE_NOTES.md)

The teaching follows the revised project manual and working conventions. Shapes are not IQ values or a validated intelligence scale. The application has no physiological sensors, analytics, remote AI calls or automatic upload of personal records.

### Homepage song

The homepage includes Suno's official **Universal DNA** player. Press its Play button to start; it does not autoplay on arrival. The same player stays mounted during shape navigation, with pause and seeking provided by Suno, independently of the breathing bell. Suno serves the player and audio, so an internet connection is required. The offline editions retain a song link instead of loading the remote player.

