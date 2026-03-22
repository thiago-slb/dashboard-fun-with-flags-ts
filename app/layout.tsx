import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { existsUserWithMaxLevelRole } from "@/lib/auth/bootstrap";
import { getSession } from "@/lib/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fun With Flags",
  description: "Dashboard for Fun With Flags",
};

const AUTH_ROUTES = new Set(["/signin", "/signup"]);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const session = await getSession();
  const isAuthRoute = AUTH_ROUTES.has(pathname);

  if (!session) {
    const hasMaxLevelRoleUser = await existsUserWithMaxLevelRole();

    if (!hasMaxLevelRoleUser && pathname !== "/signup") {
      redirect("/signup");
    }

    if (hasMaxLevelRoleUser && pathname !== "/signin") {
      redirect("/signin");
    }
  } else if (isAuthRoute) {
    redirect("/");
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
