// dragleave also fires when the pointer just moves between an element's own children, so this
// tells a real exit apart. relatedTarget is null when the pointer leaves the window.
export function dragLeftElement(e: {
  currentTarget: { contains: (other: Node | null) => boolean }
  relatedTarget: EventTarget | null
}): boolean {
  return !e.currentTarget.contains(e.relatedTarget as Node | null)
}
