/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react'

export type AppPath = '/' | '/play' | '/results'
export type Navigate = (
  path: AppPath,
  options?: { replace?: boolean },
) => void

export const NavigateContext = createContext<Navigate | null>(null)

export function useAppNavigate(): Navigate {
  const navigate = useContext(NavigateContext)
  if (!navigate) {
    throw new Error('useAppNavigate must be used inside AppRouter')
  }
  return navigate
}

export function Redirect({ to }: { to: AppPath }) {
  const navigate = useAppNavigate()
  useEffect(() => navigate(to, { replace: true }), [navigate, to])
  return null
}

export function RouteLink({
  to,
  children,
  className,
}: {
  to: AppPath
  children: ReactNode
  className?: string
}) {
  const navigate = useAppNavigate()
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault()
          navigate(to)
        }
      }}
    >
      {children}
    </a>
  )
}
