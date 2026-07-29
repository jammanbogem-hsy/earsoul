export type LearningSubject = '한글' | '수학' | '과학' | '생활'
export type StageTheme = 'sunny-plaza' | 'forest-trail' | 'starlight-river'

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
  modelId?: string
  stageId?: string
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

export interface GameStage {
  id: string
  title: string
  subtitle: string
  description: string
  theme: StageTheme
  mapSize: number
  objectiveCount: number
  accentColor: string
  skyColor: string
  fogColor: string
  objects: LearningObject[]
}

export interface LearningPack {
  version?: number
  title: string
  stages: GameStage[]
  objects: LearningObject[]
}

export interface GameSession {
  id: string
  startedAt: number
  updatedAt: number
  completedAt?: number
  score: number
  bestCombo: number
  currentStageIndex: number
  collectedIds: string[]
  collectedLabels: string[]
  durationSeconds: number
  status: 'playing' | 'completed'
}
