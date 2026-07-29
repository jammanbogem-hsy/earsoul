import { useState } from 'react'
import { Brand } from '../components/Brand'
import { M3Button, M3Switch } from '../components/MaterialControls'
import {
  MaterialIcon,
  type MaterialIconName,
} from '../components/MaterialIcon'
import { startSession } from '../game/session'
import { useAppNavigate } from '../navigation'

const subjectChips: {
  label: string
  icon: MaterialIconName
  color: string
}[] = [
  { label: '러닝 기어', icon: 'directions_run', color: 'coral' },
  { label: '음료', icon: 'local_drink', color: 'blue' },
  { label: '기록', icon: 'timer', color: 'green' },
  { label: '보물', icon: 'diamond', color: 'yellow' },
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
        <div className="motion-toggle">
          <M3Switch
            aria-label="움직임 줄이기"
            checked={reducedMotion}
            onChange={setReducedMotion}
          />
          <span className="motion-toggle__label">움직임 줄이기</span>
        </div>
      </header>

      <section className="hero page-container">
        <div className="hero-copy">
          <p className="eyebrow">러닝크루를 위한 3D 수집 챌린지</p>
          <h1>
            작은 아이템부터 모아
            <br />
            <span>나만의 러닝볼</span>을 키워요
          </h1>
          <p className="hero-description">
            넓어진 러닝 파크를 누비며 운동화, 음료수 캔, 시계와 보물조각을
            모아요. 빠르게 이어 모을수록 콤보 점수가 커져요.
          </p>
          <M3Button
            className="primary-button"
            icon="arrow_forward"
            onClick={begin}
          >
            러닝 파크 들어가기
          </M3Button>
          <p className="privacy-note">
            <MaterialIcon name="privacy_tip" />
            이름을 묻지 않고, 점수는 현재 브라우저 세션에만 남겨요.
          </p>
        </div>

        <div className="hero-world" aria-label="러닝볼 굴리기 미리보기">
          <div className="hero-world__sky">
            <span className="cloud cloud--one" />
            <span className="cloud cloud--two" />
          </div>
          <div className="hero-orb">
            <span className="hero-orb__face">
              <MaterialIcon name="directions_run" />
            </span>
            <MaterialIcon
              name="sentiment_satisfied"
              className="hero-orb__smile"
            />
            {subjectChips.map((chip, index) => (
              <span
                key={chip.label}
                className={`hero-token hero-token--${chip.color} hero-token--${index + 1}`}
              >
                <MaterialIcon name={chip.icon} />
              </span>
            ))}
          </div>
          <div className="hero-helper" aria-hidden="true">
            <span className="hero-helper__head" />
            <span className="hero-helper__body" />
            <span className="hero-helper__arm hero-helper__arm--left" />
            <span className="hero-helper__arm hero-helper__arm--right" />
            <span className="hero-helper__leg hero-helper__leg--left" />
            <span className="hero-helper__leg hero-helper__leg--right" />
          </div>
          <div className="hero-world__ground">
            <span className="sprout sprout--one">
              <MaterialIcon name="wand_stars" />
            </span>
            <span className="sprout sprout--two">
              <MaterialIcon name="local_florist" />
            </span>
            <span className="sprout sprout--three">
              <MaterialIcon name="change_history" />
            </span>
          </div>
        </div>
      </section>

      <section className="subjects page-container" aria-labelledby="subject-title">
        <div>
          <p className="section-kicker">오늘 만날 러닝 아이템</p>
          <h2 id="subject-title">네 가지 수집 테마를 한 파크에서</h2>
        </div>
        <div className="subject-list">
          {subjectChips.map((chip) => (
            <div key={chip.label} className={`subject-chip is-${chip.color}`}>
              <span>
                <MaterialIcon name={chip.icon} />
              </span>
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
              <kbd>
                <MaterialIcon name="keyboard_arrow_left" />
              </kbd>
              <kbd>
                <MaterialIcon name="keyboard_arrow_up" />
              </kbd>
              <kbd>
                <MaterialIcon name="keyboard_arrow_right" />
              </kbd>
            </div>
            <h3>천천히 굴려요</h3>
            <p>WASD·한글 ㅈㅁㄴㅇ·방향키나 조이스틱을 사용해요.</p>
          </li>
          <li>
            <span className="step-number">2</span>
            <div className="step-visual step-visual--collect" aria-hidden="true">
              <i>
                <MaterialIcon name="directions_run" />
              </i>
              <b>
                <MaterialIcon name="add" />
              </b>
              <i>
                <MaterialIcon name="diamond" />
              </i>
            </div>
            <h3>작은 것부터 만나요</h3>
            <p>러닝볼보다 작은 아이템은 닿는 순간 표면에 붙어요.</p>
          </li>
          <li>
            <span className="step-number">3</span>
            <div className="step-visual step-visual--size" aria-hidden="true">
              <i>
                <MaterialIcon name="looks_one" />
              </i>
              <i>
                <MaterialIcon name="looks_two" />
              </i>
              <i>
                <MaterialIcon name="looks_3" />
              </i>
              <i>
                <MaterialIcon name="looks_4" />
              </i>
            </div>
            <h3>크기 단계를 살펴봐요</h3>
            <p>숫자와 바닥 원을 보고 작은 아이템부터 차례로 모아요.</p>
          </li>
        </ol>
      </section>

      <footer className="home-footer page-container">
        <Brand compact />
        <p>점수와 최고 콤보는 현재 브라우저 세션에만 남아요.</p>
      </footer>
    </main>
  )
}
