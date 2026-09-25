import { useEffect, useMemo, useState } from 'react'
import type { Build, ExampleBuild, SkillKey, SkillOrder } from '../../types/build'
import type { DDragonChampion, DDragonItem, DDragonRuneTree } from '../../types/ddragon'
import type { BuildItems, ItemSlot } from '../../types/items'
import type { RunePage } from '../../types/runes'
import type { ChampionSimData, StatBlock, TargetStats } from '../../types/simulator'
import { useGameData } from '../../state/GameDataContext'
import { useCollection } from '../../state/CollectionContext'
import { getChampionSimData } from '../../lib/ddragon'
import { computeStats, toTargetStats } from '../../lib/statEngine'
import { exampleBuildFinalItems, findRune, initialRunePicks, ranksAtLevel, resolveRunes, type RunePicks } from '../../lib/simulatorLoadout'
import { mergedCategoryExampleBuilds, mergedCategoryItems, mergedCategoryRunePages } from '../../lib/categories'
import { visibleItemSlots } from '../../lib/loadouts'
import { DEFENSE_SHARDS, FLEX_SHARDS, OFFENSE_SHARDS } from '../../data/statShards'
import { ChampionSelect } from '../collection/ChampionSelect'
import type { ItemSource } from './ItemLoadoutPicker'
import { AbilityList } from './AbilityList'
import { ChampionPanel } from './ChampionPanel'
import { DummyPanel, TargetModeToggle, type DummyStats, type TargetMode } from './TargetPanel'
import './simulator.css'

interface Props {
  champion: DDragonChampion
  slots: ItemSlot[]
  buildItems: BuildItems
  exampleBuilds: ExampleBuild[]
  runePages: RunePage[]
  skillOrder: SkillOrder
}

