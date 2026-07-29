import { useState } from 'react'
import { Brand } from '../components/Brand'
import { startSession } from '../game/session'
import { useAppNavigate } from '../navigation'

const subjectChips = [
  { label: '한글', symbol: '가', color: 'coral' },
  { label: '수학', symbol: '△', color: 'blue' },
  { label: '과학', symbol: '🌱', color: 'green' },
  { label: '생활', symbol: '♪', color: 'yellow' },
]

export function HomePage() {
  const navigate = useAppNavigate()
  const [reducedMotion, setReducedMotion] = useState(
    sessionStorage.getItem('earsoul-reduced-motion') === 'true' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const begin = () => {
    sessionStorage.setItem(
      'earsoul-reduced-motion',
      String(reducedMotion),
    )
    startSession()
    navigate('/play')
  }

  return (
    <main id="main-content" className="home-page">
      <header className="home-header page-container">
        <Brand compact />
        <label className="motion-toggle">
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(event) => setReducedMotion(event.target.checked)}
          />
          <span aria-hidden="true" />
          움직임 줄이기
        </label>
      </header>

      <section className="hero page-container">
        <div className="hero-copy">
          <p className="eyebrow">초등 1–4학년을 위한 3D 배움 놀이</p>
          <h1>
            작은 지식부터 모아
            <br />
            <span>나만의 배움별</span>을 키워요
          </h1>
          <p className="hero-description">
            알록달록한 배움 정원을 굴러 다니며 한글, 수학, 과학 조각을
            발견해요. 서두르지 않아도 괜찮아요. 틀려도 다시 생각할 수 있어요.
          </p>
          <button type="button" className="primary-button" onClick={begin}>
            배움 정원 들어가기
            <span aria-hidden="true">→</span>
          </button>
          <p className="privacy-note">
            <span aria-hidden="true">●</span>
            이름을 묻지 않고, 점수는 현재 브라우저 세션에만 남겨요.
          </p>
        </div>

        <div className="hero-world" aria-label="배움별 굴리기 미리보기">
          <div className="hero-world__sky">
            <span className="cloud cloud--one" />
            <span className="cloud cloud--two" />
          </div>
          <div className="hero-orb">
            <span className="hero-orb__face">가</span>
            {subjectChips.map((chip, index) => (
              <span
                key={chip.label}
                className={`hero-token hero-token--${chip.color} hero-token--${index + 1}`}
              >
                {chip.symbol}
              </span>
            ))}
          </div>
          <div className="hero-world__ground">
            <span className="sprout sprout--one">✦</span>
            <span className="sprout sprout--two">✿</span>
            <span className="sprout sprout--three">▲</span>
          </div>
        </div>
      </section>

      <section className="subjects page-container" aria-labelledby="subject-title">
        <div>
          <p className="section-kicker">오늘 만날 배움 조각</p>
          <h2 id="subject-title">네 가지 주제를 한 정원에서</h2>
        </div>
        <div className="subject-list">
          {subjectChips.map((chip) => (
            <div key={chip.label} className={`subject-chip is-${chip.color}`}>
              <span>{chip.symbol}</span>
              <strong>{chip.label}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="how-to page-container" aria-labelledby="how-title">
        <div className="section-heading">
          <p className="section-kicker">놀이 방법</p>
          <h2 id="how-title">세 가지만 기억해요</h2>
        </div>
        <ol className="how-grid">
          <li>
            <span className="step-number">1</span>
            <div className="step-visual step-visual--keys" aria-hidden="true">
              <kbd>W</kbd>
              <kbd>←</kbd>
              <kbd>↑</kbd>
              <kbd>→</kbd>
            </div>
            <h3>천천히 굴려요</h3>
            <p>키보드 방향키나 화면의 둥근 조이스틱을 사용해요.</p>
          </li>
          <li>
            <span className="step-number">2</span>
            <div className="step-visual step-visual--collect" aria-hidden="true">
              <i>가</i>
              <b>+</b>
              <i>△</i>
            </div>
            <h3>작은 것부터 만나요</h3>
            <p>내 배움별보다 작은 조각은 반짝이며 친구가 돼요.</p>
          </li>
          <li>
            <span className="step-number">3</span>
            <div className="step-visual step-visual--quiz" aria-hidden="true">
              <i>?</i>
              <span>★</span>
            </div>
            <h3>배움 문을 열어요</h3>
            <p>짧은 문제를 풀고 새로 알게 된 내용을 확인해요.</p>
          </li>
        </ol>
      </section>

      <footer className="home-footer page-container">
        <Brand compact />
        <p>광고·채팅·공개 순위표 없이 편안하게 놀아요.</p>
      </footer>
    </main>
  )
}
