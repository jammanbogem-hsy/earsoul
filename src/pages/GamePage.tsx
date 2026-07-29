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
  advanceSessionStage,
  calculateBallRadius,
  clearSession,
  finishSession,
  readSession,
  recordCollection,
} from '../game/session'
import {
  getReachableSizeTier,
  getSizeTier,
  getStageProgress,
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
  const [stagePromptOpen, setStagePromptOpen] = useState(
    import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('complete') === 'true',
  )
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

  const previewStageIndex = import.meta.env.DEV
    ? Number(new URLSearchParams(window.location.search).get('stage')) - 1
    : Number.NaN
  const stageIndex = Math.min(
    Number.isInteger(previewStageIndex) && previewStageIndex >= 0
      ? previewStageIndex
      : session.currentStageIndex,
    Math.max(0, pack.stages.length - 1),
  )
  const stage = pack.stages[stageIndex] ?? fallbackLearningPack.stages[0]
  const stageProgress = getStageProgress(
    stage.objects,
    session.collectedIds,
    stage.objectiveCount,
  )
  const stageCollectedCount = stageProgress.collectedCount
  const attachedObjects = pack.objects.filter((item) =>
    session.collectedIds.includes(item.id),
  )
  const stageReady = stageProgress.ready
  const bonusCount = stageProgress.bonusCount
  const previewCollectedCount =
    import.meta.env.DEV &&
    Number.isInteger(previewStageIndex) &&
    previewStageIndex >= 0
      ? pack.stages
          .slice(0, stageIndex)
          .reduce((total, map) => total + map.objectiveCount, 0)
      : 0
  const ballRadius = calculateBallRadius(
    Math.max(session.collectedIds.length, previewCollectedCount),
  )
  const progress = stageProgress.progress
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

    const nextStageProgress = getStageProgress(
      stage.objects,
      next.collectedIds,
      stage.objectiveCount,
    )
    if (
      !stageProgress.ready &&
      nextStageProgress.ready
    ) {
      setControlVector({ x: 0, z: 0 })
      window.setTimeout(() => setStagePromptOpen(true), 700)
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

  const moveToNextStage = () => {
    const current = sessionRef.current
    if (!current) return
    if (stageIndex >= pack.stages.length - 1) {
      finish()
      return
    }

    const nextStageIndex = stageIndex + 1
    const next = advanceSessionStage(current, nextStageIndex)
    const nextStage = pack.stages[nextStageIndex]
    comboStateRef.current = { count: 0, lastCollectedAt: 0 }
    setComboMultiplier(1)
    setControlVector({ x: 0, z: 0 })
    setStagePromptOpen(false)
    sessionRef.current = next
    setSession(next)
    showToast(
      {
        title: `${nextStageIndex + 1}단계 · ${nextStage.title}`,
        body: nextStage.description,
        tone: 'learned',
      },
      3200,
    )
  }

  const leaveForHome = () => {
    const shouldLeave = window.confirm(
      '처음 화면으로 돌아가면 이번 놀이 기록이 사라져요. 돌아갈까요?',
    )
    if (shouldLeave) {
      clearSession()
      navigate('/')
    }
  }

  const isGamePaused = paused || coachStep >= 0 || stagePromptOpen

  return (
    <main id="main-content" className="game-page">
      <div
        className="game-stage"
        aria-label={`${stage.title} 3D 놀이 화면`}
      >
        <GameCanvas
          key={stage.id}
          stage={stage}
          attachedObjects={attachedObjects}
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
          data-stage={stageIndex + 1}
          style={{ '--tier-color': stage.accentColor } as CSSProperties}
          aria-label={`${pack.stages.length}개 중 ${stageIndex + 1}번째 맵 ${stage.title}, 목표 ${stage.objectiveCount}개 중 ${stageCollectedCount}개 수집`}
        >
          <span
            className="game-size-status__level"
            aria-hidden="true"
          >
            <small>맵</small>
            <strong>{stageIndex + 1}</strong>
          </span>
          <div className="game-size-status__copy">
            <span>
              스테이지 {stageIndex + 1}/{pack.stages.length} ·{' '}
              {reachableTier.level}단계 크기
            </span>
            <strong>{stage.title}</strong>
            <M3LinearProgress
              className="game-size-progress"
              aria-label="현재 맵 목표"
              aria-valuetext={`목표 ${stage.objectiveCount}개 중 ${stageCollectedCount}개를 붙였어요`}
              value={progress}
            />
          </div>
          <span className="game-size-status__count" aria-hidden="true">
            <strong>{Math.min(stageCollectedCount, stage.objectiveCount)}</strong>
            <small>/{stage.objectiveCount}</small>
          </span>
          <ol className="game-tier-legend" aria-label="세 개의 러닝 맵">
            {pack.stages.map((map, index) => (
              <li
                key={map.id}
                className={[
                  index < stageIndex ? 'is-reached' : '',
                  index === stageIndex ? 'is-current' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--tier-color': map.accentColor } as CSSProperties}
                aria-current={
                  index === stageIndex ? 'step' : undefined
                }
                aria-label={`${index + 1}단계 ${map.title}`}
              >
                <i aria-hidden="true" />
                <span>{index + 1}</span>
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

      {stageReady && !stagePromptOpen && !paused && coachStep < 0 && (
        <M3Button
          className="stage-ready-button"
          icon={stageIndex < pack.stages.length - 1 ? 'arrow_forward' : 'star'}
          onClick={() => {
            setControlVector({ x: 0, z: 0 })
            setStagePromptOpen(true)
          }}
        >
          {stageIndex < pack.stages.length - 1
            ? '다음 맵 열림'
            : '기록 완성하기'}
        </M3Button>
      )}

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
              : stageReady
                ? `${stage.title} 목표를 달성했어요`
                : `${stage.title} · ${stageCollectedCount}/${stage.objectiveCount}`}
          </strong>
          <p>
            {toast
              ? toast.body
              : stageReady
                ? `보너스 ${bonusCount}개 · 더 모으거나 다음 맵으로 갈 수 있어요.`
                : `64개 중 원하는 길을 골라 ${stage.objectiveCount - stageCollectedCount}개만 더 모아요.`}
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

      {stagePromptOpen && (
        <div className="modal-backdrop">
          <section
            className="stage-complete-card"
            style={{ '--stage-accent': stage.accentColor } as CSSProperties}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stage-complete-title"
          >
            <span className="stage-complete-card__icon">
              <MaterialIcon
                name={
                  stage.theme === 'sunny-plaza'
                    ? 'directions_run'
                    : stage.theme === 'forest-trail'
                      ? 'local_florist'
                      : 'diamond'
                }
              />
            </span>
            <p className="section-kicker">
              스테이지 {stageIndex + 1}/{pack.stages.length} 목표 달성
            </p>
            <h2 id="stage-complete-title">{stage.title} 길이 열렸어요!</h2>
            <p>
              목표 {stage.objectiveCount}개를 모았어요.
              {bonusCount > 0 && ` 보너스 아이템도 ${bonusCount}개 더 찾았어요.`}
            </p>
            <div className="stage-complete-card__stats">
              <span>
                <MaterialIcon name="star" />
                {session.score.toLocaleString()}점
              </span>
              <span>
                <MaterialIcon name="progress_activity" />
                최고 x{session.bestCombo}
              </span>
            </div>
            <M3Button
              className="primary-button primary-button--wide"
              icon={
                stageIndex < pack.stages.length - 1
                  ? 'arrow_forward'
                  : 'star'
              }
              onClick={moveToNextStage}
              autoFocus
            >
              {stageIndex < pack.stages.length - 1
                ? `${pack.stages[stageIndex + 1].title}로`
                : '이번 기록 완성하기'}
            </M3Button>
            <M3Button
              className="secondary-button secondary-button--wide"
              variant="tonal"
              icon="directions_run"
              onClick={() => setStagePromptOpen(false)}
            >
              이 맵에서 보너스 더 모으기
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
