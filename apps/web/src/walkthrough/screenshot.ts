import type { WebGLRenderer } from 'three'

const two = (value: number) => String(value).padStart(2, '0')

/** `tapalque-walkthrough-20261006-153045.png`: the local date and time of the shot, sortable. */
export function screenshotName(when: Date): string {
  return `tapalque-walkthrough-${when.getFullYear()}${two(when.getMonth() + 1)}${two(when.getDate())}-${two(when.getHours())}${two(when.getMinutes())}${two(when.getSeconds())}.png`
}

/**
 * Saves what the camera sees as a PNG. A WebGL canvas that is not asked to keep its buffer comes out blank outside the frame that drew it, so this is called inside a frame,
 * after everything was drawn into it (the post-processing composer included); the blob is taken from that very buffer.
 */
export function saveScreenshot(gl: WebGLRenderer, when = new Date()): Promise<string | null> {
  return new Promise(resolve => {
    gl.domElement.toBlob(blob => {
      if (!blob) { resolve(null); return }
      const url = URL.createObjectURL(blob), link = document.createElement('a'), name = screenshotName(when)
      link.href = url
      link.download = name
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      resolve(name)
    }, 'image/png')
  })
}
