# Philosophy of Intelligence

A geometric practice of noticing, remembering, relating and revising.

[Open the site](https://www.philosophyofintelligence.life/) · [Practice guide](docs/PRACTICE_GUIDE.md) · [Offline edition](dist/Philosophy-of-Intelligence-Offline.html)

The fourteen shapes open one shared training page. Each shape changes the theory and the instructions applied to **Heart-Coherence** and **Body-Sensation Mapping**, adapted from [Project Meaning](https://o0ooooooooooo0o.github.io/Project-Meaning/). The exercises use your own observations. There are no multiple-choice missions, answer scores, mastery thresholds or locked levels in the current practice interface.

## Begin a practice

1. Choose **Circle**, or any other shape, from the home screen.
2. Read its theory and the **Notice → Recall → Relate → Revise** instructions.
3. Choose Heart-Coherence or Body-Sensation Mapping. Both teach the selected shape.
4. Practise mentally, or open **Make a breath-back return** to pause and keep an optional private observation.
5. Review the shape's criteria. Mark readiness separately for each exercise when that reflects your own judgement; revisit or reverse it whenever needed.

Every shape stays available. More complex shapes change the relations you examine; they do not require slower breathing, stronger sensations or longer sessions.

## The two exercises

| Exercise | Source structure retained | Available lengths |
| --- | --- | --- |
| Heart-Coherence | Heart-focused breathing, heart feeling, then deepening; phases change at 33% and 66% of the selected period. | 15, 30, 60, 120 or 180 minutes |
| Body-Sensation Mapping | Location, quality, intensity, movement, direction, coherence and meaning-tone; each dimension receives 30 seconds and the sequence repeats. | 15, 30 or 60 minutes |

The source's bowl sounds, completion sequence and ambient pulse options are available with **sound off by default**. These are listening choices, not measurements or guarantees of a mental state. Pause or end at any time; finishing a timer records time without awarding readiness.

**My own rhythm** is the default breathing mode. An optional five-seconds-in / five-seconds-out cue has no holds. Breathe gently without forcing depth or pace, and stop if dizzy or uncomfortable. The page does not sense breathing or measure heart coherence. This timing is a design choice, not a claim of a universally healthiest pace. See [Reference notes](docs/REFERENCE_NOTES.md).

## Breath-back and private records

N means **committed observations**, not breaths or seconds. The note form offers a return distance of one to four observations within the current shape, exercise and observation stream. Recall before revealing the preserved earlier source, then describe a relation and any revision. The current observation and recollection lock when that source is revealed. Initial observations build the stream before an earlier target is available. A fresh stream starts a new return history while retaining previously saved records.

Notes are optional. Saved observations are append-only; a correction belongs in a new record. The interface does not automatically judge the truth of an experience, a recollection or an interpretation.

Current practice uses the browser key `poi.manual-practice.v1`, separately from the earlier archive. It stores at most **500 observations and 500 practice periods**, with up to **3,000 characters per text field**. It refuses excess records or text instead of silently discarding older material. At capacity, export before explicitly clearing the record. There is no current-practice import or individual observation deletion.

**Download practice record (includes notes)** exports the complete current manual-practice record as readable JSON, including private observations and self-assessments. Unfinished form drafts and an active timer are not included. Drafts remain available while navigating within the open app, but are not persisted across a page reload. A browser leave-page warning helps protect unfinished notes and records that could not be saved; copy, commit or export them before leaving.

If browser storage fails, accepted work remains in the tab for export. Invalid saved data is preserved unchanged. Conflicting tabs do not merge automatically; export the current tab's work before choosing **Load saved version** or clearing the record. Loading the saved record keeps unfinished note drafts in the open tab. The recovery control can download the original stored value. Local storage is not encryption or guaranteed archival storage, and a different browser profile or address has a separate record.

The earlier **Archive** retains access to old observations and its own backup controls. It neither supplies current readiness nor modifies current training data. Historical modules remain for compatibility and tests; their quizzes are not offered by the current interface.

## Run locally

No account, API key, external font or downloaded audio is required. The application uses plain HTML, CSS and JavaScript with browser-generated sound.

Open the [standalone offline edition](dist/Philosophy-of-Intelligence-Offline.html), or serve this repository for a consistent browser-storage origin:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). Export before moving between hosted and offline copies: browsers can handle storage for directly opened files differently.

For development, use Node.js 20 or later. No npm packages need installing.

```bash
npm test
npm run build
npm run check
```

The build embeds the local scripts, styles and artwork into the offline HTML. Current tests cover exercise timing and audio lifecycle, all fourteen teaching configurations, source-preserving storage and routing, alongside retained legacy-module tests. See the [verification record](docs/VERIFICATION.md) for actual checks and limits.

## Design and evidence

The home retains its parchment artwork and symbol composition. Its medallion titles are descriptive; the shape tiles are its navigation controls. The same training page serves every shape.

- [Practice guide](docs/PRACTICE_GUIDE.md)
- [Design rationale](docs/DESIGN.md)
- [Implementation contract](docs/IMPLEMENTATION_CONTRACT.md)
- [Reference notes](docs/REFERENCE_NOTES.md)

Shapes are philosophical teaching scaffolds. Self-assessed readiness does not measure intelligence, establish a health outcome or demonstrate transfer beyond this practice. The application has no analytics, external AI service or automatic upload of personal records.
