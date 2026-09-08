import { useRef, useState, type ReactNode } from 'react'
import './tooltip.css'

interface Props {
  title: string
  descriptionHtml?: string
  extra?: ReactNode
  children: ReactNode
}

export function Tooltip({ title, descriptionHtml, extra, children }: Props) {
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const show = () => {
    timer.current = window.setTimeout(() => setVisible(true), 700)
  }
  const hide = () => {
    window.clearTimeout(timer.current)
    setVisible(false)
  }

  return (
    <span className="tooltip-anchor" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className="tooltip-bubble" role="tooltip">
          <div className="tooltip-title">{title}</div>
          {extra}
          {descriptionHtml && (
            <div className="tooltip-desc" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
          )}
        </div>
      )}
    </span>
  )
}