function useSimData(championId: string | undefined): { data?: ChampionSimData; error?: string } {
  const [state, setState] = useState<{ id?: string; data?: ChampionSimData; error?: string }>({})
  useEffect(() => {
    if (!championId) return
    let cancelled = false
    getChampionSimData(championId)
      .then((data) => !cancelled && setState({ id: championId, data }))
      .catch((err: Error) => !cancelled && setState({ id: championId, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [championId])
  return state.id === championId ? state : {}
}

const SHARD_NAMES = new Map([...OFFENSE_SHARDS, ...FLEX_SHARDS, ...DEFENSE_SHARDS].map((s) => [s.id, s]))

function runeInfoFor(trees: DDragonRuneTree[]) {
  return (id: number) => {
    const shard = SHARD_NAMES.get(id)
    if (shard) return { name: `${shard.name} shard`, icon: shard.icon }
    const rune = findRune(trees, id)
    return rune && { name: rune.name, icon: rune.icon }
  }
}

// A saved build for the target champion (if the collection has one) supplies its items,
// example builds and rune pages as quick picks — same as your own side.
function targetSource(builds: Build[], championId: string): { items?: ItemSource; runePages: RunePage[] } {
  const build = builds.find((b) => b.champion.id === championId)
  const loadout = build?.loadouts[0]
  if (!loadout) return { runePages: [] }
  const slots = visibleItemSlots(loadout.itemSlots, loadout.roles)
  const hasCategories = loadout.categories.length > 0
  return {
    items: {
      slots,
      items: hasCategories ? mergedCategoryItems(loadout.categories, slots) : loadout.items,
      exampleBuilds: hasCategories ? mergedCategoryExampleBuilds(loadout.categories) : loadout.exampleBuilds,
    },
    runePages: hasCategories ? mergedCategoryRunePages(loadout.categories) : loadout.runePages,
  }
}

export function SimulatorTab({ champion, slots, buildItems, exampleBuilds, runePages, skillOrder }: Props) {
  const { items: allItems, runeTrees, champions } = useGameData()
  const { builds } = useCollection()
  const own = useSimData(champion.id)

  const [level, setLevel] = useState(18)
  const [itemIds, setItemIds] = useState<string[]>(() => (exampleBuilds[0] ? exampleBuildFinalItems(exampleBuilds[0], slots, allItems) : []))
  const [runePicks, setRunePicks] = useState<RunePicks>(() => initialRunePicks(runePages, runeTrees))
  const [rankOverrides, setRankOverrides] = useState<Partial<Record<SkillKey, number>>>({})
  const [stacks, setStacks] = useState<Record<string, number>>({})
  const [enabledAmps, setEnabledAmps] = useState<number[]>([])

  const [targetMode, setTargetMode] = useState<TargetMode>('dummy')
  const [dummy, setDummy] = useState<DummyStats>({ hp: 1000, armor: 0, mr: 0 })
  const [targetChampionId, setTargetChampionId] = useState(champion.id)
  const [targetLevel, setTargetLevel] = useState(18)
  const [targetItemIds, setTargetItemIds] = useState<string[]>([])
  const [targetRunePicks, setTargetRunePicks] = useState<RunePicks>(() => initialRunePicks(targetSource(builds, champion.id).runePages, runeTrees))
  const target = useSimData(targetMode === 'champion' ? targetChampionId : undefined)
  const targetSaved = useMemo(() => targetSource(builds, targetChampionId), [builds, targetChampionId])

  const runeInfo = useMemo(() => runeInfoFor(runeTrees), [runeTrees])
  const resolved = useMemo(() => resolveRunes(runePages, runePicks, runeTrees), [runePages, runePicks, runeTrees])
  const targetResolved = useMemo(() => resolveRunes(targetSaved.runePages, targetRunePicks, runeTrees), [targetSaved, targetRunePicks, runeTrees])
  const pickItems = (ids: string[]) => ids.map((id) => allItems.find((i) => i.id === id)).filter((i): i is DDragonItem => !!i)

  const block: StatBlock | undefined =
    own.data && computeStats({ champ: own.data, level, items: pickItems(itemIds), runes: resolved.selection, runeInfo })
  const targetBlock: StatBlock | undefined =
    target.data && computeStats({ champ: target.data, level: targetLevel, items: pickItems(targetItemIds), runes: targetResolved.selection, runeInfo })
  const targetStats: TargetStats =
    targetMode === 'champion' && targetBlock
      ? toTargetStats(targetBlock)
      : { hp: Math.max(1, dummy.hp), armor: dummy.armor, bonusArmor: 0, mr: dummy.mr, bonusMr: 0 }

  const plannedRanks = ranksAtLevel(skillOrder, level)
  const ranks = { ...plannedRanks, ...rankOverrides }

  if (own.error) return <div style={{ color: 'var(--danger)' }}>Couldn't load simulator data: {own.error}</div>
  if (!own.data || !block) return <div style={{ color: 'var(--text-dim)' }}>Loading champion data...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="sim-sides">
        <div className="sim-side">
          <div className="sim-side-header">
            <span className="sim-heading" style={{ margin: 0 }}>
              You
            </span>
          </div>
          <ChampionPanel
            championId={champion.id}
            title={<span className="sim-champion-name">{champion.name}</span>}
            level={level}
            onLevelChange={(l) => {
              setLevel(l)
              setRankOverrides({})
            }}
            block={block}
            resourceType={own.data.stats.resourceType}
            allItems={allItems}
            itemIds={itemIds}
            onItemsChange={setItemIds}
            itemSource={{ slots, items: buildItems, exampleBuilds }}
            trees={runeTrees}
            runePages={runePages}
            runePicks={runePicks}
            resolvedRunes={resolved}
            onRunePicksChange={setRunePicks}
          />
        </div>

        <div className="sim-side">
          <div className="sim-side-header" style={{ flexDirection: 'row-reverse' }}>
            <span className="sim-heading" style={{ margin: 0 }}>
              Target
            </span>
            <TargetModeToggle mode={targetMode} onChange={setTargetMode} />
            <span style={{ marginRight: 'auto', fontSize: 12.5, color: 'var(--text-dim)' }}>
              {Math.round(targetStats.hp)} HP · {Math.round(targetStats.armor)} Armor · {Math.round(targetStats.mr)} MR
            </span>
          </div>
          {targetMode === 'dummy' ? (
            <DummyPanel dummy={dummy} onChange={setDummy} />
          ) : (
            <ChampionPanel
              mirrored
              championId={targetChampionId}
              title={
                <ChampionSelect
                  champions={champions}
                  value={targetChampionId}
                  onChange={(id) => {
                    setTargetChampionId(id)
                    setTargetItemIds([])
                    setTargetRunePicks(initialRunePicks(targetSource(builds, id).runePages, runeTrees))
                  }}
                />
              }
              level={targetLevel}
              onLevelChange={setTargetLevel}
              block={targetBlock}
              resourceType={target.data?.stats.resourceType ?? 0}
              error={target.error}
              allItems={allItems}
              itemIds={targetItemIds}
              onItemsChange={setTargetItemIds}
              itemSource={targetSaved.items}
              trees={runeTrees}
              runePages={targetSaved.runePages}
              runePicks={targetRunePicks}
              resolvedRunes={targetResolved}
              onRunePicksChange={setTargetRunePicks}
            />
          )}
        </div>
      </div>

      <div className="sim-panel">
        <div className="sim-heading">Abilities</div>
        <AbilityList
          data={own.data}
          block={block}
          ranks={ranks}
          onRankChange={(key, rank) => setRankOverrides((o) => ({ ...o, [key]: rank }))}
          stacks={stacks}
          onStacksChange={(key, value) => setStacks((s) => ({ ...s, [key]: value }))}
          target={targetStats}
          runeIds={resolved.selection.runeIds}
          runeInputs={runePicks.inputs}
          trees={runeTrees}
          enabledAmps={enabledAmps}
          onToggleAmp={(id) => setEnabledAmps((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))}
        />
      </div>
    </div>
  )
}
