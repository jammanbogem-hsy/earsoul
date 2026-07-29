import type {
  AriaAttributes,
  DetailedHTMLProps,
  HTMLAttributes,
} from 'react'

type MdElementProps = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
>
type MdButtonProps = MdElementProps & {
  disabled?: boolean
  type?: 'button' | 'reset' | 'submit'
}
type MdIconButtonProps = MdButtonProps & {
  selected?: boolean
  toggle?: boolean
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-button': MdButtonProps
      'md-filled-tonal-button': MdButtonProps
      'md-outlined-button': MdButtonProps
      'md-text-button': MdButtonProps
      'md-filled-tonal-icon-button': MdIconButtonProps
      'md-switch': MdElementProps & {
        selected?: boolean
      }
      'md-linear-progress': MdElementProps &
        AriaAttributes & {
          value?: number
        }
      'md-circular-progress': MdElementProps & {
        indeterminate?: boolean
      }
    }
  }
}

export {}
