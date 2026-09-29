import { Path, Shape } from 'three'

/** A Three.js shape from [x, z] site points. Extrude it, then rotateX(-Math.PI / 2),
 * and the points land at (x, height, z). */
export function polygonShape(points: [number, number][], holes: [number, number][][] = []) {
  const shape = new Shape()
  points.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z))
  shape.closePath()
  shape.holes = holes.map(ring => {
    const path = new Path()
    ring.forEach(([x, z], i) => i ? path.lineTo(x, -z) : path.moveTo(x, -z))
    path.closePath()
    return path
  })
  return shape
}
