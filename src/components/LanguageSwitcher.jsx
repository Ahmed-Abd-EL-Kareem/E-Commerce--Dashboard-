import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);

    // Dispatch the custom event
    window.dispatchEvent(new Event("languageChanged"));

    // Update document language only (no direction change)
    document.documentElement.lang = lng;
  };

  useEffect(() => {
    // Set initial language
    const currentLang = i18n.language;
    document.documentElement.lang = currentLang;
  }, [i18n.language]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => changeLanguage("en")}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          i18n.language === "en"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        English
      </button>
      <button
        onClick={() => changeLanguage("ar")}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          i18n.language === "ar"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        العربية
      </button>
    </div>
  );
};

export default LanguageSwitcher;
