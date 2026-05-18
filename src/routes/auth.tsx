import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthShell, OpenBreachSignIn } from "../features/auth/auth-ui";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      footer={
        <p className="text-center font-mono text-xs text-[#b9cacb]">
          New user?{" "}
          <button
            onClick={() => navigate({ to: "/sign-up" })}
            className="text-[#00e639] hover:underline"
          >
            Create an account
          </button>
        </p>
      }
    >
      <OpenBreachSignIn />
    </AuthShell>
  );
}
