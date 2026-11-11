import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { searchIcons, type IconEntry } from '../../lib/guideIcons'
import { IconSuggestionList, type ListHandle, type ListProps } from './IconSuggestionList'

// ":" + a few letters opens the icon list. Only after a space or at the start of a line, and a
// space closes it, so "Note: ..." or "AD/AP" never trigger it.
export const IconSuggestion = Extension.create({
  name: 'iconSuggestion',

  addProseMirrorPlugins() {
    return [
      Suggestion<IconEntry, IconEntry>({
        editor: this.editor,
        char: ':',
        allowSpaces: false,
        items: ({ query }) => searchIcons(this.editor.storage.gameIcon.index, query),
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: 'gameIcon', attrs: { ref: props.ref, label: props.name } },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
        render: () => {
          let renderer: ReactRenderer<ListHandle, ListProps> | undefined
          let unmount: (() => void) | undefined
          return {
            onStart: (props: SuggestionProps<IconEntry, IconEntry>) => {
              renderer = new ReactRenderer(IconSuggestionList, {
                editor: props.editor,
                props: { items: props.items, command: props.command },
              })
              renderer.element.style.zIndex = '50'
              unmount = props.mount(renderer.element)
            },
            onUpdate: (props: SuggestionProps<IconEntry, IconEntry>) => {
              renderer?.updateProps({ items: props.items, command: props.command })
            },
            onKeyDown: ({ event }: SuggestionKeyDownProps) => renderer?.ref?.onKeyDown(event) ?? false,
            onExit: () => {
              unmount?.()
              renderer?.destroy()
              renderer = undefined
              unmount = undefined
            },
          }
        },
      }),
    ]
  },
})
