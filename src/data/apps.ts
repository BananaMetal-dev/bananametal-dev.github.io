import visualizerPreview from "../assets/apps/visualizer-preview.png";
import promptManagerPreview from "../assets/apps/prompt-manager-preview.png";
import bananaKeyChangerPreview from "../assets/apps/banana-key-changer-preview.png";
import wavMp3ConverterPreview from "../assets/apps/wav-mp3-converter-preview.png";
import guideVocalPlayerPreview from "../assets/apps/guide-vocal-player-preview.png";

export type Language = "ja" | "en";
export type AppStatus = "available" | "coming_soon" | "private";

export type LocalizedText = Record<Language, string>;

export type AppEntry = {
  name: LocalizedText;
  status: AppStatus;
  description: LocalizedText;
  features: LocalizedText[];
  notes: LocalizedText[];
  url?: string;
  previewImage?: string;
  previewAspectRatio?: string;
};

export const apps: AppEntry[] = [
  {
    name: {
      ja: "Guide Vocal Player",
      en: "Guide Vocal Player",
    },
    status: "available",
    description: {
      ja: "ON VocalとOFF Vocalを同期再生し、モニター用と配信用のガイド量を個別に調整できるブラウザアプリです。",
      en: "A browser app that synchronizes ON and OFF vocal tracks with independent guide mixes for monitoring and streaming.",
    },
    features: [
      { ja: "ON / OFF Vocalを同一クロックで同期再生", en: "Synchronized ON / OFF vocal playback on one audio clock" },
      { ja: "モニター用と配信用のGuide Mixを個別調整", en: "Independent guide mixes for monitoring and streaming" },
      { ja: "LRC歌詞、音源Offset、曲別設定保存に対応", en: "LRC lyrics, audio offset, and per-song settings" },
    ],
    notes: [
      { ja: "音源と設定は端末内だけで処理・保存されます", en: "Audio and settings are processed and stored only on your device" },
      { ja: "Windows版Chrome / Edgeを推奨", en: "Windows Chrome / Edge recommended" },
    ],
    url: "/apps/guide-vocal-player/",
    previewImage: guideVocalPlayerPreview,
    previewAspectRatio: "3 / 2",
  },
  {
    name: {
      ja: "WAV ⇄ MP3 バッチ変換",
      en: "WAV ⇄ MP3 Batch Converter",
    },
    status: "available",
    description: {
      ja: "WAVとMP3を端末内で相互変換する、複数ファイル・フォルダ対応のブラウザアプリです。",
      en: "A browser-only batch converter for WAV and MP3 files, with folder and subfolder support.",
    },
    features: [
      { ja: "WAVからMP3、MP3からWAVへ相互変換", en: "Converts WAV to MP3 and MP3 to WAV" },
      { ja: "複数ファイルとサブフォルダを一括処理", en: "Batch processing for files and subfolders" },
      { ja: "Workerによる並列変換", en: "Parallel conversion with Web Workers" },
    ],
    notes: [
      { ja: "音声ファイルは端末内だけで処理されます", en: "Audio files are processed only on your device" },
      { ja: "デスクトップ版Chrome / Edgeを推奨", en: "Desktop Chrome / Edge recommended" },
    ],
    url: "/apps/wav-mp3-converter/",
    previewImage: wavMp3ConverterPreview,
    previewAspectRatio: "36 / 25",
  },
  {
    name: {
      ja: "Banana Key Changer",
      en: "Banana Key Changer",
    },
    status: "available",
    description: {
      ja: "端末内の音楽を、テンポを保った指定キーで再生し、WAV保存するブラウザアプリです。",
      en: "A local browser audio player with real-time key shifting and WAV export.",
    },
    features: [
      { ja: ".mp3 / .m4a / .wav とサブフォルダに対応", en: "Supports MP3, M4A, WAV, and subfolders" },
      { ja: "半音単位でキーを変更", en: "Changes key in semitone steps" },
      { ja: "現在曲をWAVで保存", en: "Exports the current track as WAV" },
    ],
    notes: [
      { ja: "音源は端末内だけで処理されます", en: "Audio is processed only on your device" },
      { ja: "Android Chrome / Windows Chrome向け", en: "Designed for Android Chrome and Windows Chrome" },
    ],
    url: "/apps/key-player/",
    previewImage: bananaKeyChangerPreview,
    previewAspectRatio: "4 / 3",
  },
  {
    name: {
      ja: "音楽ビジュアライザー",
      en: "Music Visualizer",
    },
    status: "available",
    description: {
      ja: "自分の音楽と画像を端末内で扱い、簡易ビジュアライザー動画を作成するためのブラウザアプリです。",
      en: "A browser app for handling your own music and images locally to create simple visualizer videos.",
    },
    features: [
      { ja: "音源と画像は端末内で扱う設計", en: "Audio and images stay on your device" },
      { ja: "WebMを書き出し可能", en: "Can export WebM" },
      { ja: "PC版Chrome / Edgeを主対象", en: "Primarily designed for desktop Chrome / Edge" },
    ],
    notes: [
      { ja: "MP4変換は次段階です", en: "MP4 conversion is planned for a later step" },
      { ja: "端末性能に応じて書き出し時間が変わります", en: "Export time depends on device performance" },
    ],
    url: "/apps/visualizer/",
    previewImage: visualizerPreview,
    previewAspectRatio: "4 / 3",
  },
  {
    name: {
      ja: "Prompt Manager",
      en: "Prompt Manager",
    },
    status: "available",
    description: {
      ja: "音楽生成向けのStyle、Lyrics、Excludeを分けて整理し、プリセットとして管理するためのブラウザアプリです。",
      en: "A browser app for organizing Style, Lyrics, and Exclude prompts for music generation and managing them as presets.",
    },
    features: [
      { ja: "プロンプトを用途別に整理", en: "Organize prompts by purpose" },
      { ja: "シート単位で管理", en: "Manage prompts by sheet" },
      { ja: "JSONインポート / エクスポート対応", en: "Supports JSON import / export" },
    ],
    notes: [
      { ja: "入力内容はブラウザ内のlocalStorageへ保存されます", en: "Your inputs are saved in localStorage in this browser" },
      { ja: "PCの広い画面での利用を推奨します", en: "A wide desktop screen is recommended" },
    ],
    url: "/apps/prompt-generator/",
    previewImage: promptManagerPreview,
    previewAspectRatio: "4 / 3",
  },
];

export const statusLabelMap: Record<Language, Record<AppStatus, string>> = {
  ja: {
    available: "利用可能",
    coming_soon: "準備中",
    private: "非公開",
  },
  en: {
    available: "Available",
    coming_soon: "Coming Soon",
    private: "Private",
  },
};
