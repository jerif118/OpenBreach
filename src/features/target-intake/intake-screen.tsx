import { useEffect, useState, useCallback, type FormEvent } from "react";
import type { ValidationClass } from "../../shared/contracts.ts";
import {
  Panel,
  InputField,
  TextAreaField,
  KeyValueRow,
  ObjectPreview,
} from "../../shared/components/index.ts";
import {
  approvedTargetIntakeFixture,
  draftToFormState,
  evaluateTargetIntakeForm,
  getSafetyModelCards,
  parseTargetIntakeDraft,
  targetIntakeSubmissionSchema,
  targetIntakeSubmissionListSchema,
  type TargetIntakeEvaluation,
  type TargetIntakeFormState,
  type TargetIntakeSubmission,
} from "./intake-flow.ts";

const DRAFT_STORAGE_KEY = "openbreach:intake-draft";
const HISTORY_STORAGE_KEY = "openbreach:intake-history";
const DEBOUNCE_MS = 300;

const validationLevelOptions: Array<{
  value: ValidationClass;
  label: string;
  detail: string;
}> = [
  {
    value: "passive",
    label: "Passive",
    detail: "Metadata only. Safe default for demo mode.",
  },
  {
    value: "semiactive",
    label: "Semiactive",
    detail: "Safe HEAD/GET verification on explicitly allowed assets.",
  },
  {
    value: "controlled_validation",
    label: "Controlled Validation",
    detail: "Time-bound hypothesis checks that stay blocked pending approval.",
  },
];

function trySaveToStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function tryLoadFromStorage<T>(
  key: string,
  parser: (val: string) => T | null,
): T | null {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return null;
    return parser(stored);
  } catch {
    return null;
  }
}

