import { FLOOR_HEIGHT } from './building-site.ts'
import { BALCONY } from './house-plan.ts'

/**
 * The owner's dog, lying on the first-floor balcony in front of the window of the secondary room, with its head toward the lower v, out of the way of the balcony door. A Blender model
 * (scripts/blender/jobs/dog-job.json): 0.42 m wide, 0.42 m tall with the head up and 0.92 m long, so it lies along the balcony, which is only 0.86 m deep. House frame [u, v], absolute heights.
 */
export const DOG = { width: .42, height: .42, length: .92, v: -2.2, model: '/models/house/dog.glb' }
const middleU = -5 - BALCONY.depth / 2
export const DOG_BOX = {
  u: [middleU - DOG.width / 2, middleU + DOG.width / 2] as [number, number],
  v: [DOG.v - DOG.length / 2, DOG.v + DOG.length / 2] as [number, number],
  y: [FLOOR_HEIGHT, FLOOR_HEIGHT + DOG.height] as [number, number],
}
