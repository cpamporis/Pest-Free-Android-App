import en from '../locales/en.json';
import gr from '../locales/gr.json';

const translations = {
  en,
  gr,
};

let currentLocale = 'en';
let currentTranslations = translations.en;

const resolveKey = (source, key) => {
  return key.split('.').reduce((acc, part) => {
    if (acc && acc[part] !== undefined) return acc[part];
    return undefined;
  }, source);
};

const interpolate = (text, params = {}) => {
  if (typeof text !== 'string') return text;

  let result = text;

  Object.keys(params).forEach((paramKey) => {
    const value = String(params[paramKey]);

    // Supports both {{param}} and %{param}
    result = result.replace(new RegExp(`\\{\\{\\s*${paramKey}\\s*\\}\\}`, 'g'), value);
    result = result.replace(new RegExp(`%\\{\\s*${paramKey}\\s*\\}`, 'g'), value);
  });

  return result;
};

const i18n = {
  getLocale: () => currentLocale,

  getTranslations: () => currentTranslations,

  setLocale: (locale) => {
    if (translations[locale]) {
      currentLocale = locale;
      currentTranslations = translations[locale];
      return true;
    }

    console.warn(`Locale ${locale} not supported`);
    return false;
  },

  t: (key, params = {}) => {
    let value = resolveKey(currentTranslations, key);

    if (value === undefined) {
      value = resolveKey(translations.en, key);
    }

    if (value === undefined) {
      console.warn(`Translation missing for key: ${key} in ${currentLocale}`);
      return key;
    }

    return interpolate(value, params);
  },
};

export default i18n;