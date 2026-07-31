import { StrictMode, Suspense, lazy, useEffect, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { apps, statusLabelMap, type AppEntry, type Language, type LocalizedText } from "./data/apps";
import { googleFormUrl } from "./config/site";

const KeyPlayerPage = lazy(() =>
  import("./key-player/KeyPlayerPage").then((module) => ({ default: module.KeyPlayerPage })),
);

type PageKey = "home" | "apps" | "music" | "contact" | "privacy" | "not-found";
type SongEntry = {
  id: string;
  siteVisible: boolean;
  featured: boolean;
  title: string;
  artist: string;
  youtubeId: string;
  coverImage: string;
  description: string;
  releaseDate: string;
  tags: string[];
  sortOrder: number;
};
type SongsCatalog = {
  updatedAt?: string;
  songs: SongEntry[];
};
type MusicState =
  | { status: "loading" }
  | { status: "loaded"; catalog: SongsCatalog }
  | { status: "error"; message: string };
type ContactState = {
  isConfigured: boolean;
  isValidUrl: boolean;
};
type PageMeta = Record<Language, { title: string; description: string }>;

const LANGUAGE_STORAGE_KEY = "bananaMetal.ui.language";
const DEFAULT_LANGUAGE: Language = "ja";
const youtubeIdPattern = /^[A-Za-z0-9_-]{6,}$/;
const visibleApps = apps.filter((app) => app.status !== "private");

const localized = {
  nav: {
    home: { ja: "Home", en: "Home" },
    apps: { ja: "Apps", en: "Apps" },
    music: { ja: "Music", en: "Music" },
    contact: { ja: "Contact", en: "Contact" },
    privacy: { ja: "Privacy", en: "Privacy" },
  },
  language: {
    label: { ja: "Language", en: "Language" },
    ja: { ja: "日本語", en: "日本語" },
    en: { ja: "English", en: "English" },
  },
  meta: {
    home: {
      ja: { title: "Banana Metal | Apps, Music and Creative Tools", description: "Banana Metal の公開アプリ、楽曲、問い合わせ導線をまとめる静的サイトです。" },
      en: { title: "Banana Metal | Apps, Music and Creative Tools", description: "A static site that organizes Banana Metal apps, music, and contact routes." },
    },
    apps: {
      ja: { title: "Apps | Banana Metal", description: "Banana Metal が公開予定のブラウザアプリを一覧で確認できます。" },
      en: { title: "Apps | Banana Metal", description: "Browse Banana Metal browser apps and their current availability." },
    },
    music: {
      ja: { title: "Music | Banana Metal", description: "Banana Metal の公開用楽曲データと YouTube への外部リンクを掲載しています。" },
      en: { title: "Music | Banana Metal", description: "Published song data and YouTube links from Banana Metal." },
    },
    contact: {
      ja: { title: "Contact | Banana Metal", description: "アプリの不具合、機能要望、楽曲、仕事や連携についての問い合わせ案内です。" },
      en: { title: "Contact | Banana Metal", description: "Contact guidance for app bugs, feature requests, music, work, and collaboration." },
    },
    privacy: {
      ja: { title: "Privacy | Banana Metal", description: "問い合わせ内容、公開アプリ、外部サービスの扱いについての案内です。" },
      en: { title: "Privacy | Banana Metal", description: "Notes on inquiries, published apps, and external services." },
    },
    "not-found": {
      ja: { title: "ページが見つかりません | Banana Metal", description: "指定されたページは見つかりませんでした。主要ページへの導線を表示します。" },
      en: { title: "Page Not Found | Banana Metal", description: "The requested page could not be found. Links to the main pages are shown." },
    },
  },
  pageContent: {
    home: {
      title: { ja: "Banana Metal Apps & Music", en: "Banana Metal Apps & Music" },
      lead: { ja: "作成したブラウザアプリと楽曲を、公開サイトとして整理していく場所です。", en: "A place to organize published browser apps and music tracks." },
      body: { ja: "Apps、Music、Contact、Privacy を切り替えながら公開導線を確認できます。", en: "You can move between Apps, Music, Contact, and Privacy from here." },
    },
    apps: {
      title: { ja: "Apps", en: "Apps" },
      lead: { ja: "公開予定のブラウザアプリを一覧で確認できるページです。", en: "A page for browsing published and planned browser apps." },
      body: { ja: "各アプリの状態、説明、特徴、利用上の注意をまとめて表示します。", en: "Each card shows status, description, key features, and usage notes." },
    },
    music: {
      title: { ja: "Music", en: "Music" },
      lead: { ja: "公開用の楽曲データを読み込み、YouTubeへの外部リンクとして表示します。", en: "Loads published song data and presents it with YouTube links." },
      body: { ja: "初期版では public/data/songs.json を手動編集して楽曲一覧を管理します。", en: "In the initial version, songs are managed by editing public/data/songs.json manually." },
    },
    contact: {
      title: { ja: "Contact", en: "Contact" },
      lead: { ja: "不具合報告、機能要望、楽曲や連携相談の窓口です。", en: "A contact route for bug reports, requests, music, and collaboration." },
      body: { ja: "Googleフォームを使う想定ですが、設定されるまでは準備中表示になります。", en: "A Google Form will be used once configured; until then the page stays in a coming-soon state." },
    },
    privacy: {
      title: { ja: "Privacy", en: "Privacy" },
      lead: { ja: "問い合わせ内容や外部サービスへのリンクに関する説明を置くページです。", en: "A page for notes about inquiries and links to external services." },
      body: { ja: "読みやすい短い節で、公開前に必要な方針をまとめています。", en: "Short readable sections summarize the policies needed for publishing." },
    },
    "not-found": {
      title: { ja: "ページが見つかりません", en: "Page Not Found" },
      lead: { ja: "指定されたページは、この構成にはありません。", en: "The requested page is not part of this site structure." },
      body: { ja: "トップページ、Apps、Music、Contact のいずれかへ移動してください。", en: "Please move to Home, Apps, Music, or Contact." },
    },
  },
  home: {
    primary: { ja: "Appsを見る", en: "View Apps" },
    secondaryMusic: { ja: "Musicを見る", en: "View Music" },
    secondaryPrivacy: { ja: "Privacyを見る", en: "View Privacy" },
    panelLabel: { ja: "ホームの状態", en: "Home status" },
    phaseTitle: { ja: "Published Site", en: "Published Site" },
    phaseLead: { ja: "サイトの土台、アプリ、楽曲、問い合わせ導線を公開中", en: "Site structure, apps, music, and contact routes are now published" },
    items: [
      { ja: "静的ページ導線", en: "Static page routes" },
      { ja: "共通ヘッダーとフッター", en: "Shared header and footer" },
      { ja: "外部連携は最小構成", en: "External integrations kept minimal" },
    ],
  },
  appsPage: {
    panelTitle: { ja: "Apps", en: "Apps" },
    panelBody: { ja: "公開状態とリンクの有無で表示を切り替えます。", en: "Cards switch their state based on availability and link presence." },
    rules: [
      { ja: "private は表示しない", en: "Private apps are hidden" },
      { ja: "coming_soon は準備中表示", en: "Coming soon apps show a waiting state" },
      { ja: "available は URL ありのみ遷移", en: "Available apps only link when a URL exists" },
    ],
    listLabel: { ja: "アプリ一覧", en: "App list" },
    previewTitle: { ja: "Preview", en: "Preview" },
    previewSubtitle: { ja: "スクリーンショット準備中", en: "Screenshot coming soon" },
    features: { ja: "主な特徴", en: "Key Features" },
    notes: { ja: "利用上の注意", en: "Usage Notes" },
    actionArea: { ja: "操作領域", en: "Actions" },
    openApp: { ja: "アプリを開く", en: "Open App" },
    linkMissing: { ja: "リンク未設定", en: "Link Not Set" },
    comingSoon: { ja: "準備中", en: "Coming Soon" },
  },
  contact: {
    panelLabel: { ja: "問い合わせ案内", en: "Contact guide" },
    panelTitle: { ja: "Contact", en: "Contact" },
    panelBody: { ja: "以下の内容を受け付ける想定です。", en: "The following topics are expected to be handled here." },
    topics: [
      { ja: "アプリの不具合", en: "App bugs" },
      { ja: "機能要望", en: "Feature requests" },
      { ja: "楽曲について", en: "About music" },
      { ja: "仕事・連携の相談", en: "Work or collaboration" },
      { ja: "その他", en: "Other" },
    ],
    replyNote: { ja: "返信には時間がかかる場合があります。", en: "Replies may take some time." },
    sectionLabel: { ja: "お問い合わせ操作", en: "Contact actions" },
    formTitle: { ja: "お問い合わせフォーム", en: "Contact Form" },
    formReady: { ja: "フォームを開いて送信できます。", en: "The form is ready to open and submit." },
    formPending: { ja: "お問い合わせフォームは準備中です。", en: "The contact form is not ready yet." },
    openForm: { ja: "お問い合わせフォームを開く", en: "Open Contact Form" },
    formPendingButton: { ja: "お問い合わせフォームは準備中です", en: "Contact Form Coming Soon" },
  },
  privacy: {
    panelLabel: { ja: "プライバシーの要点", en: "Privacy highlights" },
    panelTitle: { ja: "Privacy", en: "Privacy" },
    panelBody: { ja: "公開前に押さえる要点だけをまとめています。", en: "Only the key points needed for publishing are summarized here." },
    panelItems: [
      { ja: "問い合わせは対応のために利用", en: "Inquiries are used for replies and handling" },
      { ja: "個別仕様は各アプリの説明に従う", en: "App-specific behavior follows each app description" },
      { ja: "外部サービス先の規約が適用", en: "External services apply their own policies" },
    ],
    sectionLabel: { ja: "プライバシー本文", en: "Privacy details" },
    sections: [
      {
        title: { ja: "お問い合わせ内容について", en: "About inquiries" },
        paragraphs: [
          { ja: "お問い合わせ内容は、返信や対応のために利用します。", en: "Inquiry content is used for replies and support." },
          { ja: "お問い合わせはGoogleフォームおよびGoogleスプレッドシートで管理される予定です。", en: "Inquiries are expected to be managed with Google Forms and Google Sheets." },
        ],
      },
      {
        title: { ja: "公開アプリについて", en: "About published apps" },
        paragraphs: [
          { ja: "各アプリのデータ処理や保存方式は、アプリごとの説明に従います。", en: "Each app's data handling and storage follow its own description." },
          { ja: "ブラウザ内処理を採用するアプリでは、音源・画像・生成動画を当サイトへアップロードしない設計を目指します。", en: "For browser-local apps, the intended design is not to upload audio, images, or generated videos to this site." },
          { ja: "将来の機能追加により、アプリごとの仕様が変わる可能性があります。", en: "Future feature additions may change app-specific behavior." },
        ],
      },
      {
        title: { ja: "外部サービスについて", en: "About external services" },
        paragraphs: [
          { ja: "YouTubeやGoogleフォームなどの外部サービスへのリンク先では、各サービス側の規約やプライバシーポリシーが適用されます。", en: "Links to external services such as YouTube and Google Forms are governed by each service's own terms and privacy policy." },
          { ja: "当サイトから外部サービスへ移動した後の扱いは、各サービス側の方針に従います。", en: "Once you move from this site to an external service, that service's policy applies." },
        ],
      },
      {
        title: { ja: "注意事項", en: "Notes" },
        paragraphs: [
          { ja: "当サイトは外部通信を一切行わないと断定しません。将来の公開プリセット、外部リンク、フォーム運用などを考慮し、過度に断定的な表現を避けます。", en: "This site does not claim to never perform any external communication. Wording stays non-absolute in view of future presets, external links, and form operations." },
          { ja: "個人情報、認証情報、問い合わせ回答データは公開リポジトリへ入れない方針です。", en: "Personal data, credentials, and inquiry response data are not intended to be placed in the public repository." },
        ],
      },
    ],
  },
  music: {
    panelLabel: { ja: "Musicページの更新情報", en: "Music page details" },
    panelTitle: { ja: "Music", en: "Music" },
    rules: [
      { ja: "siteVisible の曲だけ表示", en: "Only songs with siteVisible are shown" },
      { ja: "sortOrder 昇順", en: "Sorted by sortOrder ascending" },
      { ja: "YouTube は外部リンクで開く", en: "YouTube opens as an external link" },
    ],
    updatedMissing: { ja: "最終更新：情報なし", en: "Last updated: not available" },
    updatedPrefix: { ja: "最終更新：", en: "Last updated: " },
    loadingTitle: { ja: "読み込み中", en: "Loading" },
    loadingBody: { ja: "楽曲一覧を読み込んでいます。", en: "Loading the song list." },
    errorTitle: { ja: "読み込みエラー", en: "Load error" },
    errorRetry: { ja: "時間を置いて再読み込みしてください。", en: "Please try reloading after a while." },
    fetchError: { ja: "songs.json の取得に失敗しました。", en: "Failed to fetch songs.json." },
    invalidError: { ja: "songs.json の形式が正しくありません。", en: "songs.json has an invalid format." },
    genericError: { ja: "楽曲一覧を読み込めませんでした。", en: "Could not load the song list." },
    featured: { ja: "注目曲", en: "Featured" },
    songList: { ja: "楽曲一覧", en: "Song List" },
    empty: { ja: "表示できる楽曲がありません。", en: "No songs are available to display." },
    datePrefix: { ja: "公開日：", en: "Release date: " },
    coverReady: { ja: "画像準備中", en: "Image pending" },
    tagsLabel: { ja: "のタグ", en: " tags" },
    coverAltSuffix: { ja: " のジャケット画像", en: " cover image" },
    youtubeOpen: { ja: "YouTubeで聴く", en: "Listen on YouTube" },
    youtubeMissing: { ja: "YouTubeリンク未設定", en: "YouTube Link Missing" },
  },
  footer: {
    tagline: { ja: "Banana Metal - Apps, Music and Creative Tools", en: "Banana Metal - Apps, Music and Creative Tools" },
    privacy: { ja: "Privacy", en: "Privacy" },
  },
} as const;

const navItems: Array<{ href: string; page: PageKey; label: LocalizedText }> = [
  { href: "/", page: "home", label: localized.nav.home },
  { href: "/apps/", page: "apps", label: localized.nav.apps },
  { href: "/music/", page: "music", label: localized.nav.music },
  { href: "/contact/", page: "contact", label: localized.nav.contact },
  { href: "/privacy/", page: "privacy", label: localized.nav.privacy },
];

function readStoredLanguage(): Language {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return value === "en" ? "en" : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function writeStoredLanguage(language: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage write failures and still update current page language.
  }
}

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function getCurrentPage(): PageKey {
  const path = normalizePath(window.location.pathname);
  switch (path) {
    case "":
    case "/":
      return "home";
    case "/apps":
      return "apps";
    case "/music":
      return "music";
    case "/contact":
      return "contact";
    case "/privacy":
      return "privacy";
    default:
      return "not-found";
  }
}

function t(language: Language, value: LocalizedText) {
  return value[language];
}

function setMetaAttribute(selector: string, attribute: "content", value: string) {
  const tag = document.head.querySelector(selector);
  if (tag) tag.setAttribute(attribute, value);
}

function applyPageMeta(currentPage: PageKey, language: Language) {
  const meta = localized.meta[currentPage][language];
  document.title = meta.title;
  setMetaAttribute('meta[name="description"]', "content", meta.description);
  setMetaAttribute('meta[property="og:title"]', "content", meta.title);
  setMetaAttribute('meta[property="og:description"]', "content", meta.description);
  setMetaAttribute('meta[property="og:type"]', "content", "website");
  setMetaAttribute('meta[property="og:site_name"]', "content", "Banana Metal");
}

function applyDocumentLanguage(language: Language) {
  document.documentElement.lang = language;
  document.documentElement.dataset.lang = language;
  document.body?.setAttribute("data-lang", language);
}

function isSongEntry(value: unknown): value is SongEntry {
  if (!value || typeof value !== "object") return false;
  const song = value as Partial<SongEntry>;
  return (
    typeof song.id === "string" &&
    typeof song.siteVisible === "boolean" &&
    typeof song.featured === "boolean" &&
    typeof song.title === "string" &&
    typeof song.artist === "string" &&
    typeof song.youtubeId === "string" &&
    typeof song.coverImage === "string" &&
    typeof song.description === "string" &&
    typeof song.releaseDate === "string" &&
    Array.isArray(song.tags) &&
    song.tags.every((tag) => typeof tag === "string") &&
    typeof song.sortOrder === "number"
  );
}

function isSongsCatalog(value: unknown): value is SongsCatalog {
  if (!value || typeof value !== "object") return false;
  const catalog = value as Partial<SongsCatalog>;
  return (
    (typeof catalog.updatedAt === "string" || typeof catalog.updatedAt === "undefined") &&
    Array.isArray(catalog.songs) &&
    catalog.songs.every(isSongEntry)
  );
}

function formatUpdatedAt(updatedAt: string | undefined, language: Language) {
  if (!updatedAt) return t(language, localized.music.updatedMissing);
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return t(language, localized.music.updatedMissing);
  const locale = language === "ja" ? "ja-JP" : "en-US";
  return `${t(language, localized.music.updatedPrefix)}${new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date)}`;
}

function isValidYoutubeId(youtubeId: string) {
  return youtubeIdPattern.test(youtubeId.trim());
}

function buildYoutubeUrl(youtubeId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId.trim())}`;
}

function getContactState(): ContactState {
  const trimmedUrl = googleFormUrl.trim();
  if (!trimmedUrl) return { isConfigured: false, isValidUrl: false };
  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return { isConfigured: false, isValidUrl: false };
    }
    return { isConfigured: true, isValidUrl: true };
  } catch {
    return { isConfigured: false, isValidUrl: false };
  }
}

function LanguageToggle({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return (
    <div className="language-toggle" aria-label={t(language, localized.language.label)}>
      <button
        className={`language-toggle-button ${language === "ja" ? "is-active" : ""}`}
        type="button"
        onClick={() => onChange("ja")}
        aria-pressed={language === "ja"}
      >
        {t(language, localized.language.ja)}
      </button>
      <button
        className={`language-toggle-button ${language === "en" ? "is-active" : ""}`}
        type="button"
        onClick={() => onChange("en")}
        aria-pressed={language === "en"}
      >
        {t(language, localized.language.en)}
      </button>
    </div>
  );
}

function getStatusTone(status: AppEntry["status"]) {
  if (status === "available") return "status-pill is-available";
  if (status === "coming_soon") return "status-pill is-coming-soon";
  return "status-pill is-private";
}

function getAppAction(app: AppEntry, language: Language) {
  if (app.status === "available" && app.url) {
    return (
      <a className="button button-primary app-action" href={app.url}>
        {t(language, localized.appsPage.openApp)}
      </a>
    );
  }

  if (app.status === "available") {
    return (
      <button className="button button-disabled app-action" type="button" disabled>
        {t(language, localized.appsPage.linkMissing)}
      </button>
    );
  }

  return (
    <button className="button button-disabled app-action" type="button" disabled>
      {t(language, localized.appsPage.comingSoon)}
    </button>
  );
}

function AppCard({ app, language }: { app: AppEntry; language: Language }) {
  const appName = t(language, app.name);
  const visualStyle = app.previewAspectRatio ? ({ aspectRatio: app.previewAspectRatio } as CSSProperties) : undefined;
  return (
    <article className="app-card">
      <div className="app-visual" aria-hidden="true" style={visualStyle}>
        {app.previewImage ? (
          <img className="app-visual-image" src={app.previewImage} alt="" />
        ) : (
          <div className="app-visual-inner">
            <span className="app-visual-title">{t(language, localized.appsPage.previewTitle)}</span>
            <span className="app-visual-subtitle">{t(language, localized.appsPage.previewSubtitle)}</span>
          </div>
        )}
      </div>
      <div className="app-card-body">
        <div className="app-card-topline">
          <h2>{appName}</h2>
          <span className={getStatusTone(app.status)}>{statusLabelMap[language][app.status]}</span>
        </div>
        <p className="app-description">{t(language, app.description)}</p>
        <section className="app-block" aria-labelledby={`${app.status}-${app.url}-features`}>
          <h3 id={`${app.status}-${app.url}-features`}>{t(language, localized.appsPage.features)}</h3>
          <ul className="app-list">
            {app.features.map((feature) => (
              <li key={feature.ja}>{t(language, feature)}</li>
            ))}
          </ul>
        </section>
        <section className="app-block" aria-labelledby={`${app.status}-${app.url}-notes`}>
          <h3 id={`${app.status}-${app.url}-notes`}>{t(language, localized.appsPage.notes)}</h3>
          <ul className="app-list app-list-muted">
            {app.notes.map((note) => (
              <li key={note.ja}>{t(language, note)}</li>
            ))}
          </ul>
        </section>
        <div className="app-actions" aria-label={`${appName} ${t(language, localized.appsPage.actionArea)}`}>
          {getAppAction(app, language)}
        </div>
      </div>
    </article>
  );
}

function AppsPage({ language }: { language: Language }) {
  const content = localized.pageContent.apps;
  return (
    <main className="page-shell">
      <section className="hero hero-compact" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title">{t(language, content.title)}</h1>
          <p className="lead">{t(language, content.lead)}</p>
          <p>{t(language, content.body)}</p>
        </div>
        <div className="status-panel" aria-label={t(language, localized.appsPage.panelTitle)}>
          <p className="panel-title">{t(language, localized.appsPage.panelTitle)}</p>
          <p>{t(language, localized.appsPage.panelBody)}</p>
          <ul>
            {localized.appsPage.rules.map((rule) => (
              <li key={rule.ja}>{t(language, rule)}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="apps-section" aria-label={t(language, localized.appsPage.listLabel)}>
        <div className="apps-grid">
          {visibleApps.map((app) => (
            <AppCard key={app.url || app.name.ja} app={app} language={language} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ContactPage({ language }: { language: Language }) {
  const { isConfigured, isValidUrl } = getContactState();
  const content = localized.pageContent.contact;
  return (
    <main className="page-shell">
      <section className="hero hero-compact" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title">{t(language, content.title)}</h1>
          <p className="lead">{t(language, content.lead)}</p>
          <p>{t(language, content.body)}</p>
        </div>
        <div className="status-panel" aria-label={t(language, localized.contact.panelLabel)}>
          <p className="panel-title">{t(language, localized.contact.panelTitle)}</p>
          <p>{t(language, localized.contact.panelBody)}</p>
          <ul>
            {localized.contact.topics.map((topic) => (
              <li key={topic.ja}>{t(language, topic)}</li>
            ))}
          </ul>
          <p className="status-note">{t(language, localized.contact.replyNote)}</p>
        </div>
      </section>
      <section className="contact-section" aria-label={t(language, localized.contact.sectionLabel)}>
        <div className="contact-panel">
          <div>
            <h2>{t(language, localized.contact.formTitle)}</h2>
            <p>{isConfigured && isValidUrl ? t(language, localized.contact.formReady) : t(language, localized.contact.formPending)}</p>
          </div>
          <div className="contact-actions">
            {isConfigured && isValidUrl ? (
              <a className="button button-primary" href={googleFormUrl.trim()} target="_blank" rel="noopener noreferrer">
                {t(language, localized.contact.openForm)}
              </a>
            ) : (
              <button className="button button-disabled" type="button" disabled>
                {t(language, localized.contact.formPendingButton)}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function PrivacyPage({ language }: { language: Language }) {
  const content = localized.pageContent.privacy;
  return (
    <main className="page-shell">
      <section className="hero hero-compact" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title">{t(language, content.title)}</h1>
          <p className="lead">{t(language, content.lead)}</p>
          <p>{t(language, content.body)}</p>
        </div>
        <div className="status-panel" aria-label={t(language, localized.privacy.panelLabel)}>
          <p className="panel-title">{t(language, localized.privacy.panelTitle)}</p>
          <p>{t(language, localized.privacy.panelBody)}</p>
          <ul>
            {localized.privacy.panelItems.map((item) => (
              <li key={item.ja}>{t(language, item)}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="privacy-section" aria-label={t(language, localized.privacy.sectionLabel)}>
        {localized.privacy.sections.map((section) => (
          <article key={section.title.ja} className="privacy-block">
            <h2>{t(language, section.title)}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.ja}>{t(language, paragraph)}</p>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}

function SongCover({ song, language }: { song: SongEntry; language: Language }) {
  const [hasImageError, setHasImageError] = useState(false);
  const shouldShowImage = Boolean(song.coverImage.trim()) && !hasImageError;
  if (shouldShowImage) {
    return (
      <img
        className="song-cover-image"
        src={song.coverImage}
        alt={`${song.title}${t(language, localized.music.coverAltSuffix)}`}
        onError={() => setHasImageError(true)}
      />
    );
  }
  return (
    <div className="song-cover-placeholder" aria-hidden="true">
      <span>Cover</span>
      <span>{t(language, localized.music.coverReady)}</span>
    </div>
  );
}

function SongCard({ song, language, variant = "default" }: { song: SongEntry; language: Language; variant?: "default" | "featured" }) {
  const canOpenYoutube = isValidYoutubeId(song.youtubeId);
  return (
    <article className={`song-card ${variant === "featured" ? "song-card-featured" : ""}`}>
      <div className="song-cover">
        <SongCover song={song} language={language} />
      </div>
      <div className="song-card-body">
        <div className="song-card-topline">
          <h2>{song.title}</h2>
          {variant === "featured" ? <span className="status-pill is-featured">{t(language, localized.music.featured)}</span> : null}
        </div>
        <p className="song-artist">{song.artist}</p>
        <p className="song-description">{song.description}</p>
        <p className="song-date">{t(language, localized.music.datePrefix)}{song.releaseDate}</p>
        <div className="tag-list" aria-label={`${song.title}${t(language, localized.music.tagsLabel)}`}>
          {song.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="song-actions">
          {canOpenYoutube ? (
            <a className="button button-primary song-action" href={buildYoutubeUrl(song.youtubeId)} target="_blank" rel="noopener noreferrer">
              {t(language, localized.music.youtubeOpen)}
            </a>
          ) : (
            <button className="button button-disabled song-action" type="button" disabled>
              {t(language, localized.music.youtubeMissing)}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function MusicPage({ language }: { language: Language }) {
  const [musicState, setMusicState] = useState<MusicState>({ status: "loading" });

  useEffect(() => {
    let shouldIgnore = false;
    async function loadSongs() {
      try {
        const response = await fetch("/data/songs.json");
        if (!response.ok) throw new Error(t(language, localized.music.fetchError));
        const data: unknown = await response.json();
        if (!isSongsCatalog(data)) throw new Error(t(language, localized.music.invalidError));
        if (!shouldIgnore) setMusicState({ status: "loaded", catalog: data });
      } catch (error) {
        if (!shouldIgnore) {
          setMusicState({
            status: "error",
            message: error instanceof Error ? error.message : t(language, localized.music.genericError),
          });
        }
      }
    }
    setMusicState({ status: "loading" });
    loadSongs();
    return () => {
      shouldIgnore = true;
    };
  }, [language]);

  const content = localized.pageContent.music;
  if (musicState.status === "loading") {
    return (
      <main className="page-shell">
        <section className="hero hero-compact" aria-labelledby="page-title">
          <div className="hero-copy">
            <h1 id="page-title">{t(language, content.title)}</h1>
            <p className="lead">{t(language, content.lead)}</p>
            <p>{t(language, content.body)}</p>
          </div>
          <div className="status-panel" role="status" aria-live="polite">
            <p className="panel-title">{t(language, localized.music.loadingTitle)}</p>
            <p>{t(language, localized.music.loadingBody)}</p>
          </div>
        </section>
      </main>
    );
  }

  if (musicState.status === "error") {
    return (
      <main className="page-shell">
        <section className="hero hero-compact" aria-labelledby="page-title">
          <div className="hero-copy">
            <h1 id="page-title">{t(language, content.title)}</h1>
            <p className="lead">{t(language, content.lead)}</p>
            <p>{t(language, content.body)}</p>
          </div>
          <div className="status-panel status-panel-error" role="alert">
            <p className="panel-title">{t(language, localized.music.errorTitle)}</p>
            <p>{musicState.message}</p>
            <p>{t(language, localized.music.errorRetry)}</p>
          </div>
        </section>
      </main>
    );
  }

  const visibleSongs = musicState.catalog.songs.filter((song) => song.siteVisible).sort((a, b) => a.sortOrder - b.sortOrder);
  const featuredSongs = visibleSongs.filter((song) => song.featured);
  return (
    <main className="page-shell">
      <section className="hero hero-compact" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title">{t(language, content.title)}</h1>
          <p className="lead">{t(language, content.lead)}</p>
          <p>{t(language, content.body)}</p>
        </div>
        <div className="status-panel" aria-label={t(language, localized.music.panelLabel)}>
          <p className="panel-title">{t(language, localized.music.panelTitle)}</p>
          <p>{formatUpdatedAt(musicState.catalog.updatedAt, language)}</p>
          <ul>
            {localized.music.rules.map((rule) => (
              <li key={rule.ja}>{t(language, rule)}</li>
            ))}
          </ul>
        </div>
      </section>

      {featuredSongs.length > 0 ? (
        <section className="music-section" aria-labelledby="featured-songs-title">
          <div className="section-heading">
            <h2 id="featured-songs-title">{t(language, localized.music.featured)}</h2>
          </div>
          <div className="featured-songs-grid">
            {featuredSongs.map((song) => (
              <SongCard key={`featured-${song.id}`} song={song} language={language} variant="featured" />
            ))}
          </div>
        </section>
      ) : null}

      <section className="music-section" aria-labelledby="song-list-title">
        <div className="section-heading">
          <h2 id="song-list-title">{t(language, localized.music.songList)}</h2>
        </div>
        {visibleSongs.length > 0 ? (
          <div className="songs-grid">
            {visibleSongs.map((song) => (
              <SongCard key={song.id} song={song} language={language} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>{t(language, localized.music.empty)}</p>
          </div>
        )}
      </section>
    </main>
  );
}

function Header({ currentPage, language, onLanguageChange }: { currentPage: PageKey; language: Language; onLanguageChange: (language: Language) => void }) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Banana Metal home">
        <span className="brand-mark" aria-hidden="true">BM</span>
        <span>Banana Metal</span>
      </a>
      <div className="header-actions">
        <nav className="site-nav" aria-label={t(language, localized.language.label)}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href} aria-current={currentPage === item.page ? "page" : undefined}>
              {t(language, item.label)}
            </a>
          ))}
        </nav>
        <LanguageToggle language={language} onChange={onLanguageChange} />
      </div>
    </header>
  );
}

function PageBody({ currentPage, language }: { currentPage: PageKey; language: Language }) {
  const content = localized.pageContent[currentPage];
  if (currentPage === "apps") return <AppsPage language={language} />;
  if (currentPage === "music") return <MusicPage language={language} />;
  if (currentPage === "contact") return <ContactPage language={language} />;
  if (currentPage === "privacy") return <PrivacyPage language={language} />;

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title">{t(language, content.title)}</h1>
          <p className="lead">{t(language, content.lead)}</p>
          <p>{t(language, content.body)}</p>
          {currentPage === "home" ? (
            <div className="hero-actions" aria-label={t(language, localized.language.label)}>
              <a className="button button-primary" href="/apps/">{t(language, localized.home.primary)}</a>
              <a className="button button-secondary" href="/music/">{t(language, localized.home.secondaryMusic)}</a>
              <a className="button button-secondary" href="/privacy/">{t(language, localized.home.secondaryPrivacy)}</a>
            </div>
          ) : null}
        </div>
        <div className="status-panel" aria-label={t(language, localized.home.panelLabel)}>
          <p className="panel-title">{t(language, localized.home.phaseTitle)}</p>
          <p>{t(language, localized.home.phaseLead)}</p>
          <ul>
            {localized.home.items.map((item) => (
              <li key={item.ja}>{t(language, item)}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Footer({ language }: { language: Language }) {
  return (
    <footer className="site-footer">
      <p>{t(language, localized.footer.tagline)}</p>
      <a href="/privacy/">{t(language, localized.footer.privacy)}</a>
    </footer>
  );
}

function App() {
  const isKeyPlayer = normalizePath(window.location.pathname) === "/apps/key-player";
  const currentPage = getCurrentPage();
  const [language, setLanguage] = useState<Language>(() => readStoredLanguage());

  useEffect(() => {
    if (isKeyPlayer) return;
    applyDocumentLanguage(language);
    writeStoredLanguage(language);
    applyPageMeta(currentPage, language);
  }, [currentPage, isKeyPlayer, language]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;
      setLanguage(event.newValue === "en" ? "en" : "ja");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (isKeyPlayer) {
    return (
      <Suspense fallback={<main className="page-shell">Banana Key Changerを読み込んでいます</main>}>
        <KeyPlayerPage />
      </Suspense>
    );
  }

  return (
    <>
      <Header currentPage={currentPage} language={language} onLanguageChange={setLanguage} />
      <PageBody currentPage={currentPage} language={language} />
      <Footer language={language} />
    </>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
