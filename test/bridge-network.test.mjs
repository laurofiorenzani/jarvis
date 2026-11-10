// Starts the real bridge and checks who can reach it.
//
//   node --test test/
//
// Nothing here talks to Claude: the agent session only starts once a browser
// opens the socket, and these tests never get that far.

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { connect } from 'node:net'
import { homedir, networkInterfaces, tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const SERVER = fileURLToPath(new URL('../bridge/server.mjs', import.meta.url))

/** Start a bridge on a free port; resolves once it says where it is listening. */
function startBridge(env = {}) {
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, JARVIS_BRIDGE_PORT: '0', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  let timer
  const ready = new Promise((resolve, reject) => {
    const onData = (d) => {
      log += d
      const m = /bridge listening on ws:\/\/(\S+):(\d+)/.exec(log)
      if (m) {
        clearTimeout(timer)
        resolve({ child, port: Number(m[2]), host: m[1], log: () => log })
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', (d) => (log += d))
    child.on('exit', (code) => reject(new Error(`bridge exited ${code}: ${log}`)))
    timer = setTimeout(() => {
      // Nothing else holds a reference to a bridge that never reported in.
      child.kill()
      reject(new Error(`bridge did not start: ${log}`))
    }, 15_000)
    child.once('exit', () => clearTimeout(timer))
  })
  return ready
}

function get(port, path, headers = {}, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const req = request({ host, port, path, headers, timeout: 3000 }, (res) => {
      res.resume()
      resolve(res.statusCode)
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.end()
  })
}

/** Resolves 'connected' or the error code; never rejects. */
function tryConnect(host, port) {
  return new Promise((resolve) => {
    const s = connect({ host, port, timeout: 2000 })
    s.once('connect', () => {
      s.destroy()
      resolve('connected')
    })
    s.once('timeout', () => {
      s.destroy()
      resolve('timeout')
    })
    s.once('error', (e) => resolve(e.code))
  })
}

/** Raw WebSocket handshake; resolves the HTTP status line's code. */
function wsHandshake(port, headers) {
  return new Promise((resolve) => {
    const s = connect({ host: '127.0.0.1', port, timeout: 3000 })
    // A bridge that accepts and then says nothing must fail the test, not hang it.
    s.once('timeout', () => {
      s.destroy()
      resolve('timeout')
    })
    s.once('connect', () => {
      const lines = [
        'GET / HTTP/1.1',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Version: 13',
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
        ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
      ]
      s.write(lines.join('\r\n') + '\r\n\r\n')
    })
    s.once('data', (d) => {
      s.destroy()
      resolve(Number(/^HTTP\/1\.1 (\d+)/.exec(d.toString())?.[1]))
    })
    s.once('error', () => resolve(null))
  })
}

let bridge
before(async () => {
  bridge = await startBridge()
})
after(() => bridge?.child.kill())

test('listens on loopback by default', async () => {
  assert.equal(await get(bridge.port, '/health', { host: `127.0.0.1:${bridge.port}` }), 200)
  assert.match(bridge.log(), /listening on ws:\/\/127\.0\.0\.1:/)
})

test('is not reachable on any non-loopback interface', async () => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && !i.internal && i.family === 'IPv4')
    .map((i) => i.address)
  if (!lan.length) return // nothing to probe on this machine
  for (const address of lan) {
    assert.notEqual(
      await tryConnect(address, bridge.port),
      'connected',
      `bridge accepted a connection on ${address}`,
    )
  }
})

test('a blank JARVIS_BRIDGE_HOST still means loopback', async () => {
  for (const blank of ['', '   ']) {
    const b = await startBridge({ JARVIS_BRIDGE_HOST: blank })
    try {
      assert.equal(b.host, '127.0.0.1', `JARVIS_BRIDGE_HOST=${JSON.stringify(blank)}`)
    } finally {
      b.child.kill()
    }
  }
})

test('refuses HTTP requests addressed to a foreign Host (DNS rebinding)', async () => {
  assert.equal(await get(bridge.port, '/health', { host: `attacker.example:${bridge.port}` }), 403)
  assert.equal(await get(bridge.port, '/file?path=/tmp/x.png', { host: 'attacker.example' }), 403)
  assert.equal(await get(bridge.port, '/health', { host: `localhost:${bridge.port}` }), 200)
  assert.equal(await get(bridge.port, '/health', { host: `[::1]:${bridge.port}` }), 200)
})

test('paid speech proxy rejects requests without a browser Origin', async () => {
  for (const route of ['/tts', '/stt']) {
    const status = await new Promise((resolve, reject) => {
      const req = request({
        host: '127.0.0.1',
        port: bridge.port,
        path: route,
        method: 'POST',
        headers: { host: `127.0.0.1:${bridge.port}`, 'content-type': 'application/json' },
        timeout: 3000,
      }, (res) => {
        res.resume()
        resolve(res.statusCode)
      })
      req.on('error', reject)
      req.on('timeout', () => req.destroy(new Error('timeout')))
      req.end('{}')
    })
    assert.equal(status, 403, `${route} must require an allowed Origin`)
  }
})

test('paid speech proxy enforces per-minute request quotas', async () => {
  const post = (route) => new Promise((resolve, reject) => {
    const req = request({
      host: '127.0.0.1',
      port: bridge.port,
      path: route,
      method: 'POST',
      headers: {
        host: `127.0.0.1:${bridge.port}`,
        origin: 'http://localhost:5173',
        'content-type': 'application/json',
      },
      timeout: 3000,
    }, (res) => {
      res.resume()
      resolve(res.statusCode)
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.end('{}')
  })

  for (let i = 0; i < 30; i++) await post('/tts')
  assert.equal(await post('/tts'), 429, '31st TTS request in a minute is limited')

  for (let i = 0; i < 12; i++) await post('/stt')
  assert.equal(await post('/stt'), 429, '13th STT request in a minute is limited')
})

test('local media endpoint only serves images from configured roots', async () => {
  const outside = mkdtempSync(join(homedir(), '.jarvis-media-test-'))
  const allowed = mkdtempSync(join(tmpdir(), 'jarvis-media-allowed-'))
  const privateImage = join(outside, 'private.png')
  const allowedImage = join(allowed, 'allowed.png')
  let scopedBridge
  try {
    writeFileSync(privateImage, 'private')
    writeFileSync(allowedImage, 'temporary')
    // A temp directory is allowed only because this test explicitly configures
    // it as a media root. The endpoint must not grant blanket tmp/home access.
    scopedBridge = await startBridge({ JARVIS_FILE_ROOTS: allowed })
    const host = { host: `127.0.0.1:${scopedBridge.port}` }
    assert.equal(
      await get(scopedBridge.port, `/file?path=${encodeURIComponent(privateImage)}`, host),
      400,
    )
    assert.equal(
      await get(scopedBridge.port, `/file?path=${encodeURIComponent(allowedImage)}`, host),
      200,
    )
  } finally {
    scopedBridge?.child.kill()
    rmSync(outside, { recursive: true, force: true })
    rmSync(allowed, { recursive: true, force: true })
  }
})

test('refuses a WebSocket addressed to a foreign Host even with a local Origin', async () => {
  const origin = 'http://localhost:5173'
  assert.equal(await wsHandshake(bridge.port, { Host: 'attacker.example', Origin: origin }), 403)
})

test('refuses a WebSocket with a forged-looking foreign Origin', async () => {
  assert.equal(
    await wsHandshake(bridge.port, { Host: `127.0.0.1:${bridge.port}`, Origin: 'https://attacker.example' }),
    403,
  )
})

test('an occupied port is reported plainly and exits non-zero', async () => {
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, JARVIS_BRIDGE_PORT: String(bridge.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', (d) => (log += d))
  child.stderr.on('data', (d) => (log += d))
  const code = await new Promise((resolve) => child.on('exit', resolve))
  assert.equal(code, 1)
  assert.match(log, /already in use/)
})
