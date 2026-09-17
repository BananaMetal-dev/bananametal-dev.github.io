import { useDeferredValue, useState, type ReactNode } from "react";
import type { Language, LocalizedText } from "../data/apps";
import { isYoutubeUrl } from "./data";
import type { Availability, KaraokeSongEntry, MusicEntryBase, OriginalSongEntry } from "./types";

const copy = {
  category: {
    originalTitle: { ja: "ORIGINAL SONGS", en: "ORIGINAL SONGS" },
    originalHeading: { ja: "オリジナル曲を探す", en: "Find an original song" },
    originalBody: { ja: "BananaMetalが制作したオリジナル楽曲から、イメージに合う曲を探せます。", en: "Browse BananaMetal originals and find a track that fits your vision." },
    originalAction: { ja: "オリジナル曲を見る", en: "View original songs" },
    karaokeTitle: { ja: "KARAOKE LIBRARY", en: "KARAOKE LIBRARY" },
    karaokeHeading: { ja: "カラオケ音源リスト", en: "Karaoke audio list" },
    karaokeBody: { ja: "制作済みのカラオケ音源から、曲名やアーティストで探せます。", en: "Search prepared karaoke tracks by title or original artist." },
    karaokeAction: { ja: "カラオケを探す", en: "Browse karaoke" },
  },
  original: {
    title: { ja: "ORIGINAL SONG COLLECTION", en: "ORIGINAL SONG COLLECTION" },
    heading: { ja: "オリジナル曲", en: "Original songs" },
  },
  karaoke: {
    title: { ja: "KARAOKE LIBRARY", en: "KARAOKE LIBRARY" },
    heading: { ja: "カラオケ音源リスト", en: "Karaoke audio list" },
    artistColumn: { ja: "Artist", en: "Artist" },
    songColumn: { ja: "Song", en: "Song" },
    searchLabel: { ja: "曲名・アーティスト・スタイル・タグで検索", en: "Search title, artist, style, or tags" },
    searchPlaceholder: { ja: "曲名やアーティストを入力", en: "Enter a title or artist" },
    artist: { ja: "Original Artist", en: "Original Artist" },
    style: { ja: "Style", en: "Style" },
    availability: { ja: "Availability", en: "Availability" },
    tag: { ja: "Tag", en: "Tag" },
    all: { ja: "すべて", en: "All" },
    clear: { ja: "条件をクリア", en: "Clear filters" },
    openSearch: { ja: "検索・フィルターを開く", en: "Open search and filters" },
    closeSearch: { ja: "検索・フィルターを閉じる", en: "Close search and filters" },
    tracksSuffix: { ja: "曲", en: " tracks" },
    noResults: { ja: "条件に一致する曲がありません。検索条件を変更してください。", en: "No tracks match these filters. Try changing your search." },
  },
  card: {
    featured: { ja: "おすすめ", en: "FEATURED" },
    vocal: { ja: "ボーカル入りを試聴", en: "Listen with vocals" },
    karaoke: { ja: "カラオケ版を試聴", en: "Listen to karaoke" },
    previewPending: { ja: "試聴準備中", en: "Preview coming soon" },
    contact: { ja: "この曲について相談", en: "Ask about this track" },
    originalArtist: { ja: "Original Artist", en: "Original Artist" },
    style: { ja: "Style", en: "Style" },
  },
  empty: { ja: "現在公開できる楽曲はありません。楽曲が追加されるとここに表示されます。", en: "No tracks are currently available. New tracks will appear here." },
  availability: {
    available: { ja: "利用相談受付中", en: "Available for inquiries" },
    reserved: { ja: "相談中", en: "In discussion" },
    closed: { ja: "受付終了", en: "Closed" },
    coming_soon: { ja: "準備中", en: "Coming soon" },
  },
  how: {
    title: { ja: "HOW IT WORKS", en: "HOW IT WORKS" },
    heading: { ja: "曲を見つけて、相談するまで", en: "From discovery to inquiry" },
    steps: [
      { ja: "曲を探す", en: "Find a track" },
      { ja: "YouTubeで試聴", en: "Listen on YouTube" },
      { ja: "曲を選ぶ", en: "Choose your track" },
      { ja: "問い合わせ", en: "Contact us" },
    ],
  },
} as const;

function text(language: Language, value: LocalizedText) {
  return value[language];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
}

function contactHref(song: MusicEntryBase & { category: "original" | "karaoke" }) {
  const params = new URLSearchParams({ track_id: song.trackId, title: song.title, category: song.category });
  return `/contact/?${params.toString()}`;
}

export function MusicPreviewHero() {
  return (
    <section className="music-preview-hero" aria-labelledby="music-preview-title">
      <h1 id="music-preview-title">MUSIC</h1>
    </section>
  );
}

