import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { apps, statusLabelMap, type AppEntry } from "./data/apps";

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

const navItems: Array<{ label: string; href: string; page: PageKey }> = [
  { label: "Home", href: "/", page: "home" },
  { label: "Apps", href: "/apps/", page: "apps" },
  { label: "Music", href: "/music/", page: "music" },
  { label: "Contact", href: "/contact/", page: "contact" },
  { label: "Privacy", href: "/privacy/", page: "privacy" },
];

const normalizePath = (path: string): string => {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
};

const getCurrentPage = (): PageKey => {
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
};

const pageContent: Record<PageKey, { title: string; lead: string; body: string }> = {
  home: {
    title: "Banana Metal Apps & Music",
    lead: "作成したブラウザアプリと楽曲を、公開サイトとして整理していく場所です。",
    body: "Phase 1ではページ枠組みだけを用意しています。Apps、Music、Contactへ進む導線を確認できます。",
  },
  apps: {
    title: "Apps",
    lead: "公開予定のブラウザアプリを一覧で確認できるページです。",
    body: "各アプリの状態、説明、特徴、利用上の注意をまとめて表示します。",
  },
  music: {
    title: "Music",
    lead: "公開用の楽曲データを読み込み、YouTubeへの外部リンクとして表示します。",
    body: "初期版では public/data/songs.json を手動編集して楽曲一覧を管理します。",
  },
  contact: {
    title: "Contact",
    lead: "不具合報告、機能要望、楽曲や連携相談の窓口です。",
    body: "Googleフォームへの実導線はPhase 4で追加します。現段階ではページ枠組みのみです。",
  },
  privacy: {
    title: "Privacy",
    lead: "問い合わせ内容や外部サービスへのリンクに関する説明を置くページです。",
    body: "プライバシー本文はPhase 4で整備します。外部通信が一切ないとは断定しない方針です。",
  },
  "not-found": {
    title: "ページが見つかりません",
    lead: "指定されたページは、この初期構成にはありません。",
    body: "トップページ、Apps、Music、Contactのいずれかへ移動してください。",
  },
};

const youtubeIdPattern = /^[A-Za-z0-9_-]{6,}$/;

function isSongEntry(value: unknown): value is SongEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

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
  if (!value || typeof value !== "object") {
    return false;
  }

  const catalog = value as Partial<SongsCatalog>;

  return (
    (typeof catalog.updatedAt === "string" || typeof catalog.updatedAt === "undefined") &&
    Array.isArray(catalog.songs) &&
    catalog.songs.every(isSongEntry)
  );
}

