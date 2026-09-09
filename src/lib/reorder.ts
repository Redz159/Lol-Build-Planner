export function reorder<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...list]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}
