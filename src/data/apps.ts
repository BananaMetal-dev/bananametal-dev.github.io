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
    status: "coming_soon",
    description:
      "自分の音楽と画像を端末内で扱い、簡易ビジュアライザー動画を作成するためのブラウザアプリです。",
    features: ["音源と画像は端末内で扱う設計", "インストール不要", "PC版Chrome / Edgeを主対象"],
    notes: ["現在準備中です", "出力形式や対応環境は公開時に案内します"],
  },
  {
    name: "Suno Prompt Manager",
    status: "coming_soon",
    description:
      "音楽生成向けのStyle、Lyrics、Excludeを分けて整理し、プリセットとして管理するためのブラウザアプリです。",
    features: ["プロンプトを用途別に整理", "プリセット管理を想定", "JSONバックアップ対応を予定"],
    notes: ["現在準備中です", "実際の保存仕様は公開時に案内します"],
  },
];

export const statusLabelMap: Record<AppStatus, string> = {
  available: "利用可能",
  coming_soon: "準備中",
  private: "非公開",
};
