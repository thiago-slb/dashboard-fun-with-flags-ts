"use client";

import Link from "next/link";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/components/i18n/I18nProvider";

export function SignUpPageClient() {
  const { t } = useI18n();

  return (
    <main className="relative z-10 min-h-screen bg-white p-6 font-sans sm:p-0">
      <div className="relative flex min-h-screen w-full flex-col justify-center">
        <section className="flex w-full flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 pt-10">
            <Link
              href="/signin"
              className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              <svg
                className="mr-1 stroke-current"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12.7083 5L7.5 10.2083L12.7083 15.4167"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("auth.backToSignIn")}
            </Link>
            <LanguageSelector />
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            <div>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 text-2xl font-semibold text-gray-800 sm:text-3xl">
                  {t("signup.title")}
                </h1>
                <p className="text-sm text-gray-500">{t("signup.subtitle")}</p>
              </div>

              <form>
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t("signup.fullName")}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      placeholder={t("signup.fullNamePlaceholder")}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden ring-4 ring-[#465fff]/10 transition focus:border-[#465fff]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t("signup.email")}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder={t("signup.emailPlaceholder")}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden ring-4 ring-[#465fff]/10 transition focus:border-[#465fff]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t("signup.password")}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      placeholder={t("signup.passwordPlaceholder")}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden ring-4 ring-[#465fff]/10 transition focus:border-[#465fff]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t("signup.confirmPassword")}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder={t("signup.confirmPasswordPlaceholder")}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden ring-4 ring-[#465fff]/10 transition focus:border-[#465fff]"
                    />
                  </div>

                  <div>
                    <button
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-[#465fff] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#364ed9]"
                      type="button"
                    >
                      {t("signup.submit")}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
