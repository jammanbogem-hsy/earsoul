import { Brand } from '../components/Brand'
import { M3Button } from '../components/MaterialControls'
import { MaterialIcon } from '../components/MaterialIcon'
import {
  calculateBallRadius,
  clearSession,
  getStarRating,
  readSession,
  startSession,
} from '../game/session'
import { getReachableSizeTier } from '../game/mechanics'
import { Redirect, useAppNavigate } from '../navigation'

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}분 ${seconds}초`
}

export function ResultsPage() {
  const navigate = useAppNavigate()
  const session = readSession()

  if (!session || session.status !== 'completed') {
    return <Redirect to="/" />
  }

  const stars = getStarRating(session)
  const reachedTier = getReachableSizeTier(
    calculateBallRadius(session.collectedIds.length),
  )

  return (
    <main id="main-content" className="results-page">
      <header className="results-header page-container">
        <Brand compact />
      </header>
      <section className="results-card page-container">
        <div className="results-celebration" aria-hidden="true">
          <MaterialIcon name="wand_stars" />
          <div className="result-orb">가</div>
          <MaterialIcon name="local_florist" />
        </div>
        <p className="eyebrow">오늘의 배움 정원 탐험 완료</p>
        <h1>멋진 배움별이 완성됐어요!</h1>
        <p className="results-intro">
          빠르게 끝내는 것보다 작은 조각부터 차근차근 별을 키운 것이 더
          중요해요.
        </p>

        <div className="star-rating" aria-label={`별 ${stars}개`}>
          {[1, 2, 3].map((star) => (
            <span key={star} className={star <= stars ? 'is-earned' : ''}>
              <MaterialIcon name="star" />
            </span>
          ))}
        </div>

        <dl className="results-stats">
          <div>
            <dt>배움 점수</dt>
            <dd>{session.score.toLocaleString()}점</dd>
          </div>
          <div>
            <dt>발견한 조각</dt>
            <dd>{session.collectedIds.length}개</dd>
          </div>
          <div>
            <dt>도달한 크기</dt>
            <dd>{reachedTier.level}단계</dd>
          </div>
          <div>
            <dt>탐험 시간</dt>
            <dd>{formatDuration(session.durationSeconds)}</dd>
          </div>
        </dl>

        <section className="discovery-list" aria-labelledby="discovery-title">
          <div>
            <p className="section-kicker">이번에 발견한 것</p>
            <h2 id="discovery-title">나의 배움 조각</h2>
          </div>
          <div className="discovery-chips">
            {session.collectedLabels.length ? (
              session.collectedLabels.map((label) => (
                <span key={label}>{label}</span>
              ))
            ) : (
              <span>다음 탐험에서 첫 조각을 만나 보세요.</span>
            )}
          </div>
        </section>

        <div className="results-actions">
          <M3Button
            className="primary-button"
            icon="replay"
            onClick={() => {
              startSession()
              navigate('/play')
            }}
          >
            한 번 더 굴리기
          </M3Button>
          <M3Button
            className="secondary-button"
            icon="home"
            variant="outlined"
            onClick={() => {
              clearSession()
              navigate('/')
            }}
          >
            처음 화면으로
          </M3Button>
        </div>
      </section>
    </main>
  )
}
