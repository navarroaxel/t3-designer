import type { WebGLRenderer } from 'three'

const two = (value: number) => String(value).padStart(2, '0')

/** `tapalque-walkthrough-20261006-153045.png`: the local date and time of the shot, sortable. */
export function screenshotName(when: Date): string {
  return `tapalque-walkthrough-${when.getFullYear()}${two(when.getMonth() + 1)}${two(when.getDate())}-${two(when.getHours())}${two(when.getMinutes())}${two(when.getSeconds())}.png`
}

/**
 * Saves what the canvas shows as a PNG. The canvas keeps its drawing buffer, so what the last frame drew, the post-processing composer's pass included, is what is read.
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
