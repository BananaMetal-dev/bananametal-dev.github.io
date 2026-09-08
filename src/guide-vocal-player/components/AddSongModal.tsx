import { useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { ArrowLeftRight, FileAudio, FileText, UploadCloud } from 'lucide-react'
import { arrangeDroppedFiles, isAudioFile, isLyricsFile, metadataFromFilename } from '../songFiles'
import type { Song } from '../types'
import { Modal } from './Controls'

type AddSongModalProps = {
  initialFiles?: File[]
  onClose: () => void
  onSave: (song: Song) => Promise<void>
}

type FileDropFieldProps = {
  accept: string
  file?: File
  icon: ReactNode
  label: string
  note: string
  onFile: (file: File) => void
  validate: (file: File) => boolean
}

function FileDropField({ accept, file, icon, label, note, onFile, validate }: FileDropFieldProps) {
  const [dragging, setDragging] = useState(false)

  const receiveDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    const droppedFile = Array.from(event.dataTransfer.files).find(validate)
    if (droppedFile) onFile(droppedFile)
  }

  return (
    <label
      className={`file-drop-field ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); event.stopPropagation(); setDragging(true) }}
      onDragOver={(event) => { event.preventDefault(); event.stopPropagation() }}
      onDragLeave={(event) => { event.stopPropagation(); setDragging(false) }}
      onDrop={receiveDrop}
    >
      <span className="file-drop-label">{label}<small>{note}</small></span>
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0]
          if (selectedFile) onFile(selectedFile)
        }}
      />
      <span className="file-drop-content">
        {icon}
        <span><strong>{file?.name ?? 'クリックまたはドロップ'}</strong><small>{file ? '別のファイルで置き換えられます' : 'ファイルを選択できます'}</small></span>
      </span>
    </label>
  )
}

export function AddSongModal({ initialFiles = [], onClose, onSave }: AddSongModalProps) {
  const initial = arrangeDroppedFiles(initialFiles)
  const initialMetadata = metadataFromFilename(initial.onVocalFile?.name ?? initial.offVocalFile?.name ?? '')
  const [title, setTitle] = useState(initialMetadata.title)
  const [artist, setArtist] = useState(initialMetadata.artist)
  const [onVocalFile, setOnVocalFile] = useState<File | undefined>(initial.onVocalFile)
  const [offVocalFile, setOffVocalFile] = useState<File | undefined>(initial.offVocalFile)
  const [lyricsFile, setLyricsFile] = useState<File | undefined>(initial.lyricsFile)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fillMetadata = (file: File) => {
    const metadata = metadataFromFilename(file.name)
    setTitle((current) => current || metadata.title)
    setArtist((current) => current || metadata.artist)
  }

  const receiveMultipleFiles = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const arranged = arrangeDroppedFiles(Array.from(event.dataTransfer.files))
    if (arranged.onVocalFile) {
      setOnVocalFile(arranged.onVocalFile)
      fillMetadata(arranged.onVocalFile)
    }
    if (arranged.offVocalFile) {
      setOffVocalFile(arranged.offVocalFile)
      fillMetadata(arranged.offVocalFile)
    }
    if (arranged.lyricsFile) setLyricsFile(arranged.lyricsFile)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!onVocalFile?.size) return setError('ON Vocalファイルが設定されていません。')
    if (!offVocalFile?.size) return setError('OFF Vocalファイルが設定されていません。')

    setSaving(true)
    try {
      await onSave({
        id: crypto.randomUUID(),
        title: title.trim() || metadataFromFilename(onVocalFile.name).title,
        artist: artist.trim() || 'Unknown Artist',
        onVocalFile,
        offVocalFile,
        lyricsFile,
        createdAt: Date.now(),
      })
      onClose()
    } catch {
      setError('曲を保存できませんでした。ブラウザの保存容量を確認してください。')
      setSaving(false)
    }
  }

  return (
    <Modal title="曲を追加" onClose={onClose}>
      <form className="song-form" onSubmit={submit} onDragOver={(event) => { event.preventDefault(); event.stopPropagation() }} onDrop={receiveMultipleFiles}>
        <div className="metadata-fields">
          <label>タイトル<input name="title" value={title} autoFocus onChange={(event) => setTitle(event.target.value)} /></label>
          <button
            type="button"
            className="swap-metadata-button"
            aria-label="タイトルとアーティストを入れ替える"
            title="タイトルとアーティストを入れ替える"
            onClick={() => { setTitle(artist); setArtist(title) }}
          ><ArrowLeftRight size={19} /><span>入れ替え</span></button>
          <label>アーティスト<input name="artist" value={artist} onChange={(event) => setArtist(event.target.value)} /></label>
        </div>

        <div className="multi-drop-hint"><UploadCloud size={19} /><span>複数ファイルをまとめて、この画面へドロップできます</span></div>
        <FileDropField
          label="ON Vocal"
          note="必須"
          accept="audio/wav,audio/mpeg,audio/flac,audio/mp4,audio/aac,audio/ogg,.wav,.mp3,.flac,.m4a,.aac,.ogg"
          file={onVocalFile}
          icon={<FileAudio size={23} />}
          validate={isAudioFile}
          onFile={(file) => { setOnVocalFile(file); fillMetadata(file); setError('') }}
        />
        <FileDropField
          label="OFF Vocal"
          note="必須"
          accept="audio/wav,audio/mpeg,audio/flac,audio/mp4,audio/aac,audio/ogg,.wav,.mp3,.flac,.m4a,.aac,.ogg"
          file={offVocalFile}
          icon={<FileAudio size={23} />}
          validate={isAudioFile}
          onFile={(file) => { setOffVocalFile(file); fillMetadata(file); setError('') }}
        />
        <FileDropField
          label="LRC"
          note="任意"
          accept=".lrc,text/plain"
          file={lyricsFile}
          icon={<FileText size={23} />}
          validate={isLyricsFile}
          onFile={(file) => { setLyricsFile(file); setError('') }}
        />
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={saving}>{saving ? '保存中…' : '登録'}</button>
      </form>
    </Modal>
  )
}
