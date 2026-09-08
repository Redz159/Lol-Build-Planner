const PATHS: Record<string, string> = {
  ad: 'M4 20 20 4 20 10 10 20 Z',
  ah: 'M6 2h12v6l-4 4 4 4v6H6v-6l4-4-4-4V2Z',
  pen: 'M4 12h13M12 5l7 7-7 7',
  ms: 'M6 4l6 8-6 8M14 4l6 8-6 8',
}

// icons are drawn per-category since a couple (crit, mr/armor, health/mana) need more
// than a single <path>; everything renders at 24x24 viewBox, stroke/fill via currentColor
export function StatIcon({ id }: { id: string }) {
  switch (id) {
    case 'health':
    case 'healthregen':
      return (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <circle cx="8" cy="8.5" r="5" />
          <circle cx="16" cy="8.5" r="5" />
          <rect x="6.5" y="7" width="11" height="11" transform="rotate(45 12 12.5)" />
        </svg>
      )
    case 'mana':
    case 'manaregen':
    case 'lifesteal':
    case 'omnivamp':
      return (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2Z" />
        </svg>
      )
    case 'armor':
      return (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
        </svg>
      )
    case 'mr':
      return (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <polygon points="12,2 20,7 20,17 12,22 4,17 4,7" />
        </svg>
      )
    case 'ap':
      return (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10" />
        </svg>
      )
    case 'as':
      return (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <polygon points="13,2 4,14 11,14 9,22 20,9 13,9" />
        </svg>
      )
    case 'crit':
      return (
        <svg viewBox="0 0 24 24" width="12" height="12">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
        </svg>
      )
    case 'tenacity':
      return (
        <svg viewBox="0 0 24 24" width="12" height="12">
          <circle cx="9" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="15" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={PATHS[id] ?? 'M6 4l6 8-6 8M14 4l6 8-6 8'} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}
