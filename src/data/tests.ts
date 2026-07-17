import testDefinitions from "./test-definitions.json";

export type TestId = "60" | "100";

export type Norm = {
  mean: number;
  sd: number;
};

export type TestDefinition = {
  id: TestId;
  label: string;
  source: {
    questions: string;
    convertedFrom?: string;
    scoring: string;
    descriptives: string;
  };
  responseOptions: string[];
  questions: Array<{
    id: number;
    text: string;
  }>;
  domains: Array<{
    id: string;
    label: string;
    facets: Array<{
      id: string;
      label: string;
      items: Array<{
        number: number;
        reverse: boolean;
      }>;
    }>;
  }>;
  norms: {
    domains: Record<string, Norm>;
    facets: Record<string, Norm>;
  };
};

export const TESTS = testDefinitions as Record<TestId, TestDefinition>;
