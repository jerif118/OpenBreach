export type GeographyDto = {
  country: string;
  region: string;
  city: string;
};

export type WorkflowPhaseName =
  | "intake"
  | "passive-scan"
  | "hypothesis"
  | "test-planning"
  | "approval"
  | "execution"
  | "validation"
  | "reporting"
  | "archived";
