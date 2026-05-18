import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/tanstack-react-start";

// Splat route: catches all sub-paths under /sign-in/* (e.g. /sign-in/sso-callback,
// /sign-in/factor-one, /sign-in/factor-two). Clerk's <SignIn /> component
// inspects the URL and renders the appropriate step when `routing="path"`.
export const Route = createFileRoute("/sign-in/$")({
  component: SignInSplat,
});

function SignInSplat() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
