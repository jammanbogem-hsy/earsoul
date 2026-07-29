import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Brand } from '../components/Brand'
import { GameCanvas } from '../components/GameCanvas'
import {
  M3Button,
  M3IconButton,
  M3LinearProgress,
} from '../components/MaterialControls'
import {
  MaterialIcon,
  type MaterialIconName,
} from '../components/MaterialIcon'
import {
  TouchJoystick,
  type ControlVector,
} from '../components/TouchJoystick'
import { loadLearningPack } from '../data/contentRepository'
import { fallbackLearningPack } from '../data/learningPack'
import {
  calculateBallRadius,
  finishSession,
  readSession,
  recordCollection,
} from '../game/session'
import {
  getReachableSizeTier,
  getSizeTier,
  SIZE_TIERS,
} from '../game/mechanics'
import type { GameSession, LearningObject, LearningPack } from '../types'
import { Redirect, useAppNavigate } from '../navigation'

function playChime(enabled: boolean, success = true) {
  if (!enabled) return

  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext
        }
      ).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(success ? 520 : 330, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(
      success ? 760 : 390,
      context.currentTime + 0.12,
    )
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.24)
    oscillator.addEventListener('ended', () => void context.close())
  } catch {
    // Sound is a progressive enhancement; gameplay remains fully usable.
  }
}

const coachSteps: {
  icon: MaterialIconName
  title: string
  body: string
}[] = [
  {
    icon: 'sentiment_satisfied',
    title: '배움 친구가 함께 밀어요',
    body: '방향키나 WASD, 또는 화면 왼쪽 조이스틱을 움직이면 친구가 배움별을 밀어요.',
  },
  {
    icon: 'wand_stars',
    title: '작은 조각부터 만나요',
    body: '배움별보다 작은 조각에 다가가면 반짝이며 별에 붙어요.',
  },
  {
    icon: 'filter_4',
    title: '숫자와 바닥 원을 살펴봐요',
    body: '조각 위 숫자와 바닥 원 개수가 클수록 더 큰 조각이에요. 별을 키워 차례로 만나 보세요.',
  },
]

