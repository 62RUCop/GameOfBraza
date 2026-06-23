import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./locales/ru.json";

export const defaultNS = "translation";
export const resources = { ru: { translation: ru } } as const;

// Initialised lazily on the client; server components use `t()` directly.
if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    lng: "ru",
    fallbackLng: "ru",
    resources,
    interpolation: { escapeValue: false },
  });
}

export default i18next;
