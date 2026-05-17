export type CoverageState =
  | 'pass'
  | 'partial'
  | 'fail'
  | 'none'
  | 'intentional_none';

export interface Story {
  story_key: string;
  title: string;
  epic?: string;
  sprint?: string;
  status?: string;
}

export type ManualStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN';

export interface ManualCase {
  id: string;
  title: string;
  folder: string;
  tags: string[];
  story_keys: string[];
  last_run: string | null;
  last_status: ManualStatus;
  steps?: string[];
  owner?: string;
  last_edited?: string;
}

export type AutoStatus = 'pass' | 'fail' | 'skip' | 'error';
export type TestType = 'ui' | 'api' | 'unit' | 'integration';
export type Framework = 'pytest' | 'playwright' | 'cypress' | 'postman';

export interface AutomatedTest {
  id: string;
  fq_name: string;
  framework: Framework;
  test_type: TestType;
  jira_keys: string[];
  last_run: string | null;
  last_status: AutoStatus;
  last_5_runs?: ('pass' | 'fail' | 'skip')[];
  owner?: string;
  last_edited?: string;
  file_path?: string;
  ci_url?: string;
}

export interface Bug {
  jira_key: string;
  title: string;
  severity: 'S1' | 'S2' | 'S3' | 'S4';
  found_in: 'prod' | 'stage' | 'dev';
  story_keys: string[];
  linked_case_ids: string[];
  linked_automated_test_ids: string[];
  opened_at: string;
  closed_at: string | null;
}

export interface CoverageTally {
  total: number;
  passing: number;
  state: CoverageState;
}

export interface StoryCoverage {
  story: Story;
  manual: CoverageTally;
  ui_auto: CoverageTally;
  api_auto: CoverageTally;
  bugs: { total: number; prod: number };
  manual_cases: ManualCase[];
  ui_tests: AutomatedTest[];
  api_tests: AutomatedTest[];
  linked_bugs: Bug[];
}
