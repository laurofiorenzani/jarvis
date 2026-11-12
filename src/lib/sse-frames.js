/** SSE frame splitting shared by the cloud client and Node tests. */
export function takeSseFrames(buffer, final = false) {
  const frames = []
  let remainder = buffer
  const separator = /\r?\n\r?\n/
  while (true) {
    const match = separator.exec(remainder)
    if (!match) break
    frames.push(remainder.slice(0, match.index))
    remainder = remainder.slice(match.index + match[0].length)
  }
  if (final && remainder.trim()) {
    frames.push(remainder)
    remainder = ''
  }
  return { frames, remainder }
}

export function sseFrameData(frame) {
  return frame.split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n')
}
