import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/tanstack-react-start";

// Splat route: catches all sub-paths under /sign-up/* (e.g. /sign-up/sso-callback,
// /sign-up/verify-email-address). Clerk's <SignUp /> component inspects the
// URL and renders the appropriate step when `routing="path"`.
export const Route = createFileRoute("/sign-up/$")({
  component: SignUpSplat,
});

function SignUpSplat() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
