import { DEFAULT_SONG_SETTINGS, type SongSettings } from '../types'
import { SONG_SETTINGS_STORE, transaction } from './database'

export class SongSettingsRepository {
  async load(songId: string): Promise<SongSettings> {
    const saved = await transaction<SongSettings | undefined>(
      SONG_SETTINGS_STORE,
      'readonly',
      (store) => store.get(songId),
    )
    return { ...DEFAULT_SONG_SETTINGS, ...saved }
  }

  save(songId: string, settings: SongSettings): Promise<IDBValidKey> {
    return transaction<IDBValidKey>(SONG_SETTINGS_STORE, 'readwrite', (store) =>
      store.put(settings, songId),
    )
  }

  delete(songId: string): Promise<undefined> {
    return transaction<undefined>(SONG_SETTINGS_STORE, 'readwrite', (store) => store.delete(songId))
  }
}
