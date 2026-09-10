import type { Role } from '../../types/build'
import { ROLE_LABELS, roleIconUrl } from '../../lib/loadouts'

export function RoleIcon({ role, size = 16 }: { role: Role; size?: number }) {
  return <img src={roleIconUrl(role)} alt={ROLE_LABELS[role]} title={ROLE_LABELS[role]} width={size} height={size} />
}
