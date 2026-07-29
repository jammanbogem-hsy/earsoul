import { useState } from 'react'
import type { QuizQuestion } from '../types'

interface QuizModalProps {
  quiz: QuizQuestion
  onComplete: (correctOnFirstTry: boolean) => void
}

export function QuizModal({ quiz, onComplete }: QuizModalProps) {
  const [attempts, setAttempts] = useState(0)
  const [message, setMessage] = useState('')
  const [complete, setComplete] = useState(false)

  const readQuestion = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(
      `${quiz.question}. ${quiz.choices.join(', ')}`,
    )
    utterance.lang = 'ko-KR'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const chooseAnswer = (choiceIndex: number) => {
    if (complete) return

    if (choiceIndex === quiz.answerIndex) {
      setComplete(true)
      setMessage(`정답이에요! ${quiz.explanation}`)
      return
    }

    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)
    if (nextAttempts >= 2) {
      setComplete(true)
      setMessage(
        `함께 알아볼까요? 정답은 “${quiz.choices[quiz.answerIndex]}”. ${quiz.explanation}`,
      )
    } else {
      setMessage('괜찮아요. 물건에서 배운 내용을 떠올리며 다시 골라 보세요.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="quiz-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        aria-describedby={message ? 'quiz-feedback' : undefined}
      >
        <div className="quiz-card__eyebrow">
          <span>{quiz.subject} 배움 문</span>
          <button
            className="icon-button icon-button--light"
            type="button"
            onClick={readQuestion}
            aria-label="문제 소리 내어 읽기"
            title="문제 읽어 주기"
          >
            🔊
          </button>
        </div>
        <h2 id="quiz-title">{quiz.question}</h2>
        <div className="quiz-choices">
          {quiz.choices.map((choice, index) => (
            <button
              key={choice}
              type="button"
              className="quiz-choice"
              onClick={() => chooseAnswer(index)}
              disabled={complete}
            >
              <span>{index + 1}</span>
              {choice}
            </button>
          ))}
        </div>
        {message && (
          <div
            id="quiz-feedback"
            className={`quiz-feedback ${complete ? 'is-complete' : ''}`}
            aria-live="polite"
          >
            <span aria-hidden="true">{complete ? '★' : '↻'}</span>
            <p>{message}</p>
          </div>
        )}
        {complete && (
          <button
            type="button"
            className="primary-button primary-button--wide"
            onClick={() => onComplete(attempts === 0)}
            autoFocus
          >
            정원으로 돌아가기
            <span aria-hidden="true">→</span>
          </button>
        )}
      </section>
    </div>
  )
}