export function MusicCategoryNav({ language }: { language: Language }) {
  const cards = [
    { href: "#original-song-collection", title: copy.category.originalTitle, heading: copy.category.originalHeading, body: copy.category.originalBody, action: copy.category.originalAction },
    { href: "#karaoke-library", title: copy.category.karaokeTitle, heading: copy.category.karaokeHeading, body: copy.category.karaokeBody, action: copy.category.karaokeAction },
  ];
  return (
    <nav className="music-category-grid" aria-label={language === "ja" ? "楽曲カテゴリー" : "Music categories"}>
      {cards.map((card) => (
        <a className="music-category-card" href={card.href} key={card.href}>
          <span className="music-section-label">{text(language, card.title)}</span>
          <strong>{text(language, card.heading)}</strong>
          <span>{text(language, card.body)}</span>
          <span className="music-inline-action">{text(language, card.action)} <span aria-hidden="true">↓</span></span>
        </a>
      ))}
    </nav>
  );
}

function AvailabilityBadge({ availability, language }: { availability: Availability; language: Language }) {
  return <span className={`music-availability is-${availability}`}>{text(language, copy.availability[availability])}</span>;
}

function YoutubeLink({ href, children }: { href: string; children: ReactNode }) {
  if (!isYoutubeUrl(href)) return null;
  return <a className="music-preview-button is-secondary" href={href} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">▶</span>{children}</a>;
}

export function OriginalSongCard({ song, language }: { song: OriginalSongEntry; language: Language }) {
  return (
    <article className="music-song-card">
      <div className="music-song-info-line">
        <span className="music-song-artist">{song.artist}</span>
        <h3>{song.title}</h3>
        <AvailabilityBadge availability={song.availability} language={language} />
        <div className="music-song-actions">
          {isYoutubeUrl(song.youtubeVocal) ? <YoutubeLink href={song.youtubeVocal}>{language === "ja" ? "視聴" : "Watch"}</YoutubeLink> : <button className="music-preview-button is-disabled" type="button" disabled>{language === "ja" ? "視聴" : "Watch"}</button>}
          <a className="music-preview-button is-primary" href={contactHref(song)}>{language === "ja" ? <>この曲について<br />相談</> : <>Ask about<br />this track</>}</a>
        </div>
      </div>
    </article>
  );
}

export function OriginalSongsSection({ songs, language }: { songs: OriginalSongEntry[]; language: Language }) {
  return (
    <section className="music-preview-section" id="original-song-collection" aria-labelledby="original-song-title">
      <div className="music-preview-section-heading">
        <span className="music-section-label">{text(language, copy.original.title)}</span>
        <h2 id="original-song-title">{text(language, copy.original.heading)}</h2>
      </div>
      {songs.length > 0 ? <><MusicSongListHeader language={language} /><div className="music-song-list">{songs.map((song) => <OriginalSongCard key={song.trackId} song={song} language={language} />)}</div></> : <MusicEmptyState language={language} />}
    </section>
  );
}

function KaraokeSearchControls({ songs, language, query, artist, style, availability, tag, onQuery, onArtist, onStyle, onAvailability, onTag, onClear }: {
  songs: KaraokeSongEntry[];
  language: Language;
  query: string;
  artist: string;
  style: string;
  availability: string;
  tag: string;
  onQuery: (value: string) => void;
  onArtist: (value: string) => void;
  onStyle: (value: string) => void;
  onAvailability: (value: string) => void;
  onTag: (value: string) => void;
  onClear: () => void;
}) {
  const fields = [
    { id: "artist", label: copy.karaoke.artist, value: artist, options: unique(songs.map((song) => song.originalArtist)), onChange: onArtist },
    { id: "style", label: copy.karaoke.style, value: style, options: unique(songs.map((song) => song.style)), onChange: onStyle },
    { id: "availability", label: copy.karaoke.availability, value: availability, options: unique(songs.map((song) => song.availability)), onChange: onAvailability },
    { id: "tag", label: copy.karaoke.tag, value: tag, options: unique(songs.flatMap((song) => song.tags)), onChange: onTag },
  ];
  return (
    <div className="karaoke-search-panel">
      <label className="karaoke-search-field" htmlFor="karaoke-search"><span>{text(language, copy.karaoke.searchLabel)}</span><input id="karaoke-search" type="search" value={query} placeholder={text(language, copy.karaoke.searchPlaceholder)} onChange={(event) => onQuery(event.target.value)} /></label>
      <div className="karaoke-filter-grid">
        {fields.map((field) => (
          <label key={field.id} htmlFor={`karaoke-${field.id}`}><span>{text(language, field.label)}</span><select id={`karaoke-${field.id}`} value={field.value} onChange={(event) => field.onChange(event.target.value)}><option value="">{text(language, copy.karaoke.all)}</option>{field.options.map((option) => <option key={option} value={option}>{field.id === "availability" ? text(language, copy.availability[option as Availability]) : option}</option>)}</select></label>
        ))}
      </div>
      <button className="music-filter-clear" type="button" onClick={onClear}>{text(language, copy.karaoke.clear)}</button>
    </div>
  );
}

