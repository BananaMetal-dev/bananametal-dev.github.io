import type { Song, SongSummary } from '../types'
import { SONG_STORE, transaction } from './database'

export class SongRepository {
  async list(): Promise<SongSummary[]> {
    const songs = await transaction<Song[]>(SONG_STORE, 'readonly', (store) => store.getAll())
    return songs
      .map(({ id, title, artist, createdAt }) => ({ id, title, artist, createdAt }))
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  load(id: string): Promise<Song | undefined> {
    return transaction<Song | undefined>(SONG_STORE, 'readonly', (store) => store.get(id))
  }

  save(song: Song): Promise<IDBValidKey> {
    return transaction<IDBValidKey>(SONG_STORE, 'readwrite', (store) => store.put(song))
  }

  delete(id: string): Promise<undefined> {
    return transaction<undefined>(SONG_STORE, 'readwrite', (store) => store.delete(id))
  }
}
