/**
 * Test-only: exhaustive combination enumeration via stars-and-bars.
 *
 * Not shipped to the browser — only imported by test files.
 */

import {
	computeBestKAverage,
	DEFAULT_SOLVER_CONFIG,
	type SolverConfig,
	type WfhCombination,
} from "../../validation/combination-solver";

/**
 * Enumerate all valid distributions of W weeks across (totalWeekdays+1) WFH levels
 * using recursive stars-and-bars.
 *
 * Each distribution is an array where distribution[i] = number of weeks with i WFH days.
 * Sum of distribution must equal windowSize.
 *
 * For defaults: C(12+5, 5) = C(17,5) = 6188 combinations.
 */
export function enumerateAllCombinations(
	config: SolverConfig = DEFAULT_SOLVER_CONFIG,
): WfhCombination[] {
	const results: WfhCombination[] = [];
	const levels = config.totalWeekdays + 1; // 0..totalWeekdays WFH days
	const distribution = new Array(levels).fill(0);

	function recurse(level: number, remaining: number): void {
		if (level === levels - 1) {
			distribution[level] = remaining;
			const bestKAvg = computeBestKAverage(distribution, config);
			results.push({
				distribution: [...distribution],
				bestKAverage: bestKAvg,
				isValid: bestKAvg >= config.minOfficeDays,
			});
			return;
		}
		for (let count = 0; count <= remaining; count++) {
			distribution[level] = count;
			recurse(level + 1, remaining - count);
		}
	}

	recurse(0, config.windowSize);
	return results;
}

/** Filter to only valid combinations */
export function getValidCombinations(
	config: SolverConfig = DEFAULT_SOLVER_CONFIG,
): WfhCombination[] {
	return enumerateAllCombinations(config).filter((c) => c.isValid);
}
