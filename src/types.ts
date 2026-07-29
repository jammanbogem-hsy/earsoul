export type LearningSubject = '한글' | '수학' | '과학' | '생활'

export type ObjectShape =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'book'
  | 'pencil'
  | 'letter'

export interface LearningObject {
  id: string
  label: string
  fact: string
  subject: LearningSubject
  size: number
  points: number
  color: string
  shape: ObjectShape
  position: [number, number, number]
  symbol?: string
}

export interface QuizQuestion {
  id: string
  subject: LearningSubject
  question: string
  choices: string[]
  answerIndex: number
  explanation: string
}

export interface LearningPack {
  title: string
  objects: LearningObject[]
  quizzes: QuizQuestion[]
}

export interface GameSession {
  id: string
  startedAt: number
  updatedAt: number
  completedAt?: number
  score: number
  collectedIds: string[]
  collectedLabels: string[]
  correctAnswers: number
  answeredQuestions: number
  completedQuizIds: string[]
  durationSeconds: number
  status: 'playing' | 'completed'
}
