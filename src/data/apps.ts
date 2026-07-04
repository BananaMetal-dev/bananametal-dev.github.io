export type AppStatus = "available" | "coming_soon" | "private";

export type AppEntry = {
  name: string;
  status: AppStatus;
  description: string;
  features: string[];
  notes: string[];
  url?: string;
};

export const apps: AppEntry[] = [
  {
    name: "音楽ビジュアライザー",
    status: "available",
    description:
      "自分の音楽と画像を端末内で扱い、簡易ビジュアライザー動画を作成するためのブラウザアプリです。",
    features: ["音源と画像は端末内で扱う設計", "WebMを書き出し可能", "PC版Chrome / Edgeを主対象"],
    notes: ["MP4変換は次段階です", "端末性能に応じて書き出し時間が変わります"],
    url: "/apps/visualizer/",
  },
  {
    name: "Suno Prompt Manager",
    status: "available",
    description:
      "音楽生成向けのStyle、Lyrics、Excludeを分けて整理し、プリセットとして管理するためのブラウザアプリです。",
    features: ["プロンプトを用途別に整理", "シート単位で管理", "JSONインポート / エクスポート対応"],
    notes: ["入力内容はブラウザ内のlocalStorageへ保存されます", "PCの広い画面での利用を推奨します"],
    url: "/apps/prompt-generator/",
  },
];

export const statusLabelMap: Record<AppStatus, string> = {
  available: "利用可能",
  coming_soon: "準備中",
  private: "非公開",
};
