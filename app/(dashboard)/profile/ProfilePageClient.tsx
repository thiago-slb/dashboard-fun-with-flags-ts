"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { H1 } from "@/components/ui/H1";
import { H2 } from "@/components/ui/H2";
import {
  signUpErrorResponseSchema,
  updatePasswordInputSchema,
  updatePasswordSuccessResponseSchema,
  updateProfileInputSchema,
  updateProfileSuccessResponseSchema,
  type UpdatePasswordInput,
  type UpdateProfileInput,
} from "@/lib/auth/schemas";

type ProfilePageClientProps = {
  userName: string;
  userEmail: string;
  userId: string;
  primaryRole: string;
  workspaceName: string;
  membershipStatus: string;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function ProfilePageClient({
  userName,
  userEmail,
  userId,
  primaryRole,
  workspaceName,
  membershipStatus,
}: ProfilePageClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(userName);
  const [displayEmail, setDisplayEmail] = useState(userEmail);
  const router = useRouter();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileInputSchema),
    defaultValues: {
      name: userName,
      email: userEmail,
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isDirty: isPasswordDirty },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordInputSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const onSubmit = handleProfileSubmit(async (values) => {
    setProfileFeedback(null);
    setIsSaving(true);

    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const parsedError = signUpErrorResponseSchema.safeParse(payload);
      setProfileFeedback(
        parsedError.success
          ? parsedError.data.error.message
          : "Could not update profile.",
      );
      setIsSaving(false);
      return;
    }

    const parsed = updateProfileSuccessResponseSchema.safeParse(payload);
    if (!parsed.success) {
      setProfileFeedback("Invalid response while updating profile.");
      setIsSaving(false);
      return;
    }

    const updated = parsed.data.user;
    setDisplayName(updated.name?.trim() ? updated.name : updated.email.split("@")[0]);
    setDisplayEmail(updated.email);
    setProfileFeedback("Profile updated successfully.");
    setIsSaving(false);
    router.refresh();
  });

  const onSubmitPassword = handlePasswordSubmit(async (values) => {
    setPasswordFeedback(null);
    setIsSavingPassword(true);

    const response = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const parsedError = signUpErrorResponseSchema.safeParse(payload);
      setPasswordFeedback(
        parsedError.success
          ? parsedError.data.error.message
          : "Could not update password.",
      );
      setIsSavingPassword(false);
      return;
    }

    const parsed = updatePasswordSuccessResponseSchema.safeParse(payload);
    if (!parsed.success) {
      setPasswordFeedback("Invalid response while updating password.");
      setIsSavingPassword(false);
      return;
    }

    setPasswordFeedback("Password updated successfully.");
    setIsSavingPassword(false);
    resetPasswordForm();
  });

  async function handleLogout() {
    setProfileFeedback(null);
    setPasswordFeedback(null);
    setIsLoggingOut(true);

    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.replace("/signin");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-[#f8fbff] to-[#f4f6fb]">
      <SideMenu isOpen={sidebarOpen} />

      {sidebarOpen ? (
        <Button
          type="button"
          variant="unstyled"
          size="none"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-gray-900/50 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          userName={displayName}
          userEmail={displayEmail}
        />

        <main className="p-5 sm:p-7">
          <div className="mb-6">
            <nav className="mb-2 flex items-center gap-2 text-xs text-slate-500">
              <Link href="/" className="hover:text-slate-700">
                Home
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-700">Profile</span>
            </nav>
            <H1>
              Profile
            </H1>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
            <div className="h-28 rounded-t-2xl bg-gradient-to-r from-[#465fff] to-[#6f86ff]" />
            <div className="px-6 pb-6">
              <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-slate-900 text-2xl font-semibold text-white shadow-sm">
                    {getInitials(displayName)}
                  </div>
                  <div className="-mt-2">
                    <H2 className="text-xl text-white pb-2">{displayName}</H2>
                    <p className="text-sm text-slate-500">{displayEmail}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-6">
                  <span className="rounded-lg bg-[#465fff]/10 px-3 py-1.5 text-xs font-medium text-[#465fff]">
                    {primaryRole}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                    {workspaceName}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <Card>
              <h3 className="text-base font-semibold tracking-tight text-slate-900">
                Personal Information
              </h3>

              <form className="mt-4 space-y-4" onSubmit={onSubmit}>
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <label
                    htmlFor="name"
                    className="text-xs uppercase tracking-wide text-slate-500"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...registerProfile("name")}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#465fff]"
                  />
                  {profileErrors.name ? (
                    <Alert variant="error" size="sm" className="mt-1">
                      {profileErrors.name.message}
                    </Alert>
                  ) : null}
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <label
                    htmlFor="email"
                    className="text-xs uppercase tracking-wide text-slate-500"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...registerProfile("email")}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#465fff]"
                  />
                  {profileErrors.email ? (
                    <Alert variant="error" size="sm" className="mt-1">
                      {profileErrors.email.message}
                    </Alert>
                  ) : null}
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">User ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-900">{userId}</p>
                </div>
                {profileFeedback ? (
                  <Alert
                    variant={
                      profileFeedback.includes("successfully") ? "success" : "error"
                    }
                  >
                    {profileFeedback}
                  </Alert>
                ) : null}
                <Button
                  type="submit"
                  disabled={isSaving || !isProfileDirty}
                  className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </Card>

            <Card>
              <h3 className="text-base font-semibold tracking-tight text-slate-900">
                Access Information
              </h3>

              <dl className="mt-4 space-y-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Primary Role</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{primaryRole}</dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Membership Status</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{membershipStatus}</dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Workspace</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{workspaceName}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <Card className="mt-6">
            <h3 className="text-base font-semibold tracking-tight text-slate-900">Security</h3>
            <p className="mt-2 text-sm text-slate-600">Update your account password.</p>

            <form className="mt-4 space-y-3" onSubmit={onSubmitPassword}>
              <div>
                <label
                  htmlFor="currentPassword"
                  className="text-xs uppercase tracking-wide text-slate-500"
                >
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  {...registerPassword("currentPassword")}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#465fff]"
                />
                {passwordErrors.currentPassword ? (
                  <Alert variant="error" size="sm" className="mt-1">
                    {passwordErrors.currentPassword.message}
                  </Alert>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="text-xs uppercase tracking-wide text-slate-500"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  {...registerPassword("newPassword")}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#465fff]"
                />
                {passwordErrors.newPassword ? (
                  <Alert variant="error" size="sm" className="mt-1">
                    {passwordErrors.newPassword.message}
                  </Alert>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="confirmNewPassword"
                  className="text-xs uppercase tracking-wide text-slate-500"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  {...registerPassword("confirmNewPassword")}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#465fff]"
                />
                {passwordErrors.confirmNewPassword ? (
                  <Alert variant="error" size="sm" className="mt-1">
                    {passwordErrors.confirmNewPassword.message}
                  </Alert>
                ) : null}
              </div>

              {passwordFeedback ? (
                <Alert
                  variant={
                    passwordFeedback.includes("successfully") ? "success" : "error"
                  }
                >
                  {passwordFeedback}
                </Alert>
              ) : null}

              <Button
                type="submit"
                disabled={isSavingPassword || !isPasswordDirty}
                className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingPassword ? "Updating..." : "Update password"}
              </Button>
            </form>

            <hr className="my-5 border-slate-200" />
            <h3 className="text-base font-semibold tracking-tight text-slate-900">Session</h3>
            <p className="mt-2 text-sm text-slate-600">
              Use this button to safely end your current session.
            </p>
            <Button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-4 h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </Button>
          </Card>
        </main>
      </div>
    </div>
  );
}
