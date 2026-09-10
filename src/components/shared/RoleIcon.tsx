import type { Role } from '../../types/build'
import { ROLE_LABELS, roleIconUrl } from '../../lib/loadouts'

export function RoleIcon({ role, size = 16, dim = false }: { role: Role; size?: number; dim?: boolean }) {
  return (
    <img
      src={roleIconUrl(role)}
      alt={ROLE_LABELS[role]}
      title={ROLE_LABELS[role]}
      width={size}
      height={size}
      style={dim ? { filter: 'grayscale(1)', opacity: 0.4 } : undefined}
    />
  )
}
