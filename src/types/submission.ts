export interface SubmissionRequest {
    problemSlug: string;
    code: string;
    language: string;
}

export interface SubmissionResult {
    accepted: boolean;
    runtime?: string;
    memory?: string;
    runtimePercentile?: number;
    memoryPercentile?: number;
    totalCorrect?: number;
    totalTestcases?: number;
    failedTestCase?: string;
    errorMessage?: string;
    statusMessage: string;
}

export interface LeetCodeSubmitResponse {
    submission_id: number;
}

export interface LeetCodeCheckResponse {
    state: string;
    status_msg: string;
    status_code?: number;
    runtime?: string;
    memory?: string;
    runtime_percentile?: number;
    memory_percentile?: number;
    code_answer?: string[];
    expected_answer?: string[];
    input?: string;
    std_output?: string;
    compile_error?: string;
    full_compile_error?: string;
    runtime_error?: string;
    full_runtime_error?: string;
    total_correct?: number;
    total_testcases?: number;
}