function KaraokeSongCard({ song, language }: { song: KaraokeSongEntry; language: Language }) {
  return (
    <article className="music-song-card">
      <div className="music-song-info-line">
        <span className="music-song-artist">{song.originalArtist}</span>
        <h3>{song.title}</h3>
        <AvailabilityBadge availability={song.availability} language={language} />
        <div className="music-song-actions">
          {isYoutubeUrl(song.youtubeUrl) ? <YoutubeLink href={song.youtubeUrl}>{language === "ja" ? <>視聴</> : <>Watch</>}</YoutubeLink> : <button className="music-preview-button is-disabled" type="button" disabled>{language === "ja" ? <>視聴</> : <>Watch</>}</button>}
          <button className="music-preview-button is-disabled" type="button" disabled>{language === "ja" ? <>この曲について<br />相談</> : <>Ask about<br />this track</>}</button>
        </div>
      </div>
    </article>
  );
}

function MusicSongListHeader({ language }: { language: Language }) {
  return <div className="music-song-list-header"><span>{text(language, copy.karaoke.artistColumn)}</span><span>{text(language, copy.karaoke.songColumn)}</span></div>;
}

export function KaraokeLibrarySection({ songs, language }: { songs: KaraokeSongEntry[]; language: Language }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [artist, setArtist] = useState("");
  const [style, setStyle] = useState("");
  const [availability, setAvailability] = useState("");
  const [tag, setTag] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const filteredSongs = songs.filter((song) => {
    const searchable = [song.title, song.originalArtist, song.style, ...song.tags].join(" ").toLocaleLowerCase();
    return (!deferredQuery || searchable.includes(deferredQuery)) && (!artist || song.originalArtist === artist) && (!style || song.style === style) && (!availability || song.availability === availability) && (!tag || song.tags.includes(tag));
  });
  const clear = () => { setQuery(""); setArtist(""); setStyle(""); setAvailability(""); setTag(""); };
  return (
    <section className="music-preview-section" id="karaoke-library" aria-labelledby="karaoke-library-title">
      <div className="music-preview-section-heading"><span className="music-section-label">{text(language, copy.karaoke.title)}</span><h2 id="karaoke-library-title">{text(language, copy.karaoke.heading)}</h2></div>
      <button
        className="karaoke-search-toggle"
        type="button"
        aria-expanded={isSearchOpen}
        aria-controls="karaoke-search-controls"
        onClick={() => setIsSearchOpen((current) => !current)}
      >
        {text(language, isSearchOpen ? copy.karaoke.closeSearch : copy.karaoke.openSearch)}
        <span aria-hidden="true">{isSearchOpen ? "−" : "+"}</span>
      </button>
      <div id="karaoke-search-controls" hidden={!isSearchOpen}>
        <KaraokeSearchControls songs={songs} language={language} query={query} artist={artist} style={style} availability={availability} tag={tag} onQuery={setQuery} onArtist={setArtist} onStyle={setStyle} onAvailability={setAvailability} onTag={setTag} onClear={clear} />
      </div>
      <p className="karaoke-result-count" aria-live="polite">{language === "ja" ? `${filteredSongs.length}${text(language, copy.karaoke.tracksSuffix)}` : `${filteredSongs.length}${text(language, copy.karaoke.tracksSuffix)}`}</p>
      {songs.length === 0 ? <MusicEmptyState language={language} /> : filteredSongs.length > 0 ? <><MusicSongListHeader language={language} /><div className="music-song-list">{filteredSongs.map((song) => <KaraokeSongCard key={song.trackId} song={song} language={language} />)}</div></> : <div className="music-preview-empty"><p>{text(language, copy.karaoke.noResults)}</p></div>}
    </section>
  );
}

function MusicEmptyState({ language }: { language: Language }) {
  return <div className="music-preview-empty"><p>{text(language, copy.empty)}</p></div>;
}

export function MusicHowItWorks({ language }: { language: Language }) {
  return (
    <section className="music-preview-section music-how" aria-labelledby="music-how-title">
      <div className="music-preview-section-heading"><span className="music-section-label">{text(language, copy.how.title)}</span><h2 id="music-how-title">{text(language, copy.how.heading)}</h2></div>
      <ol>{copy.how.steps.map((step, index) => <li key={step.ja}><span>STEP {String(index + 1).padStart(2, "0")}</span><strong>{text(language, step)}</strong></li>)}</ol>
    </section>
  );
}
