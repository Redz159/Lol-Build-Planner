// Builds public/data/abilities.json from the per-champion simulator files: every champion's passive
// and Q/W/E/R name + icon, so the guide editor can search all abilities without loading ~87 MB of
// simulator data. Runs offline from the local files; `npm run gen:champions` chains it.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHAMPION_DIR = join(ROOT, 'public', 'data', 'champions')
const OUT_FILE = join(ROOT, 'public', 'data', 'abilities.json')

const files = (await readdir(CHAMPION_DIR)).filter((f) => f.endsWith('.json')).sort()
const abilities = []
for (const file of files) {
  const data = JSON.parse(await readFile(join(CHAMPION_DIR, file), 'utf8'))
  const entries = [['P', data.passive], ...['Q', 'W', 'E', 'R'].map((slot, i) => [slot, data.spells?.[i]])]
  for (const [slot, spell] of entries) {
    if (spell?.name && spell?.icon) abilities.push({ champion: data.id, slot, name: spell.name, icon: spell.icon })
  }
}
await writeFile(OUT_FILE, JSON.stringify(abilities))
console.log(`Wrote ${abilities.length} abilities for ${files.length} champions to public/data/abilities.json`)
