import { describe, expect, it } from 'vitest'
import {
  CAMERA_DRAG_PITCH_SENSITIVITY,
  CAMERA_DRAG_YAW_SENSITIVITY,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  getPinchZoomTarget,
  getWheelZoomTarget,
} from './cameraControl'

describe('camera wheel zoom', () => {
  it('zooms in on wheel-up and out on wheel-down', () => {
    expect(getWheelZoomTarget(1, -120, 0, 800)).toBeLessThan(1)
    expect(getWheelZoomTarget(1, 120, 0, 800)).toBeGreaterThan(1)
  })

  it('normalizes line-based wheels and clamps extreme input', () => {
    expect(getWheelZoomTarget(1, -3, 1, 800)).toBeLessThan(1)
    expect(getWheelZoomTarget(1, -100_000, 0, 800)).toBe(CAMERA_ZOOM_MIN)
    expect(getWheelZoomTarget(1, 100_000, 0, 800)).toBe(CAMERA_ZOOM_MAX)
  })

  it('uses a responsive drag sensitivity for quick camera turns', () => {
    expect(CAMERA_DRAG_YAW_SENSITIVITY).toBeGreaterThanOrEqual(0.009)
    expect(CAMERA_DRAG_PITCH_SENSITIVITY).toBeGreaterThanOrEqual(0.016)
  })

  it('zooms with a two-finger pinch and clamps the distance', () => {
    expect(getPinchZoomTarget(1, 100, 150)).toBeLessThan(1)
    expect(getPinchZoomTarget(1, 150, 100)).toBeGreaterThan(1)
    expect(getPinchZoomTarget(1, 100, 10_000)).toBe(CAMERA_ZOOM_MIN)
    expect(getPinchZoomTarget(1, 100, 1)).toBe(CAMERA_ZOOM_MAX)
    expect(getPinchZoomTarget(1.2, 0, 100)).toBe(1.2)
  })
})
