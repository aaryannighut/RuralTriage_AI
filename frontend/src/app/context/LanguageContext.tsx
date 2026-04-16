import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { toApiUrl } from "../config/runtime";

export type Language = "en" | "hi" | "mr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "app_language";
const CACHE_KEY = "translation_cache";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem(STORAGE_KEY) as Language) || "en"
  );
  
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    } catch {
      return {};
    }
  });
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [pendingTranslations, setPendingTranslations] = useState<Set<string>>(new Set());

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  // Sync cache with localStorage
  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(translations));
  }, [translations]);

  const requestTranslation = useCallback(async (text: string, targetLang: Language) => {
    if (!text || targetLang === "en") return;
    if (translations[targetLang]?.[text]) return;
    if (pendingTranslations.has(`${targetLang}:${text}`)) return;

    setPendingTranslations(prev => new Set(prev).add(`${targetLang}:${text}`));
    setIsTranslating(true);

    try {
      const res = await fetch(toApiUrl("/translate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target_lang: targetLang })
      });
      
      const data = await res.json();
      
      if (data.translated_text) {
        setTranslations(prev => ({
          ...prev,
          [targetLang]: {
            ...prev[targetLang],
            [text]: data.translated_text
          }
        }));
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
      setPendingTranslations(prev => {
        const next = new Set(prev);
        next.delete(`${targetLang}:${text}`);
        return next;
      });
    }
  }, [translations, pendingTranslations]);

  const t = (text: string): string => {
    if (!text || language === "en") return text;
    
    // Check memory cache
    if (translations[language]?.[text]) {
      return translations[language][text];
    }

    // Trigger background translation if not already translating
    requestTranslation(text, language);

    return text; // Fallback to original while translating
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
