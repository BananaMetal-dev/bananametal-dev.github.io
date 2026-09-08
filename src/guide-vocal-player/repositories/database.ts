const DB_NAME = 'guide-vocal-player'
const DB_VERSION = 1

export const SONG_STORE = 'songs'
export const SONG_SETTINGS_STORE = 'songSettings'
export const APP_SETTINGS_STORE = 'appSettings'

let databasePromise: Promise<IDBDatabase> | undefined

export function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(SONG_STORE)) {
        database.createObjectStore(SONG_STORE, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(SONG_SETTINGS_STORE)) {
        database.createObjectStore(SONG_SETTINGS_STORE)
      }
      if (!database.objectStoreNames.contains(APP_SETTINGS_STORE)) {
        database.createObjectStore(APP_SETTINGS_STORE)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return databasePromise
}

export async function transaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, mode)
    const request = operation(tx.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.onerror = () => reject(tx.error)
  })
}
