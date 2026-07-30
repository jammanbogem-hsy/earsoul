import { getRollingTopSpeed } from './rollingMotion'

export interface HorizontalVector {
  x: number
  z: number
}

const DRIVE_ACCELERATION = 24

export function getRapierDriveForce(
  inputX: number,
  inputZ: number,
  mass: number,
  speedMultiplier = 1,
): HorizontalVector {
  const inputLength = Math.hypot(inputX, inputZ)
  if (inputLength <= 0.05) return { x: 0, z: 0 }

  const strength = Math.min(1, inputLength)
  const force =
    Math.max(0.1, mass) *
    DRIVE_ACCELERATION *
    strength *
    Math.max(1, speedMultiplier)

  return {
    x: (inputX / inputLength) * force,
    z: (inputZ / inputLength) * force,
  }
}

export function capRapierHorizontalVelocity(
  velocityX: number,
  velocityZ: number,
  ballRadius: number,
  speedMultiplier = 1,
): HorizontalVector {
  const speed = Math.hypot(velocityX, velocityZ)
  const topSpeed =
    getRollingTopSpeed(ballRadius) * Math.max(1, speedMultiplier)

  if (speed <= topSpeed || speed <= 0.0001) {
    return { x: velocityX, z: velocityZ }
  }

  const scale = topSpeed / speed
  return {
    x: velocityX * scale,
    z: velocityZ * scale,
  }
}
