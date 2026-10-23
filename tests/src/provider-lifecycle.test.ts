import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createYjsProvider, YSweetProvider } from '@y-sweet/react'
import { WebSocketServer } from 'ws'
import { AddressInfo } from 'net'
import * as Y from 'yjs'

/**
 * These tests use a bare `ws` server instead of a y-sweet server, since they
 * only check whether the provider opens new connections after it has been
 * disconnected or destroyed.
 */

const MESSAGE_SYNC_STATUS = 102

// Longer than the provider's first reconnect backoff (500ms).
const RECONNECT_WINDOW_MS = 1_500

// Longer than the provider's heartbeat connection timeout (3s).
const CONNECTION_TIMEOUT_WINDOW_MS = 3_500

type Mode = 'accept' | 'reject'

let wss: WebSocketServer
let connectionCount: number
let mode: Mode
let providers: YSweetProvider[]

beforeEach(async () => {
  connectionCount = 0
  mode = 'accept'
  providers = []
  wss = new WebSocketServer({ port: 0, host: '127.0.0.1' })
  await new Promise<void>((resolve) => wss.once('listening', () => resolve()))

  wss.on('connection', (socket) => {
    connectionCount += 1
    if (mode === 'reject') {
      socket.terminate()
      return
    }
    socket.on('message', (data: Buffer) => {
      // Ack sync-status heartbeats so the provider arms its connection timeout.
      if (data[0] === MESSAGE_SYNC_STATUS) {
        socket.send(data)
      }
    })
  })
})

afterEach(async () => {
  for (const provider of providers) {
    provider.destroy()
  }
  for (const client of wss.clients) {
    client.terminate()
  }
  await new Promise<void>((resolve) => wss.close(() => resolve()))
})

function makeProvider(doc: Y.Doc = new Y.Doc()): YSweetProvider {
  const { port } = wss.address() as AddressInfo
  const docId = 'lifecycle-test'
  const provider = createYjsProvider(
    doc,
    docId,
    async () => ({
      url: `ws://127.0.0.1:${port}/doc/ws`,
      baseUrl: `http://127.0.0.1:${port}`,
      docId,
    }),
    { WebSocketPolyfill: require('ws'), showDebuggerLink: false },
  )
  providers.push(provider)
  return provider
}

async function waitFor(condition: () => boolean, timeoutMillis: number = 2_000) {
  const deadline = Date.now() + timeoutMillis
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for condition.')
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

function sleep(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis))
}

describe('provider lifecycle', () => {
  test.each(['disconnect', 'destroy'] as const)(
    '%s() while connected does not reconnect',
    async (method) => {
      const provider = makeProvider()
      await waitFor(() => provider.status === 'handshaking')
      expect(connectionCount).toBe(1)

      provider[method]()
      await sleep(RECONNECT_WINDOW_MS)

      expect(connectionCount).toBe(1)
      expect(provider.status).toBe('offline')
    },
  )

  test.each(['disconnect', 'destroy'] as const)(
    '%s() during reconnect backoff stops the connect loop',
    async (method) => {
      mode = 'reject'
      const provider = makeProvider()
      await waitFor(() => connectionCount === 1 && provider.status === 'error')

      provider[method]()
      await sleep(RECONNECT_WINDOW_MS)

      expect(connectionCount).toBe(1)
      expect(provider.status).toBe('offline')
    },
  )

  test('local edits after disconnect() do not reconnect', async () => {
    const doc = new Y.Doc()
    const provider = makeProvider(doc)
    await waitFor(() => provider.status === 'handshaking')
    // Give the provider time to receive the sync-status ack, which enables
    // its connection timeout.
    await sleep(100)

    provider.disconnect()
    await sleep(100)
    doc.getText('text').insert(0, 'offline edit')
    await sleep(CONNECTION_TIMEOUT_WINDOW_MS)

    expect(connectionCount).toBe(1)
    expect(provider.status).toBe('offline')
  })

  test('connect() after disconnect() reconnects', async () => {
    const provider = makeProvider()
    await waitFor(() => provider.status === 'handshaking')

    provider.disconnect()
    await sleep(100)
    provider.connect()

    await waitFor(() => connectionCount === 2)
    await waitFor(() => provider.status === 'handshaking')
  })
})