export function GamePage() {
  const navigate = useAppNavigate()
  const [session, setSession] = useState<GameSession | null>(() => readSession())
  const sessionRef = useRef(session)
  const [pack, setPack] = useState<LearningPack>(fallbackLearningPack)
  const [contentReady, setContentReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [controlVector, setControlVector] = useState<ControlVector>({
    x: 0,
    z: 0,
  })
  const [toast, setToast] = useState<{
    title: string
    body: string
    tone: 'learned' | 'wait'
  } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const coachSeen = sessionStorage.getItem('earsoul-coach-v2-seen') === 'true'
  const [coachStep, setCoachStep] = useState(coachSeen ? -1 : 0)
  const reducedMotion =
    sessionStorage.getItem('earsoul-reduced-motion') === 'true'

  useEffect(() => {
    let mounted = true
    loadLearningPack().then((learningPack) => {
      if (mounted) {
        setPack(learningPack)
        setContentReady(true)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && coachStep < 0) {
        setPaused((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [coachStep])

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const showToast = useCallback(
    (
      nextToast: {
        title: string
        body: string
        tone: 'learned' | 'wait'
      },
      duration = 2600,
    ) => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
      setToast(nextToast)
      toastTimer.current = window.setTimeout(() => setToast(null), duration)
    },
    [],
  )

  if (!session || session.status !== 'playing') {
    return <Redirect to="/" />
  }

  const ballRadius = calculateBallRadius(session.collectedIds.length)
  const progress = session.collectedIds.length / pack.objects.length
  const reachableTier = getReachableSizeTier(ballRadius)

  const handleCollect = (item: LearningObject) => {
    const current = sessionRef.current
    if (!current || current.collectedIds.includes(item.id)) return

    const next = recordCollection(current, item)
    sessionRef.current = next
    setSession(next)
    playChime(soundEnabled)
    showToast({
      title: `${item.label} 발견! +${item.points}`,
      body: item.fact,
      tone: 'learned',
    })

    if (next.collectedIds.length === pack.objects.length) {
      window.setTimeout(() => finish(), 900)
    }
  }

  const handleTooLarge = (item: LearningObject) => {
    const itemTier = getSizeTier(item.size)
    showToast(
      {
        title: `${item.label}은 조금 뒤에 만나요`,
        body: `${itemTier.level}단계 ${itemTier.label}이에요. 숫자가 더 작은 조각부터 모아 별을 키워 보세요.`,
        tone: 'wait',
      },
      1800,
    )
    playChime(soundEnabled, false)
  }

  const finish = () => {
    const current = sessionRef.current
    if (!current) return
    const completed = finishSession(current)
    sessionRef.current = completed
    setSession(completed)
    navigate('/results')
  }

  const leaveForHome = () => {
    const shouldLeave = window.confirm(
      '처음 화면으로 돌아가면 이번 놀이 기록이 사라져요. 돌아갈까요?',
    )
    if (shouldLeave) {
      sessionStorage.removeItem('earsoul-learning-session')
      navigate('/')
    }
  }

  const isGamePaused = paused || coachStep >= 0

  return (
    <main id="main-content" className="game-page">
      <div className="game-stage" aria-label={`${pack.title} 3D 놀이 화면`}>
        <GameCanvas
          objects={pack.objects}
          collectedIds={session.collectedIds}
          ballRadius={ballRadius}
          paused={isGamePaused}
          reducedMotion={reducedMotion}
          controlVector={controlVector}
          onCollect={handleCollect}
          onTooLarge={handleTooLarge}
        />
      </div>

      <header className="game-topbar">
        <div className="game-brand-card">
          <Brand compact />
        </div>
        <div className="mission-card">
          <div>
            <span>오늘의 탐험</span>
            <strong>배움 조각을 만나 별을 키워요</strong>
          </div>
          <M3LinearProgress
            className="mission-progress"
            aria-label="전체 수집 진행"
            aria-valuetext={`${pack.objects.length}개 중 ${session.collectedIds.length}개`}
            value={progress}
          />
        </div>
        <div className="score-card" aria-live="polite">
          <span>배움 점수</span>
          <strong>{session.score.toLocaleString()}</strong>
        </div>
        <M3IconButton
          className="hud-button"
          onClick={() => setSoundEnabled((current) => !current)}
          aria-label="효과음"
          icon={soundEnabled ? 'volume_up' : 'volume_off'}
          selected={soundEnabled}
          toggle
        />
        <M3IconButton
          className="hud-button"
          onClick={() => setPaused(true)}
          aria-label="일시정지"
          icon="pause"
        />
      </header>

      <aside className="size-guide-card" aria-label="배움 조각 크기 안내">
        <div className="size-guide-card__heading">
          <span>
            <MaterialIcon name="adjust" />
          </span>
          <div>
            <small>조각 크기 안내</small>
            <strong>원과 숫자가 클수록 커요</strong>
          </div>
        </div>
        <div className="size-tier-list">
          {SIZE_TIERS.map((tier) => (
            <span
              key={tier.level}
              className={
                tier.level <= reachableTier.level ? 'is-reachable' : ''
              }
              style={{ '--tier-color': tier.color } as CSSProperties}
            >
              <b>{tier.level}</b>
              <i className="tier-scale-dots" aria-hidden="true">
                {Array.from({ length: tier.level }, (_, index) => (
                  <span key={index} />
                ))}
              </i>
              {tier.label}
            </span>
          ))}
        </div>
      </aside>

      <aside className="size-card">
        <span className="size-card__orb" aria-hidden="true">
          <i style={{ transform: `scale(${Math.min(1.45, ballRadius)})` }} />
        </span>
        <p>
          <small>지금 모을 수 있는 크기</small>
          <strong>
            {reachableTier.level}단계 · {reachableTier.label}
          </strong>
        </p>
        <span className="count-pill">
          {session.collectedIds.length}/{pack.objects.length}
        </span>
      </aside>

      <div className="desktop-controls" aria-hidden="true">
        <span>
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd>
        </span>
        <p>또는 방향키로 움직여요</p>
      </div>

      <div className="mobile-controls">
        <TouchJoystick onChange={setControlVector} />
      </div>

      {toast && (
        <div
          className={`learning-toast is-${toast.tone}`}
          role="status"
          aria-live="polite"
        >
          <span>
            <MaterialIcon
              name={toast.tone === 'learned' ? 'wand_stars' : 'trending_up'}
            />
          </span>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.body}</p>
          </div>
        </div>
      )}

      {!contentReady && (
        <div className="content-status" role="status">
          배움 정원을 준비하고 있어요…
        </div>
      )}

      {coachStep >= 0 && (
        <div className="modal-backdrop">
          <section
            className="coach-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coach-title"
          >
            <span className="coach-card__step">
              {coachStep + 1} / {coachSteps.length}
            </span>
            <div className="coach-card__icon">
              <MaterialIcon name={coachSteps[coachStep].icon} />
            </div>
            <h2 id="coach-title">{coachSteps[coachStep].title}</h2>
            <p>{coachSteps[coachStep].body}</p>
            <div className="coach-dots" aria-hidden="true">
              {coachSteps.map((step, index) => (
                <span
                  key={step.title}
                  className={index === coachStep ? 'is-active' : ''}
                />
              ))}
            </div>
            <M3Button
              className="primary-button primary-button--wide"
              icon="arrow_forward"
              onClick={() => {
                if (coachStep === coachSteps.length - 1) {
                  sessionStorage.setItem('earsoul-coach-v2-seen', 'true')
                  setCoachStep(-1)
                } else {
                  setCoachStep((step) => step + 1)
                }
              }}
            >
              {coachStep === coachSteps.length - 1
                ? '이제 굴려 볼게요!'
                : '다음'}
            </M3Button>
          </section>
        </div>
      )}

      {paused && (
        <div className="modal-backdrop">
          <section
            className="pause-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-title"
          >
            <span className="pause-card__icon">
              <MaterialIcon name="pause_circle" />
            </span>
            <p className="section-kicker">잠깐 쉬어가요</p>
            <h2 id="pause-title">배움별도 숨을 고르는 중!</h2>
            <p>준비되면 같은 자리에서 다시 시작할 수 있어요.</p>
            <M3Button
              className="primary-button primary-button--wide"
              icon="play_arrow"
              onClick={() => setPaused(false)}
              autoFocus
            >
              계속 굴리기
            </M3Button>
            <M3Button
              className="secondary-button secondary-button--wide"
              variant="tonal"
              onClick={finish}
            >
              지금까지 결과 보기
            </M3Button>
            <M3Button
              className="text-button"
              variant="text"
              icon="home"
              onClick={leaveForHome}
            >
              이번 기록을 지우고 처음으로
            </M3Button>
          </section>
        </div>
      )}

    </main>
  )
}
