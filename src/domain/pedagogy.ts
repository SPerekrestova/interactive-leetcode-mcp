/**
 * Generates per-level hint text for a given problem.
 *
 * Phase 3 ships generic hints derived from the problem's existing
 * `hints` and `topicTags`. Phase 5 (workspace awareness) extends this by
 * accepting the user's actual code so the level-2/3 messages can
 * critique what they wrote rather than describing the problem in the
 * abstract. The `userCode` parameter is already in the signature to keep
 * the contract stable across phases.
 */
import type { HintLevel, SimplifiedProblem } from "../types/index.js";

/**
 * Pure projection from problem + level → hint text. No IO.
 *
 * The contract per level matches `HintLevel`'s docstring:
 *   1 — clarification (restate, edge cases)
 *   2 — approach (paradigm / data structure)
 *   3 — implementation sketch (pseudocode-level)
 *   4 — optimal (full solution; the agent should call
 *       `get_problem_solution` once this level is reached, not paraphrase)
 *
 * Level 0 is "no hint requested yet" and is never produced by this
 * function — callers should never ask for it.
 *
 * `userCode` is reserved for Phase 5; if provided, future levels will
 * incorporate it. The Phase 3 implementation ignores it.
 */
export function generateHint(
    problem: SimplifiedProblem,
    level: Exclude<HintLevel, 0>,
    _userCode?: string
): string {
    switch (level) {
        case 1:
            return level1(problem);
        case 2:
            return level2(problem);
        case 3:
            return level3(problem);
        case 4:
            return level4(problem);
    }
}

function level1(problem: SimplifiedProblem): string {
    const examples = problem.exampleTestcases?.trim();
    const examplePart = examples
        ? `\n\nWalk through the example inputs and the expected outputs in your own words:\n\n\`\`\`\n${examples}\n\`\`\`\n\nWhat invariants must hold? What edge cases worry you?`
        : "\n\nWhat invariants must hold? What edge cases worry you?";
    return `Level 1 — Clarification.\n\nRestate **${problem.title}** in your own words. What are the inputs and outputs? What constraints does the problem impose on size, value range, or duplicates?${examplePart}`;
}

function level2(problem: SimplifiedProblem): string {
    const tags = problem.topicTags?.join(", ");
    const tagPart = tags
        ? ` The problem is tagged: \`${tags}\`. Which of those is the most natural fit?`
        : "";
    return `Level 2 — Approach.\n\nWhat data structure or algorithmic paradigm does this map onto?${tagPart}\n\nThink about the asymptotic cost of the obvious O(n²) brute force and what structure would let you get to O(n) or O(n log n) — without writing any code yet.`;
}

function level3(problem: SimplifiedProblem): string {
    const upstream = problem.hints?.[0]?.trim();
    const upstreamPart = upstream
        ? `\n\nLeetCode's own first hint:\n\n> ${upstream}`
        : "";
    return `Level 3 — Implementation sketch.\n\nNow draft the algorithm at pseudocode level. Walk through the data structures you'll allocate, the loop boundaries, what each iteration updates, and how you produce the final answer. Don't write language syntax yet — just the steps.${upstreamPart}`;
}

function level4(problem: SimplifiedProblem): string {
    return `Level 4 — Solution unlocked.\n\nThe session for **${problem.title}** has reached the maximum hint level. \`get_problem_solution\` and \`list_problem_solutions\` are now callable — prefer fetching the canonical solution over paraphrasing it.`;
}
