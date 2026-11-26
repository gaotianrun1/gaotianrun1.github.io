import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import type { Route } from '../route'
import { INTRO, SHOTS } from './shots'

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

// Eases the one camera between the page shots, so changing page reads as
// walking across the set rather than loading a new scene.
export function CameraRig({ route, intro }: { route: Route; intro: boolean }) {
  const { camera, size } = useThree()
  // Starts on the shot the page was opened at; after that only the damping moves it.
  const look = useMemo(() => new Vector3(...(intro ? INTRO : SHOTS[route]).target), [])
  const goalPos = useMemo(() => new Vector3(), [])
  const goalLook = useMemo(() => new Vector3(), [])
  // the lens shift, as `top` in Frame (0.5: centred, no shift)
  const lift = useRef(0.5)

  useFrame((_, dt) => {
    const aspect = size.width / size.height
    const portrait = aspect < 1
    const shot = intro ? INTRO : SHOTS[route]
    const frame = portrait ? shot.phone : shot
    goalLook.set(...frame.target)
    goalPos.set(...frame.position)
    // Visitors who ask for less motion get cuts between shots instead of the walk.
    const cut = reduceMotion
    const k = Math.min(dt, 0.05)
    lift.current = cut ? (frame.top ?? 0.5) : MathUtils.damp(lift.current, frame.top ?? 0.5, 3, k)
    // the shift renders a taller picture and keeps its lower part
    const full = 2 * size.height * (1 - lift.current)
    // Keep `fit` metres across in frame: on a narrow screen, step back along the line of sight.
    if (frame.fit) {
      const halfH = Math.tan(MathUtils.degToRad(frame.fov / 2)) * (size.width / full)
      const need = frame.fit / 2 / halfH
      const dist = goalPos.distanceTo(goalLook)
      if (need > dist) goalPos.sub(goalLook).multiplyScalar(need / dist).add(goalLook)
    }
    const cam = camera as PerspectiveCamera
    if (cut) {
      camera.position.copy(goalPos)
      look.copy(goalLook)
      cam.fov = frame.fov
    } else {
      camera.position.x = MathUtils.damp(camera.position.x, goalPos.x, 3, k)
      camera.position.y = MathUtils.damp(camera.position.y, goalPos.y, 3, k)
      camera.position.z = MathUtils.damp(camera.position.z, goalPos.z, 3, k)
      look.x = MathUtils.damp(look.x, goalLook.x, 3.4, k)
      look.y = MathUtils.damp(look.y, goalLook.y, 3.4, k)
      look.z = MathUtils.damp(look.z, goalLook.z, 3.4, k)
      cam.fov = MathUtils.damp(cam.fov, frame.fov, 3, k)
    }
    cam.aspect = size.width / full
    cam.setViewOffset(size.width, full, 0, full - size.height, size.width, size.height)
    camera.lookAt(look)
  })

  return null
}
