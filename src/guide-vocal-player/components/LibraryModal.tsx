import { Music2, Plus, Trash2 } from 'lucide-react'
import type { SongSummary } from '../types'
import { Modal } from './Controls'

type LibraryModalProps = {
  songs: SongSummary[]
  selectedId?: string
  onClose: () => void
  onSelect: (songId: string) => void
  onDelete: (songId: string) => void
  onAdd: () => void
}

export function LibraryModal({ songs, selectedId, onClose, onSelect, onDelete, onAdd }: LibraryModalProps) {
  return (
    <Modal title="曲ライブラリ" onClose={onClose}>
      <button className="primary-button add-song-button" type="button" onClick={onAdd}><Plus size={19} />曲を追加</button>
      <div className="song-list">
        {songs.length ? songs.map((song) => (
          <div className={`song-row ${selectedId === song.id ? 'selected' : ''}`} key={song.id}>
            <button type="button" className="song-select" onClick={() => onSelect(song.id)}>
              <Music2 size={20} /><span><strong>{song.title}</strong><small>{song.artist}</small></span>
            </button>
            <button className="icon-only danger" type="button" aria-label={`${song.title}を削除`} onClick={() => onDelete(song.id)}><Trash2 size={18} /></button>
          </div>
        )) : <div className="empty-library"><Music2 size={30} /><p>登録された曲はありません</p></div>}
      </div>
    </Modal>
  )
}
