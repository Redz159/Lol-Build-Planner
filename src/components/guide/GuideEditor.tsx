import { useEffect, useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { IconEntry } from '../../lib/guideIcons'
import { GameIcon, setIconIndex } from './GameIconNode'
import { IconSuggestion } from './IconSuggestion'
import { IconIndexContext } from './iconIndexContext'
import './guide.css'

const SAVE_DELAY_MS = 500

interface Props {
  value: string
  editable: boolean
  iconIndex: IconEntry[]
  // Called with the editor's HTML ('' when empty), debounced and flushed on blur/unmount, so the
  // build's undo history gets one entry per pause in typing instead of one per keystroke.
  onChange: (html: string) => void
}

// Rich text with markdown-style shortcuts ("## ", "**bold**", "- ") and inline game icons via ":".
export function GuideEditor({ value, editable, iconIndex, onChange }: Props) {
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })
  // The last HTML this editor saved or loaded, to tell our own saves apart from outside changes
  // (Cancel restoring the pre-edit snapshot, undo/redo) that have to be loaded into the editor.
  const lastValue = useRef(value)
  const unsaved = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const flush = () => {
    clearTimeout(timer.current)
    const html = unsaved.current
    unsaved.current = null
    if (html === null || html === lastValue.current) return
    lastValue.current = html
    onChangeRef.current(html)
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        strike: false,
        underline: false,
      }),
      GameIcon,
      IconSuggestion,
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      unsaved.current = editor.isEmpty ? '' : editor.getHTML()
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DELAY_MS)
    },
    onBlur: flush,
  })

  // Save what's still pending when the tab is left. `flush` only reads refs, so the first one is fine.
  useEffect(() => flush, [])

  useEffect(() => {
    if (editor) setIconIndex(editor, iconIndex)
  }, [editor, iconIndex])

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (!editor || value === lastValue.current) return
    clearTimeout(timer.current)
    unsaved.current = null
    lastValue.current = value
    editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  const byRef = useMemo(() => new Map(iconIndex.map((e) => [e.ref, e])), [iconIndex])

  return (
    <IconIndexContext.Provider value={byRef}>
      <EditorContent editor={editor} className={editable ? 'guide-editor editing' : 'guide-editor'} />
    </IconIndexContext.Provider>
  )
}