export function TargetIntakeScreen() {
  const [previewTime] = useState(() => new Date().toISOString());
  const [formState, setFormState] = useState<TargetIntakeFormState>(() =>
    draftToFormState(approvedTargetIntakeFixture),
  );
  const [history, setHistory] = useState<TargetIntakeSubmission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [submitMessage, setSubmitMessage] = useState<string>(
    "Create a scope record to persist the intake result locally.",
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedDraft = tryLoadFromStorage(DRAFT_STORAGE_KEY, (val) => {
      try {
        return JSON.parse(val) as TargetIntakeFormState;
      } catch {
        return null;
      }
    });
    if (storedDraft) {
      setFormState(storedDraft);
    }

    const storedHistory = tryLoadFromStorage(HISTORY_STORAGE_KEY, (val) => {
      try {
        return targetIntakeSubmissionListSchema.parse(JSON.parse(val));
      } catch {
        return null;
      }
    });
    if (storedHistory && storedHistory.length > 0) {
      setHistory(storedHistory);
      setSelectedSubmissionId(storedHistory[0]?.id ?? null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timeoutId = setTimeout(() => {
      const success = trySaveToStorage(
        DRAFT_STORAGE_KEY,
        JSON.stringify(formState),
      );
      if (!success) {
        setSubmitMessage("Failed to save draft. Storage may be full.");
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [formState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const success = trySaveToStorage(
      HISTORY_STORAGE_KEY,
      JSON.stringify(history),
    );
    if (!success && history.length > 0) {
      setSubmitMessage("Failed to save history. Storage may be full.");
    }
  }, [history]);

  const previewEvaluation = evaluateTargetIntakeForm(formState, previewTime);
  const selectedSubmission =
    history.find((item) => item.id === selectedSubmissionId) ??
    history[0] ??
    null;
  const selectedEvaluation =
    selectedSubmission?.evaluation ?? previewEvaluation;
  const selectedLabel = selectedSubmission
    ? "Stored pipeline record"
    : "Live preview";

  const updateField = useCallback(
    <Key extends keyof TargetIntakeFormState>(
      field: Key,
      value: TargetIntakeFormState[Key],
    ) => {
      setFormState((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  function resetToSafeDefault() {
    setFormState(draftToFormState(approvedTargetIntakeFixture));
    setSubmitMessage("Draft reset to the owned public target fixture.");
  }

  function clearHistory() {
    setHistory([]);
    setSelectedSubmissionId(null);
    setSubmitMessage("Saved intake history cleared from local storage.");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedDraft = parseTargetIntakeDraft(formState);
    if (!parsedDraft.success) {
      setSubmitMessage(
        "The intake form still has invalid fields. Fix them before creating a scope record.",
      );
      return;
    }

    const submittedAt = new Date().toISOString();
    const evaluation = evaluateTargetIntakeForm(formState, submittedAt);
    const submissionId = `submission-${submittedAt}`;
    const submission = targetIntakeSubmissionSchema.parse({
      id: submissionId,
      submittedAt,
      draft: parsedDraft.data,
      evaluation,
    });

    setHistory((current) => [submission, ...current].slice(0, 12));
    setSelectedSubmissionId(submissionId);

    if (evaluation.state === "approved") {
      setSubmitMessage(
        "Authorization scope created and saved locally. No scan or network activity was triggered.",
      );
      return;
    }

    if (evaluation.state === "rejected") {
      setSubmitMessage(
        "Rejected intake saved locally with audit events and workflow state. Adjust the scope and submit again.",
      );
      return;
    }

    setSubmitMessage(
      "The form was not valid enough to generate a pipeline record.",
    );
  }

  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_30rem),radial-gradient(circle_at_bottom_right,_rgba(248,113,113,0.12),_transparent_28rem),linear-gradient(180deg,_#040815_0%,_#09111d_48%,_#050a12_100%)] text-slate-100"
      role="main"
      aria-label="Target intake and authorization gate"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.42em] text-teal-300 uppercase">
                OpenBreach
              </p>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Target intake and authorization gate
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300 sm:text-base">
                Turn a user-provided public target into an explicit
                authorization scope before any scan, orchestrator, or validation
                workflow can start.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-teal-400/25 bg-teal-400/10 px-4 py-4 text-sm text-teal-50">
              <p className="font-semibold">Pipeline-safe gate</p>
              <p className="mt-1 text-teal-50/80">
                Records are persisted locally in the browser so the flow remains
                fully functional even when Convex persistence is not wired in.
              </p>
            </div>
          </div>
        </header>

        <section
          className="mt-5 grid flex-1 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
          aria-label="Intake form and evaluation panels"
        >
          <div className="grid gap-5">
            <Panel title="Intake controls" eyebrow="Session">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  aria-description="Reset form to default approved fixture target"
                  className="rounded-full border border-teal-300/40 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-50 transition hover:border-teal-200 hover:bg-teal-300/15"
                  onClick={resetToSafeDefault}
                >
                  Reset to safe default
                </button>
                <button
                  type="button"
                  aria-description="Clear all saved intake history from local storage"
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                  onClick={clearHistory}
                >
                  Clear saved history
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The form starts with an owned public target. To verify rejection
                behavior, enter an asset outside the canonical host or a private
                address such as `10.x.x.x`; the intake gate will block it before
                any downstream work begins.
              </p>
            </Panel>

            <Panel title="Scope intake" eyebrow="Form">
              <form
                aria-label="Target intake form"
                className="grid gap-4"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    label="Organization name"
                    value={formState.organizationName}
                    onChange={(value) => updateField("organizationName", value)}
                    id="organization-name"
                  />
                  <InputField
                    label="Canonical URL"
                    value={formState.canonicalUrl}
                    onChange={(value) => updateField("canonicalUrl", value)}
                    placeholder="https://merida.gob.mx"
                    id="canonical-url"
                  />
                  <InputField
                    label="Owner name"
                    value={formState.ownerName}
                    onChange={(value) => updateField("ownerName", value)}
                    id="owner-name"
                  />
                  <InputField
                    label="Owner contact"
                    value={formState.ownerEmail}
                    onChange={(value) => updateField("ownerEmail", value)}
                    placeholder="owner@example.org"
                    id="owner-contact"
                    type="email"
                  />
                  <InputField
                    label="Approver name"
                    value={formState.approverName}
                    onChange={(value) => updateField("approverName", value)}
                    id="approver-name"
                  />
                  <InputField
                    label="Submitted by"
                    value={formState.submittedBy}
                    onChange={(value) => updateField("submittedBy", value)}
                    id="submitted-by"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextAreaField
                    label="Allowed assets"
                    helpText="One public URL per line."
                    value={formState.allowedAssetsText}
                    onChange={(value) =>
                      updateField("allowedAssetsText", value)
                    }
                    id="allowed-assets"
                  />
                  <TextAreaField
                    label="Denied assets"
                    helpText="Optional exclusions that stay outside the scope."
                    value={formState.deniedAssetsText}
                    onChange={(value) => updateField("deniedAssetsText", value)}
                    id="denied-assets"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="grid gap-2">
                    <label
                      htmlFor="validation-level"
                      className="text-sm font-medium text-slate-200"
                    >
                      Validation level
                    </label>
                    <select
                      id="validation-level"
                      aria-describedby="validation-level-detail"
                      className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white transition outline-none focus:border-teal-200 focus:ring-2 focus:ring-teal-200/30"
                      value={formState.validationLevel}
                      onChange={(event) =>
                        updateField(
                          "validationLevel",
                          event.target.value as ValidationClass,
                        )
                      }
                    >
                      {validationLevelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p
                      id="validation-level-detail"
                      className="text-xs leading-5 text-slate-400"
                    >
                      {
                        validationLevelOptions.find(
                          (option) =>
                            option.value === formState.validationLevel,
                        )?.detail
                      }
                    </p>
                  </div>
                  <InputField
                    label="Test window start"
                    type="datetime-local"
                    value={formState.testWindowStart}
                    onChange={(value) => updateField("testWindowStart", value)}
                    id="test-window-start"
                  />
                  <InputField
                    label="Test window end"
                    type="datetime-local"
                    value={formState.testWindowEnd}
                    onChange={(value) => updateField("testWindowEnd", value)}
                    id="test-window-end"
                  />
                  <InputField
                    label="Rate limit (rpm)"
                    value={formState.rateLimitRpm}
                    onChange={(value) => updateField("rateLimitRpm", value)}
                    inputMode="numeric"
                    id="rate-limit"
                    helpText="Requests per minute (1-240)"
                  />
                </div>

                <div
                  className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 px-4 py-4"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm leading-6 text-slate-300">
                      {submitMessage}
                    </p>
                    <button
                      type="submit"
                      aria-label="Create scope record from current form values"
                      className="rounded-full border border-teal-300/40 bg-teal-400/10 px-5 py-2.5 text-sm font-semibold text-teal-50 transition hover:border-teal-200 hover:bg-teal-300/15"
                    >
                      Create scope record
                    </button>
                  </div>
                </div>
              </form>
            </Panel>

            <Panel title="Safety boundaries" eyebrow="Policy">
              <div className="grid gap-3 md:grid-cols-3">
                {getSafetyModelCards().map((card) => {
                  const active = card.level === formState.validationLevel;
                  return (
                    <div
                      key={card.level}
                      aria-pressed={active}
                      className={`rounded-[1.4rem] border p-4 transition ${
                        active
                          ? "border-teal-300/50 bg-teal-400/10 shadow-lg shadow-teal-950/20"
                          : "border-white/10 bg-slate-950/45"
                      }`}
                    >
                      <p className="text-xs font-semibold tracking-[0.28em] text-teal-300 uppercase">
                        {card.title}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {card.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Explicitly denied actions always include login attempts, brute
                force, fuzzing, payload injection, private-network scanning, and
                destructive requests. Controlled validation stays blocked until
                a separate execution approval gate is granted.
              </p>
            </Panel>
          </div>

          <div className="grid gap-5">
            <DecisionPanel evaluation={previewEvaluation} />

            <Panel title={selectedLabel} eyebrow="DTO output">
              <div
                className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-4"
                role="region"
                aria-label="Selected submission details"
              >
                <p className="text-xs font-semibold tracking-[0.28em] text-teal-300 uppercase">
                  Selected submission
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {selectedSubmission
                    ? `${selectedSubmission.submittedAt} · ${selectedSubmission.evaluation.state}`
                    : "Submit the form to persist a scope record. Until then, the DTOs below show the live preview only."}
                </p>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <ObjectPreview
                  label="TargetProfile"
                  value={selectedEvaluation.targetProfile}
                />
                <ObjectPreview
                  label="AuthorizationScope"
                  value={selectedEvaluation.authorizationScope}
                />
                <ObjectPreview
                  label="WorkflowRun"
                  value={selectedEvaluation.workflowRun}
                />
                <ObjectPreview
                  label="ApprovalGate"
                  value={selectedEvaluation.intakeGate}
                />
              </div>
            </Panel>

            <Panel title="Saved pipeline history" eyebrow="Persistence">
              <div aria-label="Pipeline history list" className="grid gap-3">
                {history.length === 0 ? (
                  <p
                    className="rounded-[1.2rem] border border-dashed border-white/10 bg-slate-950/45 px-4 py-5 text-sm text-slate-400"
                    role="status"
                  >
                    No saved scope records yet. Submitting the form stores a
                    full intake result locally with DTOs and audit data.
                  </p>
                ) : (
                  history.map((submission) => {
                    const active = submission.id === selectedSubmissionId;
                    return (
                      <button
                        key={submission.id}
                        type="button"
                        aria-pressed={active}
                        aria-label={`Select submission ${submission.id} from ${submission.submittedAt}`}
                        className={`rounded-[1.2rem] border px-4 py-4 text-left transition ${
                          active
                            ? "border-teal-300/40 bg-teal-400/10"
                            : "border-white/10 bg-slate-950/55 hover:border-white/20"
                        }`}
                        onClick={() => setSelectedSubmissionId(submission.id)}
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-mono text-sm text-teal-200">
                              {submission.evaluation.targetProfile?.name ??
                                "Pending target"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {submission.id}
                            </p>
                          </div>
                          <div className="text-xs text-slate-400 lg:text-right">
                            <p>{submission.submittedAt}</p>
                            <p>{submission.evaluation.state}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Panel>

            <Panel title="Audit trail" eyebrow="Events">
              <div
                aria-label="Audit events list"
                aria-live="polite"
                className="grid gap-3"
              >
                {selectedEvaluation.auditEvents.length === 0 ? (
                  <p
                    className="rounded-[1.2rem] border border-dashed border-white/10 bg-slate-950/45 px-4 py-5 text-sm text-slate-400"
                    role="status"
                  >
                    Audit events appear once the intake produces a valid
                    approved or rejected decision.
                  </p>
                ) : (
                  selectedEvaluation.auditEvents.map((event) => (
                    <div
                      key={event.eventId}
                      className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-mono text-sm text-teal-200">
                            {event.eventType}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {event.eventId}
                          </p>
                        </div>
                        <div className="text-xs text-slate-400 sm:text-right">
                          <p>{event.actor}</p>
                          <p>{event.timestamp}</p>
                        </div>
                      </div>
                      {event.details ? (
                        <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#030712] p-3 text-xs leading-6 text-slate-300">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function DecisionPanel({ evaluation }: { evaluation: TargetIntakeEvaluation }) {
  const statusTone =
    evaluation.state === "approved"
      ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-50"
      : evaluation.state === "rejected"
        ? "border-rose-300/35 bg-rose-400/10 text-rose-50"
        : "border-amber-300/35 bg-amber-400/10 text-amber-50";

  const badgeLabel =
    evaluation.state === "approved"
      ? "Approved scope"
      : evaluation.state === "rejected"
        ? "Rejected intake"
        : "Awaiting valid form";

  return (
    <Panel title="Current intake evaluation" eyebrow="Authorization gate">
      <div
        className={`rounded-[1.5rem] border px-5 py-5 ${statusTone}`}
        role="alert"
        aria-atomic="true"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] uppercase">
              {badgeLabel}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              {evaluation.nextStep}
            </h2>
          </div>
          <div
            aria-label="Network activity status"
            className="rounded-full border border-current/25 px-3 py-2 text-xs font-semibold tracking-[0.24em] uppercase"
          >
            network activity: disabled
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-xs font-semibold tracking-[0.28em] text-teal-300 uppercase">
            Outcome
          </p>
          {evaluation.reasons.length > 0 ? (
            <ul
              aria-label="Rejection reasons"
              className="mt-3 grid gap-2 text-sm leading-6 text-slate-200"
            >
              {evaluation.reasons.map((reason) => (
                <li
                  key={reason}
                  className="rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2"
                >
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-300">
              The scope is structurally valid. Use the submit action to persist
              the result as a real intake record for the pipeline.
            </p>
          )}

          {evaluation.fieldErrors.length > 0 ? (
            <div
              aria-label="Form field errors"
              className="mt-4 grid gap-2"
              role="alert"
            >
              {evaluation.fieldErrors.map((issue) => (
                <div
                  key={`${issue.field}:${issue.message}`}
                  className="rounded-2xl border border-amber-300/15 bg-amber-400/10 px-3 py-2 text-sm text-amber-50"
                >
                  <span className="font-semibold">{issue.field}</span>:{" "}
                  {issue.message}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-xs font-semibold tracking-[0.28em] text-teal-300 uppercase">
            Normalized scope
          </p>
          {evaluation.normalized ? (
            <dl
              aria-label="Normalized scope details"
              className="mt-3 grid gap-3 text-sm text-slate-200"
            >
              <KeyValueRow
                labelId="normalized-canonical-url-label"
                label="Canonical URL"
                value={evaluation.normalized.canonicalUrl}
              />
              <KeyValueRow
                labelId="normalized-canonical-host-label"
                label="Canonical host"
                value={evaluation.normalized.canonicalHost}
              />
              <KeyValueRow
                labelId="normalized-allowed-assets-label"
                label="Allowed assets"
                value={`${evaluation.normalized.allowedAssets.length} assets`}
              />
              <KeyValueRow
                labelId="normalized-denied-assets-label"
                label="Denied assets"
                value={`${evaluation.normalized.deniedAssets.length} assets`}
              />
              <KeyValueRow
                labelId="workflow-status-label"
                label="Workflow status"
                value={evaluation.workflowRun?.status ?? "not created"}
              />
            </dl>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Complete the intake fields to see normalized URLs and derived
              workflow state.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
