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

export const STAGING_ENVIRONMENT_NAME_BY_LOCALE: Record<Locale, string> = {
  "pt-BR": "Homologação",
  "en-US": "Staging",
  "es-ES": "Preproducción",
  "zh-CN": "预发布",
  "ja-JP": "ステージング",
  "ko-KR": "스테이징",
  "fr-FR": "Préproduction",
  "it-IT": "Staging",
  "de-DE": "Staging",
  "ru-RU": "Тестовый стенд",
};

export const STAGING_ENVIRONMENT_DESCRIPTION_BY_LOCALE: Record<Locale, string> = {
  "pt-BR": "Ambiente de homologação para validação antes da produção.",
  "en-US": "Staging environment for validation before production.",
  "es-ES": "Entorno de preproducción para validar antes de producción.",
  "zh-CN": "用于发布前验证的预发布环境。",
  "ja-JP": "本番リリース前の検証用ステージング環境です。",
  "ko-KR": "운영 배포 전 검증을 위한 스테이징 환경입니다.",
  "fr-FR": "Environnement de préproduction pour valider avant la production.",
  "it-IT": "Ambiente di staging per validare prima della produzione.",
  "de-DE": "Staging-Umgebung zur Validierung vor der Produktion.",
  "ru-RU": "Тестовый стенд для проверки перед продакшеном.",
};

export const PRODUCTION_ENVIRONMENT_NAME_BY_LOCALE: Record<Locale, string> = {
  "pt-BR": "Produção",
  "en-US": "Production",
  "es-ES": "Producción",
  "zh-CN": "生产环境",
  "ja-JP": "本番",
  "ko-KR": "프로덕션",
  "fr-FR": "Production",
  "it-IT": "Produzione",
  "de-DE": "Produktion",
  "ru-RU": "Продакшен",
};

export const PRODUCTION_ENVIRONMENT_DESCRIPTION_BY_LOCALE: Record<Locale, string> = {
  "pt-BR": "Ambiente de produção usado por usuários finais.",
  "en-US": "Production environment used by end users.",
  "es-ES": "Entorno de producción utilizado por usuarios finales.",
  "zh-CN": "最终用户使用的生产环境。",
  "ja-JP": "エンドユーザーが利用する本番環境です。",
  "ko-KR": "최종 사용자가 사용하는 운영 환경입니다.",
  "fr-FR": "Environnement de production utilisé par les utilisateurs finaux.",
  "it-IT": "Ambiente di produzione utilizzato dagli utenti finali.",
  "de-DE": "Produktionsumgebung für Endnutzer.",
  "ru-RU": "Продакшен-среда для конечных пользователей.",
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
