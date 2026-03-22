"use client";

import Link from "next/link";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function SignInPage() {
  const { t } = useI18n();

  return (
    <main className="relative z-10 min-h-screen bg-white p-6 font-sans sm:p-0">
      <div className="relative flex min-h-screen w-full flex-col justify-center">
        <section className="flex w-full flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 pt-10">
            <Link
              href="/"
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
              {t("auth.backToDashboard")}
            </Link>
            <LanguageSelector />
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            <div>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 text-2xl font-semibold text-gray-800 sm:text-3xl">
                  {t("signin.title")}
                </h1>
                <p className="text-sm text-gray-500">
                  {t("signin.subtitle")}
                </p>
              </div>

              <form>
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t("signin.email")}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder={t("signin.emailPlaceholder")}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden ring-4 ring-[#465fff]/10 transition focus:border-[#465fff]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t("signin.password")}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder={t("signin.passwordPlaceholder")}
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-4 pr-11 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden ring-4 ring-[#465fff]/10 transition focus:border-[#465fff]"
                      />
                      <span className="absolute right-4 top-1/2 z-10 -translate-y-1/2 cursor-pointer text-gray-500">
                        <svg
                          className="fill-current"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M10.0002 13.8619C7.23361 13.8619 4.86803 12.1372 3.92328 9.70241C4.86804 7.26761 7.23361 5.54297 10.0002 5.54297C12.7667 5.54297 15.1323 7.26762 16.0771 9.70243C15.1323 12.1372 12.7667 13.8619 10.0002 13.8619ZM10.0002 4.04297C6.48191 4.04297 3.49489 6.30917 2.4155 9.4593C2.3615 9.61687 2.3615 9.78794 2.41549 9.94552C3.49488 13.0957 6.48191 15.3619 10.0002 15.3619C13.5184 15.3619 16.5055 13.0957 17.5849 9.94555C17.6389 9.78797 17.6389 9.6169 17.5849 9.45932C16.5055 6.30919 13.5184 4.04297 10.0002 4.04297ZM9.99151 7.84413C8.96527 7.84413 8.13333 8.67606 8.13333 9.70231C8.13333 10.7286 8.96527 11.5605 9.99151 11.5605H10.0064C11.0326 11.5605 11.8646 10.7286 11.8646 9.70231C11.8646 8.67606 11.0326 7.84413 10.0064 7.84413H9.99151Z"
                            fill="#98A2B3"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center text-sm font-normal text-gray-700 select-none">
                      <div className="mr-3 flex h-5 w-5 items-center justify-center rounded-md border-[1.25px] border-gray-300 bg-transparent">
                        <span className="opacity-0">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                          >
                            <path
                              d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                              stroke="white"
                              strokeWidth="1.94437"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </div>
                      {t("signin.keepLoggedIn")}
                    </label>
                    <a href="#" className="text-sm text-[#465fff] hover:text-[#364ed9]">
                      {t("signin.forgotPassword")}
                    </a>
                  </div>

                  <div>
                    <button
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-[#465fff] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#364ed9]"
                      type="button"
                    >
                      {t("signin.submit")}
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-5">
                <p className="text-center text-sm font-normal text-gray-700 sm:text-left">
                  {t("signin.noAccount")}{" "}
                  <Link href="/signup" className="text-[#465fff] hover:text-[#364ed9]">
                    {t("signin.signUp")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
