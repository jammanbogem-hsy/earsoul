import { doc, getDoc } from 'firebase/firestore'
import { firebaseDb } from '../lib/firebase'
import type { LearningPack } from '../types'
import { fallbackLearningPack } from './learningPack'

function isLearningPack(value: unknown): value is LearningPack {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LearningPack>

  return (
    typeof candidate.title === 'string' &&
    Array.isArray(candidate.objects) &&
    Array.isArray(candidate.quizzes)
  )
}

export async function loadLearningPack(): Promise<LearningPack> {
  if (!firebaseDb) return fallbackLearningPack

  try {
    const snapshot = await getDoc(doc(firebaseDb, 'learningPacks', 'default'))
    const remotePack = snapshot.data()
    return isLearningPack(remotePack) ? remotePack : fallbackLearningPack
  } catch {
    return fallbackLearningPack
  }
}
