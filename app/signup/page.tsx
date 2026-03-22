import { redirect } from "next/navigation";
import { existsUserWithMaxLevelRole } from "@/lib/auth/bootstrap";
import { SignUpPageClient } from "./SignUpPageClient";

export default async function SignUpPage() {
  const hasMaxLevelRoleUser = await existsUserWithMaxLevelRole();

  if (hasMaxLevelRoleUser) {
    redirect("/signin");
  }

  return <SignUpPageClient />;
}
