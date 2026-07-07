import visualizerPreview from "../assets/apps/visualizer-preview.png";
import promptManagerPreview from "../assets/apps/prompt-manager-preview.png";

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
    previewAspectRatio: "1074 / 819",
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
    previewAspectRatio: "1065 / 786",
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
