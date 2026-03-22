"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";
import {
  signUpErrorResponseSchema,
  updateProfileInputSchema,
  updateProfileSuccessResponseSchema,
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(userName);
  const [displayEmail, setDisplayEmail] = useState(userEmail);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileInputSchema),
    defaultValues: {
      name: userName,
      email: userEmail,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
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
      setFeedback(
        parsedError.success
          ? parsedError.data.error.message
          : "Could not update profile.",
      );
      setIsSaving(false);
      return;
    }

    const parsed = updateProfileSuccessResponseSchema.safeParse(payload);
    if (!parsed.success) {
      setFeedback("Invalid response while updating profile.");
      setIsSaving(false);
      return;
    }

    const updated = parsed.data.user;
    setDisplayName(updated.name?.trim() ? updated.name : updated.email.split("@")[0]);
    setDisplayEmail(updated.email);
    setFeedback("Profile updated successfully.");
    setIsSaving(false);
    router.refresh();
  });

  async function handleLogout() {
    setFeedback(null);
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
        <button
          type="button"
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
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Profile
            </h1>
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
                    <h2 className="text-xl font-semibold text-white pb-2">{displayName}</h2>
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
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
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
                    {...register("name")}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#465fff]"
                  />
                  {errors.name ? (
                    <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
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
                    {...register("email")}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#465fff]"
                  />
                  {errors.email ? (
                    <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">User ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-900">{userId}</p>
                </div>
                {feedback ? (
                  <p
                    className={`text-sm ${
                      feedback.includes("successfully")
                        ? "text-emerald-700"
                        : "text-red-600"
                    }`}
                  >
                    {feedback}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSaving || !isDirty}
                  className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
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
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
            <h3 className="text-base font-semibold tracking-tight text-slate-900">Session</h3>
            <p className="mt-2 text-sm text-slate-600">
              Use this button to safely end your current session.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-4 h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
