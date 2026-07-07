(() => {
  "use strict";

  const STORAGE_KEY = "bananaMetal.ui.language";
  const DEFAULT_LANGUAGE = "ja";
  const VALID_LANGUAGES = new Set(["ja", "en"]);
  const listeners = new Set();

  function normalizeLanguage(value) {
    return VALID_LANGUAGES.has(value) ? value : DEFAULT_LANGUAGE;
  }

  function getLanguage() {
    try {
      return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
    } catch (_error) {
      return DEFAULT_LANGUAGE;
    }
  }

  function applyDocumentLanguage(language) {
    const next = normalizeLanguage(language);
    document.documentElement.lang = next;
    document.documentElement.dataset.lang = next;
    document.body?.setAttribute("data-lang", next);
    return next;
  }

  function notify(language) {
    listeners.forEach((listener) => {
      try {
        listener(language);
      } catch (_error) {
        // Ignore listener errors to keep cross-page sync resilient.
      }
    });
  }

  function setLanguage(language) {
    const next = applyDocumentLanguage(language);

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (_error) {
      // Ignore storage errors and still update current page.
    }

    notify(next);
    return next;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const next = applyDocumentLanguage(event.newValue);
    notify(next);
  });

  const initialLanguage = applyDocumentLanguage(getLanguage());

  window.BananaMetalLanguage = {
    STORAGE_KEY,
    DEFAULT_LANGUAGE,
    getLanguage,
    setLanguage,
    subscribe,
    applyDocumentLanguage,
    initialLanguage,
  };
})();
