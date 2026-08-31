import type { Metadata } from "next";
import AuthSplitPage from "@/components/AuthSplitPage";

export const metadata: Metadata = {
  title: "Sign In",
  // Personal account flow — never index this page.
  robots: { index: false, follow: false },
};

// Server component wrapper (so metadata can live here directly, no
// separate layout.tsx needed — see app/product/[id]/page.tsx for the
// same pattern) around the actual client-interactive form.
export default function SignInPage() {
  return <AuthSplitPage mode="sign-in" />;
}
