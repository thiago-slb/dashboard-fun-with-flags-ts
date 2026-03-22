import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n/translations";

export const DEVELOPMENT_ENVIRONMENT_NAME_BY_LOCALE: Record<Locale, string> = {
  "pt-BR": "Desenvolvimento",
  "en-US": "Development",
  "es-ES": "Desarrollo",
  "zh-CN": "开发环境",
  "ja-JP": "開発",
  "ko-KR": "개발",
  "fr-FR": "Développement",
  "it-IT": "Sviluppo",
  "de-DE": "Entwicklung",
  "ru-RU": "Разработка",
};

export const DEVELOPMENT_ENVIRONMENT_DESCRIPTION_BY_LOCALE: Record<Locale, string> = {
  "pt-BR": "Ambiente de desenvolvimento padrão.",
  "en-US": "Default development environment.",
  "es-ES": "Entorno de desarrollo predeterminado.",
  "zh-CN": "默认开发环境。",
  "ja-JP": "既定の開発環境です。",
  "ko-KR": "기본 개발 환경입니다.",
  "fr-FR": "Environnement de développement par défaut.",
  "it-IT": "Ambiente di sviluppo predefinito.",
  "de-DE": "Standard-Entwicklungsumgebung.",
  "ru-RU": "Среда разработки по умолчанию.",
};

export function resolveLocaleFromAcceptLanguage(
  acceptLanguageHeader: string | null,
): Locale {
  if (!acceptLanguageHeader) {
    return DEFAULT_LOCALE;
  }

  const languageTags = acceptLanguageHeader
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter((value): value is string => Boolean(value));

  for (const tag of languageTags) {
    if (SUPPORTED_LOCALES.includes(tag as Locale)) {
      return tag as Locale;
    }
  }

  for (const tag of languageTags) {
    const baseLanguage = tag.toLowerCase().split("-")[0];
    if (!baseLanguage) {
      continue;
    }

    const fallback = SUPPORTED_LOCALES.find((locale) =>
      locale.toLowerCase().startsWith(`${baseLanguage}-`),
    );

    if (fallback) {
      return fallback;
    }
  }

  return DEFAULT_LOCALE;
}