function formatUpdatedAt(updatedAt?: string) {
  if (!updatedAt) {
    return "最終更新：情報なし";
  }

  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "最終更新：情報なし";
  }

  return `最終更新：${new Intl.DateTimeFormat("ja-JP", {
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

const visibleApps = apps.filter((app) => app.status !== "private");

function getAppAction(app: AppEntry) {
  if (app.status === "available" && app.url) {
    return (
      <a className="button button-primary app-action" href={app.url}>
        アプリを開く
      </a>
    );
  }

  if (app.status === "available") {
    return (
      <button className="button button-disabled app-action" type="button" disabled>
        リンク未設定
      </button>
    );
  }

  return (
    <button className="button button-disabled app-action" type="button" disabled>
      準備中
    </button>
  );
}

function getStatusTone(status: AppEntry["status"]) {
  if (status === "available") {
    return "status-pill is-available";
  }

  if (status === "coming_soon") {
    return "status-pill is-coming-soon";
  }

  return "status-pill is-private";
}

function AppCard({ app }: { app: AppEntry }) {
  return (
    <article className="app-card">
      <div className="app-visual" aria-hidden="true">
        <div className="app-visual-inner">
          <span className="app-visual-title">Preview</span>
          <span className="app-visual-subtitle">Screenshot準備中</span>
        </div>
      </div>
      <div className="app-card-body">
        <div className="app-card-topline">
          <h2>{app.name}</h2>
          <span className={getStatusTone(app.status)}>{statusLabelMap[app.status]}</span>
        </div>
        <p className="app-description">{app.description}</p>

        <section className="app-block" aria-labelledby={`${app.name}-features`}>
          <h3 id={`${app.name}-features`}>主な特徴</h3>
          <ul className="app-list">
            {app.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </section>

        <section className="app-block" aria-labelledby={`${app.name}-notes`}>
          <h3 id={`${app.name}-notes`}>利用上の注意</h3>
          <ul className="app-list app-list-muted">
            {app.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <div className="app-actions" aria-label={`${app.name} の操作領域`}>
          {getAppAction(app)}
        </div>
      </div>
    </article>
  );
}

function AppsPage() {
  return (
    <main className="page-shell">
      <section className="hero hero-compact" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title">{pageContent.apps.title}</h1>
          <p className="lead">{pageContent.apps.lead}</p>
          <p>{pageContent.apps.body}</p>
        </div>
        <div className="status-panel" aria-label="Appsページの説明">
          <p className="panel-title">Apps</p>
          <p>公開状態とリンクの有無で表示を切り替えます。</p>
          <ul>
            <li>private は表示しない</li>
            <li>coming_soon は準備中表示</li>
            <li>available は URL ありのみ遷移</li>
          </ul>
        </div>
      </section>

      <section className="apps-section" aria-label="アプリ一覧">
        <div className="apps-grid">
          {visibleApps.map((app) => (
            <AppCard key={app.name} app={app} />
          ))}
        </div>
      </section>
    </main>
  );
}

function SongCover({ song }: { song: SongEntry }) {
  const [hasImageError, setHasImageError] = useState(false);
  const shouldShowImage = Boolean(song.coverImage.trim()) && !hasImageError;

  if (shouldShowImage) {
    return (
      <img
        className="song-cover-image"
        src={song.coverImage}
        alt={`${song.title} のジャケット画像`}
        onError={() => setHasImageError(true)}
      />
    );
  }

  return (
    <div className="song-cover-placeholder" aria-hidden="true">
      <span>Cover</span>
      <span>画像準備中</span>
    </div>
  );
}

function SongCard({ song, variant = "default" }: { song: SongEntry; variant?: "default" | "featured" }) {
  const canOpenYoutube = isValidYoutubeId(song.youtubeId);

  return (
    <article className={`song-card ${variant === "featured" ? "song-card-featured" : ""}`}>
      <div className="song-cover">
        <SongCover song={song} />
      </div>
      <div className="song-card-body">
        <div className="song-card-topline">
          <h2>{song.title}</h2>
          {variant === "featured" ? <span className="status-pill is-featured">注目曲</span> : null}
        </div>
        <p className="song-artist">{song.artist}</p>
        <p className="song-description">{song.description}</p>
        <p className="song-date">公開日：{song.releaseDate}</p>
        <div className="tag-list" aria-label={`${song.title} のタグ`}>
          {song.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="song-actions">
          {canOpenYoutube ? (
            <a
              className="button button-primary song-action"
              href={buildYoutubeUrl(song.youtubeId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTubeで聴く
            </a>
          ) : (
            <button className="button button-disabled song-action" type="button" disabled>
              YouTubeリンク未設定
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function MusicPage() {
  const [musicState, setMusicState] = useState<MusicState>({ status: "loading" });

  useEffect(() => {
    let shouldIgnore = false;

    async function loadSongs() {
      try {
        const response = await fetch("/data/songs.json");

        if (!response.ok) {
          throw new Error("songs.json の取得に失敗しました。");
        }

        const data: unknown = await response.json();

        if (!isSongsCatalog(data)) {
          throw new Error("songs.json の形式が正しくありません。");
        }

        if (!shouldIgnore) {
          setMusicState({ status: "loaded", catalog: data });
        }
      } catch (error) {
        if (!shouldIgnore) {
          setMusicState({
            status: "error",
            message: error instanceof Error ? error.message : "楽曲一覧を読み込めませんでした。",
          });
        }
      }
    }

    loadSongs();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  const content = pageContent.music;

  if (musicState.status === "loading") {
    return (
      <main className="page-shell">
        <section className="hero hero-compact" aria-labelledby="page-title">
          <div className="hero-copy">
            <h1 id="page-title">{content.title}</h1>
            <p className="lead">{content.lead}</p>
            <p>{content.body}</p>
          </div>
          <div className="status-panel" role="status" aria-live="polite">
            <p className="panel-title">読み込み中</p>
            <p>楽曲一覧を読み込んでいます。</p>
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
            <h1 id="page-title">{content.title}</h1>
            <p className="lead">{content.lead}</p>
            <p>{content.body}</p>
          </div>
          <div className="status-panel status-panel-error" role="alert">
            <p className="panel-title">読み込みエラー</p>
            <p>{musicState.message}</p>
            <p>時間を置いて再読み込みしてください。</p>
          </div>
        </section>
      </main>
    );
  }

  const visibleSongs = musicState.catalog.songs
    .filter((song) => song.siteVisible)
    .sort((first, second) => first.sortOrder - second.sortOrder);
  const featuredSongs = visibleSongs.filter((song) => song.featured);

  return (
    <main className="page-shell">
      <section className="hero hero-compact" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title">{content.title}</h1>
          <p className="lead">{content.lead}</p>
          <p>{content.body}</p>
        </div>
        <div className="status-panel" aria-label="Musicページの更新情報">
          <p className="panel-title">Music</p>
          <p>{formatUpdatedAt(musicState.catalog.updatedAt)}</p>
          <ul>
            <li>siteVisible の曲だけ表示</li>
            <li>sortOrder 昇順</li>
            <li>YouTube は外部リンクで開く</li>
          </ul>
        </div>
      </section>

      {featuredSongs.length > 0 ? (
        <section className="music-section" aria-labelledby="featured-songs-title">
          <div className="section-heading">
            <h2 id="featured-songs-title">注目曲</h2>
          </div>
          <div className="featured-songs-grid">
            {featuredSongs.map((song) => (
              <SongCard key={`featured-${song.id}`} song={song} variant="featured" />
            ))}
          </div>
        </section>
      ) : null}

      <section className="music-section" aria-labelledby="song-list-title">
        <div className="section-heading">
          <h2 id="song-list-title">楽曲一覧</h2>
        </div>
        {visibleSongs.length > 0 ? (
          <div className="songs-grid">
            {visibleSongs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>表示できる楽曲がありません。</p>
          </div>
        )}
      </section>
    </main>
  );
}

function Header({ currentPage }: { currentPage: PageKey }) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Banana Metal トップページ">
        <span className="brand-mark" aria-hidden="true">
          BM
        </span>
        <span>Banana Metal</span>
      </a>
      <nav className="site-nav" aria-label="主要ナビゲーション">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={currentPage === item.page ? "page" : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

function PageBody({ currentPage }: { currentPage: PageKey }) {
  const content = pageContent[currentPage];

  if (currentPage === "apps") {
    return <AppsPage />;
  }

  if (currentPage === "music") {
    return <MusicPage />;
  }

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title">{content.title}</h1>
          <p className="lead">{content.lead}</p>
          <p>{content.body}</p>
          <div className="hero-actions" aria-label="主要導線">
            <a className="button button-primary" href="/apps/">
              Appsを見る
            </a>
            <a className="button button-secondary" href="/music/">
              Musicを見る
            </a>
            <a className="button button-secondary" href="/privacy/">
              Privacyを見る
            </a>
          </div>
        </div>
        <div className="status-panel" aria-label="Phase 1の状態">
          <p className="panel-title">Phase 1</p>
          <p>サイトの土台とページ枠組みを準備中</p>
          <ul>
            <li>静的ページ導線</li>
            <li>共通ヘッダーとフッター</li>
            <li>外部連携なし</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <p>Banana Metal - Apps, Music and Creative Tools</p>
      <a href="/privacy/">Privacy</a>
    </footer>
  );
}

function App() {
  const currentPage = getCurrentPage();

  return (
    <>
      <Header currentPage={currentPage} />
      <PageBody currentPage={currentPage} />
      <Footer />
    </>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
