import { useEffect, useRef } from 'react'

export interface GamepadActions {
  onLeft?: () => void
  onRight?: () => void
  onUp?: () => void
  onDown?: () => void
  onAction?: () => void // X (PS) / A (Xbox)
  onCancel?: () => void // Circle / B
  onOptions?: () => void // Triangle / Y
}

export function useGamepad(actions: GamepadActions) {
  const requestRef = useRef<number | undefined>(undefined)
  const previousButtons = useRef<boolean[]>([])
  const previousAxes = useRef<number[]>([])

  const THRESHOLD = 0.5 // stick deadzone

  useEffect(() => {
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads()
      const gp = gamepads[0] // take the first connected gamepad

      if (gp) {
        // Buttons
        // 0: A (Xbox) / Cross (PS5)
        // 1: B / Circle
        // 2: X / Square
        // 3: Y / Triangle
        // 12: D-pad Up
        // 13: D-pad Down
        // 14: D-pad Left
        // 15: D-pad Right

        const buttons = gp.buttons.map((b) => b.pressed)

        // Helper to check button just pressed
        const justPressed = (idx: number) => buttons[idx] && !previousButtons.current[idx]

        if (justPressed(14)) actions.onLeft?.()
        if (justPressed(15)) actions.onRight?.()
        if (justPressed(12)) actions.onUp?.()
        if (justPressed(13)) actions.onDown?.()

        if (justPressed(0)) actions.onAction?.()
        if (justPressed(1)) actions.onCancel?.()
        if (justPressed(3)) actions.onOptions?.()

        // Axes (Left Stick)
        // Axis 0: Left/Right (-1 / 1)
        // Axis 1: Up/Down (-1 / 1)
        const x = gp.axes[0]
        const y = gp.axes[1]

        const prevX = previousAxes.current[0] || 0
        const prevY = previousAxes.current[1] || 0

        if (x < -THRESHOLD && prevX >= -THRESHOLD) actions.onLeft?.()
        if (x > THRESHOLD && prevX <= THRESHOLD) actions.onRight?.()
        if (y < -THRESHOLD && prevY >= -THRESHOLD) actions.onUp?.()
        if (y > THRESHOLD && prevY <= THRESHOLD) actions.onDown?.()

        previousButtons.current = buttons
        previousAxes.current = gp.axes.slice()
      }

      requestRef.current = requestAnimationFrame(pollGamepad)
    }

    requestRef.current = requestAnimationFrame(pollGamepad)
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [actions])
}
