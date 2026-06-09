/**
 * Runtime validators for payloads coming back from LeetCode.
 *
 * These are the *minimum* schemas needed to tell whether the upstream still
 * speaks the contract our types describe. They use `passthrough()` so unknown
 * fields are kept (we re-emit some payloads verbatim to MCP clients), and they
 * mark fields optional when LeetCode has been observed to omit them.
 *
 * Use `parse` (throws `ZodError`) at the service boundary when we want to fail
 * loudly, and `safeParse` when we want to log-and-fall-back. Translate any
 * `ZodError` into `new LeetCodeError(ErrorCode.UPSTREAM_PAYLOAD_INVALID, ...)`
 * so the MCP layer can render a structured error.
 */
import { z } from "zod";

export const SubmitResponseSchema = z
    .object({
        submission_id: z.number()
    })
    .passthrough();

export const CheckResponseSchema = z
    .object({
        state: z.string(),
        // LeetCode omits status_msg on PENDING/STARTED responses; only
        // populated once `state === "SUCCESS"`.
        status_msg: z.string().optional(),
        status_code: z.number().optional(),
        runtime: z.string().optional(),
        memory: z.string().optional(),
        runtime_percentile: z.number().nullable().optional(),
        memory_percentile: z.number().nullable().optional(),
        // LeetCode has been observed to return both an array of strings (one
        // per test case) and a single JSON-encoded string here; accept both.
        code_answer: z.union([z.array(z.string()), z.string()]).optional(),
        expected_answer: z.union([z.array(z.string()), z.string()]).optional(),
        input: z.string().optional(),
        std_output: z.string().optional(),
        compile_error: z.string().optional(),
        full_compile_error: z.string().optional(),
        runtime_error: z.string().optional(),
        full_runtime_error: z.string().optional(),
        total_correct: z.number().nullable().optional(),
        total_testcases: z.number().nullable().optional()
    })
    .passthrough();

export const QuestionIdResponseSchema = z
    .object({
        data: z
            .object({
                question: z
                    .object({
                        questionId: z.string(),
                        questionFrontendId: z.string().optional()
                    })
                    .nullable()
                    .optional()
            })
            .passthrough()
    })
    .passthrough();

export const ValidateCredentialsResponseSchema = z
    .object({
        data: z
            .object({
                userStatus: z
                    .object({
                        username: z.string().nullable().optional(),
                        isSignedIn: z.boolean()
                    })
                    .passthrough()
                    .optional()
            })
            .passthrough()
    })
    .passthrough();

export type SubmitResponse = z.infer<typeof SubmitResponseSchema>;
export type CheckResponse = z.infer<typeof CheckResponseSchema>;
