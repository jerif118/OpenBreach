import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthShell, OpenBreachSignUp } from "../features/auth/auth-ui";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      footer={
        <p className="text-center font-mono text-xs text-[#b9cacb]">
          Already have an account?{" "}
          <button
            onClick={() => navigate({ to: "/auth" })}
            className="text-[#00e639] hover:underline"
          >
            Sign in
          </button>
        </p>
      }
    >
      <OpenBreachSignUp />
    </AuthShell>
  );
}
