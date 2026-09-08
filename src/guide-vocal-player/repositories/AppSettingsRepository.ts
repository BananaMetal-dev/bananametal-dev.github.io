import { DEFAULT_APP_SETTINGS, type AppSettings } from '../types'
import { APP_SETTINGS_STORE, transaction } from './database'

const SETTINGS_KEY = 'global'

export class AppSettingsRepository {
  async load(): Promise<AppSettings> {
    const saved = await transaction<AppSettings | undefined>(
      APP_SETTINGS_STORE,
      'readonly',
      (store) => store.get(SETTINGS_KEY),
    )
    return { ...DEFAULT_APP_SETTINGS, ...saved }
  }

  save(settings: AppSettings): Promise<IDBValidKey> {
    return transaction<IDBValidKey>(APP_SETTINGS_STORE, 'readwrite', (store) =>
      store.put(settings, SETTINGS_KEY),
    )
  }
}
