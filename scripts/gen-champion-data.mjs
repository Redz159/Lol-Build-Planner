// Pre-generates public/data/champions/<ChampionId>.json for the Simulator tab: base stats, spell
// formulas (mSpellCalculations + DataValues) and the real in-game tooltip text, pulled from
// CommunityDragon's extracted game files at the same patch as DDRAGON_VERSION. The raw string
// table alone is ~31 MB, so this runs offline and only the handful of keys actually used per
// champion get committed. Re-run whenever DDRAGON_VERSION is bumped: `npm run gen:champions`.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'data', 'champions')
const DDRAGON = 'https://ddragon.leagueoflegends.com/cdn'

const versionSource = await readFile(join(ROOT, 'src', 'data', 'ddragonVersion.ts'), 'utf8')
const ddragonVersion = versionSource.match(/'([\d.]+)'/)[1]
const patch = ddragonVersion.split('.').slice(0, 2).join('.')

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

let cdragonBase = `https://raw.communitydragon.org/${patch}`
if (!(await fetch(`${cdragonBase}/content-metadata.json`)).ok) {
  console.warn(`CommunityDragon has no ${patch} folder, falling back to latest`)
  cdragonBase = 'https://raw.communitydragon.org/latest'
}

console.log(`ddragon ${ddragonVersion}, cdragon ${cdragonBase}`)
console.log('fetching string table...')
const strings = (await fetchJson(`${cdragonBase}/game/en_us/data/menu/en_us/lol.stringtable.json`)).entries

// Tooltips embed other strings as {{ Spell_X_Name }} — resolve those, leave unknown ones as-is.
function str(key) {
  if (!key) return undefined
  const text = strings[key.toLowerCase()]
  if (text === undefined) return undefined
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, inner) => strings[inner.toLowerCase()] ?? m)
}

const baseValue = (v) => (v && typeof v === 'object' ? (v.baseValue ?? 0) : (v ?? 0))

// Floats come out of the bin as 0.4000000059604645 — trimming them keeps the files small.
const round = (_key, value) => (typeof value === 'number' && !Number.isInteger(value) ? Number(value.toPrecision(7)) : value)

// `record` is the whole SpellObject; its mScriptName is how other tooltips refer to this spell
// (e.g. "@spell.GnarQ:MiniTotalDamage@").
function spellData(record) {
  const spell = record.mSpell
  const keys = spell.mClientData?.mTooltipData?.mLocKeys ?? {}
  return {
    scriptName: record.mScriptName,
    name: str(keys.keyName),
    tooltip: str(keys.keyTooltip),
    tooltipExtended: str(keys.keyTooltipExtendedBelowLine),
    dataValues: Object.fromEntries((spell.DataValues ?? []).filter((d) => d.name && d.values).map((d) => [d.name, d.values])),
    calculations: spell.mSpellCalculations ?? {},
    effectAmounts: (spell.mEffectAmount ?? []).map((e) => e.value ?? []),
    cooldown: spell.cooldownTime ?? [],
    cost: spell.mana ?? [],
  }
}

async function champion(ddChamp) {
  const id = ddChamp.id
  const lower = id.toLowerCase()
  const [bin, detail] = await Promise.all([
    fetchJson(`${cdragonBase}/game/data/characters/${lower}/${lower}.bin.json`),
    fetchJson(`${DDRAGON}/${ddragonVersion}/data/en_US/champion/${id}.json`),
  ])
  const dd = detail.data[id]
  const rootKey = Object.keys(bin).find((k) => k.toLowerCase() === `characters/${lower}/characterrecords/root`)
  const root = bin[rootKey]
  const resource = root.primaryAbilityResource ?? {}
  const stats = {
    hp: baseValue(root.baseHPModifiable),
    hpPerLevel: baseValue(root.hpPerLevelModifiable),
    hpRegen: baseValue(root.baseStaticHPRegenModifiable),
    hpRegenPerLevel: baseValue(root.hpRegenPerLevelModifiable),
    resourceType: resource.arType ?? 0,
    resource: baseValue(resource['{726ee5cd}']),
    resourcePerLevel: baseValue(resource['{6216bf7b}']),
    resourceRegen: baseValue(resource['{c4ab3550}']),
    resourceRegenPerLevel: baseValue(resource['{3a509002}']),
    ad: baseValue(root.baseDamageModifiable),
    adPerLevel: baseValue(root.damagePerLevelModifiable),
    armor: baseValue(root.baseArmorModifiable),
    armorPerLevel: baseValue(root.armorPerLevelModifiable),
    mr: baseValue(root.baseMR),
    mrPerLevel: baseValue(root.mrPerLevel),
    attackSpeed: baseValue(root.attackSpeedModifiable),
    attackSpeedRatio: baseValue(root.attackSpeedRatioModifiable) || baseValue(root.attackSpeedModifiable),
    attackSpeedPerLevel: baseValue(root.attackSpeedPerLevelModifiable),
    moveSpeed: baseValue(root.baseMoveSpeedModifiable),
    range: baseValue(root.attackRangeModifiable),
    critDamageMultiplier: root.critDamageMultiplier ?? 1.75,
    adaptiveApWeight: root.mAdaptiveForceToAbilityPowerWeight ?? 0,
  }
  const spells = (root.spells ?? []).slice(0, 4).map((path, i) => {
    const record = bin[path]
    const base = record?.mSpell ? spellData(record) : { name: dd.spells[i]?.name, tooltip: undefined, dataValues: {}, calculations: {}, effectAmounts: [], cooldown: [], cost: [] }
    return { ...base, name: base.name ?? dd.spells[i]?.name, maxRank: dd.spells[i]?.maxrank ?? 5, icon: dd.spells[i]?.image.full }
  })
  const passiveKey = bin[root.mCharacterPassiveSpell]?.mSpell
    ? root.mCharacterPassiveSpell
    : Object.keys(bin).find((k) => bin[k].mSpell && root.passiveLuaName && k.endsWith(`/${root.passiveLuaName}`))
  const passiveData = passiveKey ? spellData(bin[passiveKey]) : { dataValues: {}, calculations: {}, effectAmounts: [], cooldown: [], cost: [] }
  const passive = {
    ...passiveData,
    name: passiveData.name ?? str(root.passiveName) ?? dd.passive.name,
    tooltip: passiveData.tooltip ?? str(root.passiveToolTip) ?? dd.passive.description,
    icon: dd.passive.image.full,
    maxRank: 1,
  }
  return { id, stats, passive, spells }
}

const championList = Object.values((await fetchJson(`${DDRAGON}/${ddragonVersion}/data/en_US/champion.json`)).data)
await mkdir(OUT_DIR, { recursive: true })
const failures = []
let next = 0
async function worker() {
  while (next < championList.length) {
    const c = championList[next++]
    try {
      const data = await champion(c)
      await writeFile(join(OUT_DIR, `${c.id}.json`), JSON.stringify(data, round))
      process.stdout.write('.')
    } catch (err) {
      failures.push(`${c.id}: ${err.message}`)
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker))
console.log(`\n${championList.length - failures.length}/${championList.length} champions written to public/data/champions`)
if (failures.length) console.warn(failures.join('\n'))
