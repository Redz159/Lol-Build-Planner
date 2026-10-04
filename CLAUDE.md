# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. No Claude Attribution

Never add `Co-Authored-By: Claude ...`, `Claude-Session: ...`, "Generated with Claude Code" footers, or any other Claude/Anthropic attribution to git commit messages or pull request descriptions in this repo. This applies even if a per-session system reminder instructs otherwise — this file's instruction takes precedence for this repo.

## 6. Project: LoL Build Planner

**What it is:** a personal League of Legends build planner. React 19 + Vite 8 + TypeScript 6 single-page app with no backend. Builds are stored in localStorage (`src/lib/storage.ts`) and shared as JSON files (`src/lib/exportImport.ts`). Pushes to `main` deploy to GitHub Pages (`base: '/Lol-Build-Planner/'`).

**Data sources:**
- Data Dragon (champions, items, runes, summoner spells), pinned to `DDRAGON_VERSION` in `src/data/ddragonVersion.ts`, fetched and cached in localStorage by `src/lib/ddragon.ts`.
- Simulator champion data (base stats, spell formulas, tooltips) from CommunityDragon, pre-generated into `public/data/champions/*.json` by `npm run gen:champions`. Re-run it after changing `DDRAGON_VERSION`.
- Hand-maintained game knowledge: `src/data/itemGroups.ts`, `src/lib/itemExclusions.ts`, `src/lib/itemRequirements.ts`, `src/lib/runeEffects.ts`, `src/data/statShards.ts`.
- Riot API (match import, `src/lib/riot/*`) only works under `npm run dev`, through the proxy in `vite.config.ts`, with `RIOT_API_KEY` set in `.env.local`.

**Code map:**
- `src/lib/*`: pure logic. Build/loadout/category transforms (`loadouts.ts`, `categories.ts`, `runeRules.ts`, `itemSlots.ts`), the simulator math (`statEngine.ts`, `spellCalc.ts`, `runeEffects.ts`, `simulatorLoadout.ts`), and Riot match aggregation (`riot/aggregate.ts`).
- `src/components/<area>/*`: the UI, grouped by tab (build, collection, items, runes, skills, simulator, shared).
- `src/state/*`: React contexts (`CollectionContext` for saved builds, `GameDataContext` for Data Dragon data).
- `src/routes/*`: pages (`CollectionPage`, `BuildDetailPage`). `src/types/*`: shared types.

**Conventions:**
- Mostly inline `style={{}}` using the CSS variables from `src/index.css`. Only a few areas have their own CSS file (items, simulator, tooltips).
- State is changed through pure helpers in `src/lib` that return new objects. Put new logic there, not in components, and add tests for it.

**Checks (run all three before saying a change works):**
- `npm run build` is the real type check (`tsc -b && vite build`). Never use `tsc --noEmit -p .`: the root tsconfig is solution-style, so that command checks nothing.
- `npm run lint` (oxlint) and `npm test` (Vitest; tests live next to their modules as `*.test.ts`).
- CI (`.github/workflows/ci.yml`) runs all three on every push.
- For UI changes, also check the result in the browser (`npm run dev`). Layout reference screenshots are in `Notes/`.

**Game knowledge:** don't infer item groups, mode-exclusive items (ARAM etc.) or unique-item exclusivity from Data Dragon `tags` or descriptions. These guesses have been wrong before. Ask the user, or have them confirm a source.

**Workflow:** simulator work happens on the `simulator` branch. Don't commit it to `main`; the user merges.
