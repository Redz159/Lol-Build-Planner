import { InputRule, Node, mergeAttributes, type Editor } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { findExactIcon, type IconEntry } from '../../lib/guideIcons'
import { GameIconView } from './GameIconView'

export interface GameIconStorage {
  // Everything ":" can insert. Set by GuideEditor, and updated once the ability list has loaded.
  index: IconEntry[]
}

declare module '@tiptap/core' {
  interface Storage {
    gameIcon: GameIconStorage
  }
}

export function setIconIndex(editor: Editor, index: IconEntry[]) {
  editor.storage.gameIcon.index = index
}

// An inline champion/item/rune/ability icon. Stored as <span data-game-icon="item:6699" data-label="...">;
// the label is only a fallback for refs that no longer exist (e.g. an item removed in a patch).
export const GameIcon = Node.create<object, GameIconStorage>({
  name: 'gameIcon',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addStorage() {
    return { index: [] }
  },

  addAttributes() {
    return {
      ref: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-game-icon') ?? '',
        renderHTML: (attrs) => ({ 'data-game-icon': attrs.ref }),
      },
      label: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-label') ?? '',
        renderHTML: (attrs) => ({ 'data-label': attrs.label }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-game-icon]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes)]
  },

  renderText({ node }) {
    return `:${node.attrs.label}:`
  },

  addNodeView() {
    return ReactNodeViewRenderer(GameIconView, { as: 'span' })
  },

  // Typing a full ":name:" (e.g. ":volibear:") turns it into the icon when the name matches exactly.
  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)(:([^\s:]+):)$/,
        handler: ({ state, range, match }) => {
          const entry = findExactIcon(this.storage.index, match[2])
          if (!entry) return null
          const start = range.from + match[0].indexOf(match[1])
          state.tr.replaceWith(start, range.to, this.type.create({ ref: entry.ref, label: entry.name }))
        },
      }),
    ]
  },
})
