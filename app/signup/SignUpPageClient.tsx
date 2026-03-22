"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useSignUpMutation } from "@/hooks/use-signup-mutation";
import { signUpInputSchema, type SignUpInput } from "@/lib/auth/schemas";

export function SignUpPageClient() {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const signUpMutation = useSignUpMutation();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpInputSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await signUpMutation.mutateAsync(values);
    router.replace("/");
    router.refresh();
  });

  const passwordValue = useWatch({ control, name: "password" }) ?? "";
  const passwordChecks = [
    {
      label: t("signup.passwordRuleMinLength"),
      valid: passwordValue.length >= 8,
    },
    {
      label: t("signup.passwordRuleUppercase"),
      valid: /[A-Z]/.test(passwordValue),
    },
    {
      label: t("signup.passwordRuleLowercase"),
      valid: /[a-z]/.test(passwordValue),
    },
    {
      label: t("signup.passwordRuleNumber"),
      valid: /[0-9]/.test(passwordValue),
    },
    {
      label: t("signup.passwordRuleSpecial"),
      valid: /[^A-Za-z0-9]/.test(passwordValue),
    },
  ];
  const passwordScore = passwordChecks.filter((item) => item.valid).length;
  const passwordPercent = (passwordScore / passwordChecks.length) * 100;

  const strengthLabel =
    passwordValue.length === 0
      ? t("signup.passwordStrengthEmpty")
      : passwordScore <= 1
        ? t("signup.passwordStrengthVeryWeak")
        : passwordScore === 2
          ? t("signup.passwordStrengthWeak")
          : passwordScore === 3
            ? t("signup.passwordStrengthMedium")
            : passwordScore === 4
              ? t("signup.passwordStrengthGood")
              : t("signup.passwordStrengthStrong");

  const strengthColor =
    passwordValue.length === 0
      ? "bg-gray-300"
      : passwordScore <= 1
        ? "bg-red-500"
        : passwordScore === 2
          ? "bg-orange-500"
          : passwordScore === 3
            ? "bg-amber-500"
            : passwordScore === 4
              ? "bg-lime-500"
              : "bg-emerald-500";

  return (
    <main className="relative z-10 min-h-screen bg-white p-6 font-sans sm:p-0">
      <div className="relative flex min-h-screen w-full flex-col justify-center">
        <section className="flex w-full flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 pt-6">
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

              <form onSubmit={onSubmit}>
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
                      {...register("name")}
                      placeholder={t("signup.fullNamePlaceholder")}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden ring-4 ring-[#465fff]/10 transition focus:border-[#465fff]"
                    />
                    {errors.name ? (
                      <Alert variant="error" size="sm" className="mt-1">
                        {errors.name.message}
                      </Alert>
                    ) : null}
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
                      {...register("email")}
                      placeholder={t("signup.emailPlaceholder")}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden ring-4 ring-[#465fff]/10 transition focus:border-[#465fff]"
                    />
                    {errors.email ? (
                      <Alert variant="error" size="sm" className="mt-1">
                        {errors.email.message}
                      </Alert>
                    ) : null}
                  </div>

                  <div className="relative">
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t("signup.password")}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      {...register("password")}
                      placeholder={t("signup.passwordPlaceholder")}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden ring-4 ring-[#465fff]/10 transition focus:border-[#465fff]"
                    />
                    <Button
                      onClick={() => setShowPassword((prev) => !prev)}
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-[34px] h-8 w-8 px-0 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
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
                            d="M4.63803 3.57709C4.34513 3.2842 3.87026 3.2842 3.57737 3.57709C3.28447 3.86999 3.28447 4.34486 3.57737 4.63775L4.85323 5.91362C3.74609 6.84199 2.89363 8.06395 2.4155 9.45936C2.3615 9.61694 2.3615 9.78801 2.41549 9.94558C3.49488 13.0957 6.48191 15.3619 10.0002 15.3619C11.255 15.3619 12.4422 15.0737 13.4994 14.5598L15.3625 16.4229C15.6554 16.7158 16.1302 16.7158 16.4231 16.4229C16.716 16.13 16.716 15.6551 16.4231 15.3622L4.63803 3.57709ZM12.3608 13.4212L10.4475 11.5079C10.3061 11.5423 10.1584 11.5606 10.0064 11.5606H9.99151C8.96527 11.5606 8.13333 10.7286 8.13333 9.70237C8.13333 9.5461 8.15262 9.39434 8.18895 9.24933L5.91885 6.97923C5.03505 7.69015 4.34057 8.62704 3.92328 9.70247C4.86803 12.1373 7.23361 13.8619 10.0002 13.8619C10.8326 13.8619 11.6287 13.7058 12.3608 13.4212ZM16.0771 9.70249C15.7843 10.4569 15.3552 11.1432 14.8199 11.7311L15.8813 12.7925C16.6329 11.9813 17.2187 11.0143 17.5849 9.94561C17.6389 9.78803 17.6389 9.61696 17.5849 9.45938C16.5055 6.30925 13.5184 4.04303 10.0002 4.04303C9.13525 4.04303 8.30244 4.17999 7.52218 4.43338L8.75139 5.66259C9.1556 5.58413 9.57311 5.54303 10.0002 5.54303C12.7667 5.54303 15.1323 7.26768 16.0771 9.70249Z"
                            fill="#98A2B3"
                          />
                        </svg>
                      ) : (
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
                      )}
                    </Button>
                    {errors.password ? (
                      <Alert variant="error" size="sm" className="mt-1">
                        {errors.password.message}
                      </Alert>
                    ) : null}

                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-700">
                          {t("signup.passwordStrengthLabel")}
                        </p>
                        <span className="text-xs font-semibold text-gray-700">
                          {strengthLabel}
                        </span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full transition-all ${strengthColor}`}
                          style={{ width: `${passwordPercent}%` }}
                        />
                      </div>

                      <ul className="mt-3 space-y-1">
                        {passwordChecks.map((item) => (
                          <li
                            key={item.label}
                            className={`text-xs ${
                              item.valid ? "text-emerald-700" : "text-gray-500"
                            }`}
                          >
                            {item.valid ? "✓ " : "• "}
                            {item.label}
                          </li>
                        ))}
                      </ul>
                    </div>
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
                      {...register("confirmPassword")}
                      placeholder={t("signup.confirmPasswordPlaceholder")}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden ring-4 ring-[#465fff]/10 transition focus:border-[#465fff]"
                    />
                    {errors.confirmPassword ? (
                      <Alert variant="error" size="sm" className="mt-1">
                        {errors.confirmPassword.message}
                      </Alert>
                    ) : null}
                  </div>

                  {signUpMutation.error ? (
                    <Alert variant="error">
                      {signUpMutation.error.message}
                    </Alert>
                  ) : null}

                  <div>
                    <Button
                      fullWidth
                      size="lg"
                      loading={signUpMutation.isPending}
                      loadingLabel={`${t("signup.submit")}...`}
                      type="submit"
                    >
                      {t("signup.submit")}
                    </Button>
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
