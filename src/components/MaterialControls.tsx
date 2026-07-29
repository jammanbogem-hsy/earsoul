import type { ButtonHTMLAttributes, ReactNode } from 'react'
import '@material/web/button/filled-button.js'
import '@material/web/button/filled-tonal-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/button/text-button.js'
import '@material/web/iconbutton/filled-tonal-icon-button.js'
import '@material/web/progress/circular-progress.js'
import '@material/web/progress/linear-progress.js'
import '@material/web/switch/switch.js'
import { MaterialIcon, type MaterialIconName } from './MaterialIcon'

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text'

interface M3ButtonProps
  extends Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'aria-label' | 'autoFocus' | 'className' | 'disabled' | 'onClick'
  > {
  children: ReactNode
  icon?: MaterialIconName
  variant?: ButtonVariant
}

const buttonTags = {
  filled: 'md-filled-button',
  tonal: 'md-filled-tonal-button',
  outlined: 'md-outlined-button',
  text: 'md-text-button',
} as const

export function M3Button({
  children,
  className,
  disabled,
  icon,
  variant = 'filled',
  ...props
}: M3ButtonProps) {
  const Tag = buttonTags[variant]

  return (
    <Tag type="button" className={className} disabled={disabled} {...props}>
      {icon && <MaterialIcon name={icon} slot="icon" />}
      {children}
    </Tag>
  )
}

interface M3IconButtonProps {
  'aria-label': string
  className?: string
  icon: MaterialIconName
  onClick: () => void
  selected?: boolean
  toggle?: boolean
}

export function M3IconButton({
  className,
  icon,
  ...props
}: M3IconButtonProps) {
  return (
    <md-filled-tonal-icon-button
      type="button"
      className={className}
      {...props}
    >
      <MaterialIcon name={icon} />
    </md-filled-tonal-icon-button>
  )
}

interface M3SwitchProps {
  'aria-label': string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function M3Switch({
  checked,
  onChange,
  ...props
}: M3SwitchProps) {
  return (
    <md-switch
      selected={checked}
      onClick={() => onChange(!checked)}
      {...props}
    />
  )
}

interface M3LinearProgressProps {
  'aria-label': string
  'aria-valuetext': string
  className?: string
  value: number
}

export function M3LinearProgress({
  value,
  ...props
}: M3LinearProgressProps) {
  return <md-linear-progress value={Math.max(0, Math.min(1, value))} {...props} />
}

export function M3CircularProgress({ className }: { className?: string }) {
  return (
    <md-circular-progress
      className={className}
      indeterminate
      aria-hidden="true"
    />
  )
}
