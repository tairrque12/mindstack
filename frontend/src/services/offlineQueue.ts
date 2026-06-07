import { captureText } from './api'

interface QueuedCapture {
  id: string
  content: string
  source_type: string
  source_title?: string
  timestamp: number
}

const DB_NAME = 'mindstack-offline'
const STORE = 'captures'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueCapture(item: Omit<QueuedCapture, 'id' | 'timestamp'>) {
  const db = await openDB()
  const entry: QueuedCapture = { ...item, id: crypto.randomUUID(), timestamp: Date.now() }
  db.transaction(STORE, 'readwrite').objectStore(STORE).add(entry)
}

export async function flushQueue(): Promise<number> {
  const db = await openDB()
  const store = db.transaction(STORE, 'readwrite').objectStore(STORE)
  const all: QueuedCapture[] = await new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  let synced = 0
  for (const item of all) {
    try {
      await captureText({ content: item.content, source_type: item.source_type, source_title: item.source_title })
      db.transaction(STORE, 'readwrite').objectStore(STORE).delete(item.id)
      synced++
    } catch {
      // leave in queue, try again later
    }
  }
  return synced
}

export async function queueLength(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(0)
  })
}
