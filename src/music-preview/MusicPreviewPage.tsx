import { useEffect, useState } from "react";
import type { Language } from "../data/apps";
import { loadMusicPreviewCatalog } from "./data";
import { KaraokeLibrarySection, MusicCategoryNav, MusicHowItWorks, MusicPreviewHero, OriginalSongsSection } from "./components";
import type { MusicPreviewState } from "./types";
import "./music-preview.css";

export function MusicPreviewPage({ language }: { language: Language }) {
  const [state, setState] = useState<MusicPreviewState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    loadMusicPreviewCatalog(controller.signal)
      .then((catalog) => setState({ status: "loaded", catalog }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="music-preview-shell">
      <MusicPreviewHero />
      {state.status === "loading" ? (
        <section className="music-preview-state" role="status" aria-live="polite"><strong>{language === "ja" ? "楽曲データを読み込んでいます。" : "Loading the music catalog."}</strong></section>
      ) : state.status === "error" ? (
        <section className="music-preview-state is-error" role="alert"><strong>{language === "ja" ? "楽曲データを読み込めませんでした。" : "The music catalog could not be loaded."}</strong><p>{language === "ja" ? "時間を置いて再度お試しください。" : "Please try again later."}</p></section>
      ) : (
        <>
          <MusicCategoryNav language={language} />
          <OriginalSongsSection songs={state.catalog.originalSongs} language={language} />
          <KaraokeLibrarySection songs={state.catalog.karaokeSongs} language={language} />
          <MusicHowItWorks language={language} />
        </>
      )}
    </main>
  );
}
