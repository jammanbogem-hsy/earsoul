import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AppLayout } from './components/AppLayout'
import { M3CircularProgress } from './components/MaterialControls'
import {
  NavigateContext,
  type AppPath,
  type Navigate,
} from './navigation'
import { HomePage } from './pages/HomePage'
import { ResultsPage } from './pages/ResultsPage'

const GamePage = lazy(() =>
  import('./pages/GamePage').then((module) => ({
    default: module.GamePage,
  })),
)
const knownPaths = new Set<AppPath>(['/', '/play', '/results'])

function getPath(): AppPath {
  return knownPaths.has(window.location.pathname as AppPath)
    ? (window.location.pathname as AppPath)
    : '/'
}

function RouteView({ path }: { path: AppPath }) {
  if (path === '/play') {
    return (
      <Suspense
        fallback={
          <div className="route-loader" role="status">
            <M3CircularProgress />
            러닝 파크를 불러오고 있어요…
          </div>
        }
      >
        <GamePage />
      </Suspense>
    )
  }
  if (path === '/results') return <ResultsPage />
  return <HomePage />
}

export function AppRouter() {
  const [path, setPath] = useState<AppPath>(getPath)

  const navigate = useCallback<Navigate>((nextPath, options) => {
    if (window.location.pathname !== nextPath) {
      if (options?.replace) {
        window.history.replaceState({}, '', nextPath)
      } else {
        window.history.pushState({}, '', nextPath)
      }
    }
    setPath(nextPath)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    if (!knownPaths.has(window.location.pathname as AppPath)) {
      window.history.replaceState({}, '', '/')
    }
    const handlePopState = () => setPath(getPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <NavigateContext.Provider value={navigate}>
      <AppLayout>
        <RouteView path={path} />
      </AppLayout>
    </NavigateContext.Provider>
  )
}
