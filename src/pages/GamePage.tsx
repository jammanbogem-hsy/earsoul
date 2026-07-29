import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
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
  advanceCombo,
  type ComboState,
} from '../game/combo'
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
    icon: 'play_arrow',
    title: '바라보는 방향을 따라 굴려요',
    body: 'W·S(ㅈ·ㄴ)는 앞뒤, A·D(ㅁ·ㅇ)는 지금 보는 방향의 좌우로 움직여요. 조이스틱도 같은 방식이에요.',
  },
]

function getCurrentTimestamp() {
  return Date.now()
}

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
  const [comboMultiplier, setComboMultiplier] = useState(1)
  const [scoreFeedback, setScoreFeedback] = useState<{
    id: number
    points: number
  } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const comboTimer = useRef<number | undefined>(undefined)
  const scoreFeedbackTimer = useRef<number | undefined>(undefined)
  const comboStateRef = useRef<ComboState>({
    count: 0,
    lastCollectedAt: 0,
  })
  const scoreFeedbackId = useRef(0)
  const coachSeen = sessionStorage.getItem('earsoul-coach-v4-seen') === 'true'
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
        setControlVector({ x: 0, z: 0 })
        setPaused((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [coachStep])

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
      if (comboTimer.current) window.clearTimeout(comboTimer.current)
      if (scoreFeedbackTimer.current) {
        window.clearTimeout(scoreFeedbackTimer.current)
      }
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

    const collectedAt = getCurrentTimestamp()
    const comboStep = advanceCombo(comboStateRef.current, collectedAt)
    const { multiplier } = comboStep
    const awardedPoints = item.points * multiplier
    const next = recordCollection(current, item, {
      multiplier,
      combo: multiplier,
    })

    comboStateRef.current = {
      count: comboStep.count,
      lastCollectedAt: comboStep.lastCollectedAt,
    }
    setComboMultiplier(multiplier)
    if (comboTimer.current) window.clearTimeout(comboTimer.current)
    comboTimer.current = window.setTimeout(() => {
      comboStateRef.current = {
        count: 0,
        lastCollectedAt: 0,
      }
      setComboMultiplier(1)
    }, Math.max(0, comboStep.expiresAt - collectedAt))

    scoreFeedbackId.current += 1
    setScoreFeedback({
      id: scoreFeedbackId.current,
      points: awardedPoints,
    })
    if (scoreFeedbackTimer.current) {
      window.clearTimeout(scoreFeedbackTimer.current)
    }
    scoreFeedbackTimer.current = window.setTimeout(
      () => setScoreFeedback(null),
      1100,
    )

    sessionRef.current = next
    setSession(next)
    playChime(soundEnabled)
    showToast({
      title:
        multiplier > 1
          ? `x${multiplier} 콤보 · ${item.label} +${awardedPoints}`
          : `${item.label} +${awardedPoints}`,
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
        title: `아직은 인사만 · ${item.label}`,
        body: `${itemTier.level}단계 ${itemTier.label}이에요. 러닝볼을 조금 더 키우면 붙일 수 있어요.`,
        tone: 'wait',
      },
      1800,
    )
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

      <header className="game-hud" aria-label="놀이 상태와 설정">
        <section
          className="game-size-status"
          data-tier={reachableTier.level}
          style={{ '--tier-color': reachableTier.color } as CSSProperties}
          aria-label={`현재 ${reachableTier.level}단계 ${reachableTier.label}, ${pack.objects.length}개 중 ${session.collectedIds.length}개 수집`}
        >
          <span
            className="game-size-status__level"
            aria-hidden="true"
          >
            <small>크기</small>
            <strong>{reachableTier.level}</strong>
          </span>
          <div className="game-size-status__copy">
            <span>지금 모을 아이템</span>
            <strong>{reachableTier.label}</strong>
            <M3LinearProgress
              className="game-size-progress"
              aria-label="붙인 아이템"
              aria-valuetext={`${pack.objects.length}개 중 ${session.collectedIds.length}개를 러닝볼에 붙였어요`}
              value={progress}
            />
          </div>
          <span className="game-size-status__count" aria-hidden="true">
            <strong>{session.collectedIds.length}</strong>
            <small>/{pack.objects.length}</small>
          </span>
          <ol className="game-tier-legend" aria-label="아이템 크기 네 단계">
            {SIZE_TIERS.map((tier) => (
              <li
                key={tier.level}
                className={[
                  tier.level < reachableTier.level ? 'is-reached' : '',
                  tier.level === reachableTier.level ? 'is-current' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--tier-color': tier.color } as CSSProperties}
                aria-current={
                  tier.level === reachableTier.level ? 'step' : undefined
                }
                aria-label={`${tier.level}단계 ${tier.label}`}
              >
                <i aria-hidden="true" />
                <span>{tier.level}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="game-hud__actions">
          <div className="game-score-stack">
            <div
              className={`game-score ${
                scoreFeedback ? 'is-increasing' : ''
              }`}
              aria-label={`점수 ${session.score.toLocaleString()}점`}
            >
              <MaterialIcon name="star" />
              <span>점수</span>
              <strong>{session.score.toLocaleString()}</strong>
              {scoreFeedback && (
                <span
                  key={scoreFeedback.id}
                  className="game-score__gain"
                  aria-hidden="true"
                >
                  +{scoreFeedback.points}
                </span>
              )}
            </div>
            <div
              className={`game-combo ${
                comboMultiplier > 1 ? 'is-active' : ''
              }`}
              role="status"
              aria-live="polite"
              aria-label={`현재 ${comboMultiplier}배 콤보, 최고 ${session.bestCombo ?? 0}배 콤보`}
            >
              <MaterialIcon name="progress_activity" />
              <strong>x{comboMultiplier}</strong>
              <span>콤보</span>
              <small>최고 x{session.bestCombo ?? 0}</small>
              {comboMultiplier > 1 && (
                <i
                  key={scoreFeedback?.id ?? comboMultiplier}
                  className="game-combo__timer"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
          <M3IconButton
            className="hud-button"
            onClick={() => setSoundEnabled((current) => !current)}
            aria-label={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
            icon={soundEnabled ? 'volume_up' : 'volume_off'}
            selected={soundEnabled}
            toggle
          />
          <M3IconButton
            className="hud-button"
            onClick={() => {
              setControlVector({ x: 0, z: 0 })
              setPaused(true)
            }}
            aria-label="일시정지"
            icon="pause"
          />
        </div>
      </header>

      <div className="desktop-controls" aria-hidden="true">
        <span>
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd>
        </span>
        <p>한글 ㅈㅁㄴㅇ·방향키도 가능해요</p>
      </div>

      <div className="mobile-controls">
        {!isGamePaused && <TouchJoystick onChange={setControlVector} />}
      </div>

      <div
        className={`game-collection-status ${
          toast ? `is-${toast.tone}` : 'is-idle'
        }`}
        role="status"
        aria-live="polite"
      >
        <span>
          <MaterialIcon
            name={
              toast
                ? toast.tone === 'learned'
                  ? 'wand_stars'
                  : 'trending_up'
                : 'adjust'
            }
          />
        </span>
        <div>
          <strong>
            {toast
              ? toast.title
              : `러닝 아이템 ${session.collectedIds.length}개를 붙였어요`}
          </strong>
          <p>
            {toast
              ? toast.body
              : `${reachableTier.level}단계 ${reachableTier.label}에 가까이 가 보세요.`}
          </p>
        </div>
      </div>

      {!contentReady && (
        <div className="content-status" role="status">
          러닝 파크를 준비하고 있어요…
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
            <div className="coach-card__icon">
              <MaterialIcon name={coachSteps[coachStep].icon} />
            </div>
            <h2 id="coach-title">{coachSteps[coachStep].title}</h2>
            <p>{coachSteps[coachStep].body}</p>
            <M3Button
              className="primary-button primary-button--wide"
              icon="play_arrow"
              onClick={() => {
                sessionStorage.setItem('earsoul-coach-v4-seen', 'true')
                setCoachStep(-1)
              }}
            >
              바로 굴리기
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
            <h2 id="pause-title">러닝볼도 숨을 고르는 중!</h2>
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
              이번 기록 보기
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
