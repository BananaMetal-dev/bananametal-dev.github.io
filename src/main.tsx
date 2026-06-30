import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type PageKey = "home" | "apps" | "music" | "contact" | "privacy" | "not-found";

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
    lead: "公開予定のブラウザアプリを紹介するページです。",
    body: "アプリカード、状態管理、利用ページへのリンクはPhase 2で追加します。",
  },
  music: {
    title: "Music",
    lead: "公開楽曲の一覧とYouTubeへの導線を置くページです。",
    body: "songs.jsonの読み込み、注目曲、YouTubeリンク生成はPhase 3で追加します。",
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
