import type { Metadata } from "next";
import AuthSplitPage from "@/components/AuthSplitPage";

export const metadata: Metadata = {
  title: "Create Account",
  // Personal account flow — never index this page.
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return <AuthSplitPage mode="create-account" />;
}
