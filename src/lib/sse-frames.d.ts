export function takeSseFrames(buffer: string, final?: boolean): { frames: string[]; remainder: string }
export function sseFrameData(frame: string): string
export function consumeSseStream(
  stream: ReadableStream<Uint8Array>,
  onData: (data: string) => void,
  signal?: AbortSignal,
): Promise<void>
