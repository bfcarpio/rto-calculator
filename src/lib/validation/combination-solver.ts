/**
 * Combination Solver
 *
 * Pure functions for WFH combination analysis.
 * - computeBestKAverage + getTwoGroupCombinations: shipped to browser (used by WindowExplorer)
 * - enumerateAllCombinations: test-only (recursive stars-and-bars enumeration)
 */

export interface SolverConfig {
	windowSize: number; // default 12
	bestWeeksCount: number; // default 8
	minOfficeDays: number; // default 3
	totalWeekdays: number; // default 5
}

export interface WfhCombination {
	/** distribution[i] = number of weeks with exactly i WFH days */
	distribution: number[];
	bestKAverage: number;
	isValid: boolean;
}

export interface TwoGroupCombo {
	groupA: { weeks: number; wfhDays: number; officeDays: number };
	groupB: { weeks: number; wfhDays: number; officeDays: number };
	bestKAverage: number;
	isValid: boolean;
}

export const DEFAULT_SOLVER_CONFIG: SolverConfig = {
	windowSize: 12,
	bestWeeksCount: 8,
	minOfficeDays: 3,
	totalWeekdays: 5,
};

/**
 * Compute best-K average office days from a WFH distribution.
 *
 * Greedily assigns weeks starting from lowest WFH days (highest office days)
 * to the best-K set.
 */
export function computeBestKAverage(
	distribution: number[],
	config: SolverConfig,
): number {
	const K = config.bestWeeksCount;
	let totalOfficeDays = 0;
	let weeksAssigned = 0;

	// Iterate from 0 WFH days (most office days) upward
	for (let wfh = 0; wfh < distribution.length && weeksAssigned < K; wfh++) {
		const officeDays = config.totalWeekdays - wfh;
		const weeksAtThisLevel = Math.min(distribution[wfh] ?? 0, K - weeksAssigned);
		totalOfficeDays += weeksAtThisLevel * officeDays;
		weeksAssigned += weeksAtThisLevel;
	}

	return weeksAssigned > 0 ? totalOfficeDays / K : 0;
}

/**
 * Generate all 2-group combinations: "X weeks at A WFH + Y weeks at B WFH"
 * where A < B and X + Y = windowSize.
 *
 * Lightweight alternative to full enumeration — shipped to browser.
 */
export function getTwoGroupCombinations(
	config: SolverConfig = DEFAULT_SOLVER_CONFIG,
): TwoGroupCombo[] {
	const results: TwoGroupCombo[] = [];
	const W = config.windowSize;
	const maxWfh = config.totalWeekdays;

	for (let wfhA = 0; wfhA <= maxWfh; wfhA++) {
		for (let wfhB = wfhA + 1; wfhB <= maxWfh; wfhB++) {
			for (let countA = 1; countA < W; countA++) {
				const countB = W - countA;
				const distribution = new Array(maxWfh + 1).fill(0);
				distribution[wfhA] = countA;
				distribution[wfhB] = countB;

				const bestKAvg = computeBestKAverage(distribution, config);
				results.push({
					groupA: {
						weeks: countA,
						wfhDays: wfhA,
						officeDays: config.totalWeekdays - wfhA,
					},
					groupB: {
						weeks: countB,
						wfhDays: wfhB,
						officeDays: config.totalWeekdays - wfhB,
					},
					bestKAverage: bestKAvg,
					isValid: bestKAvg >= config.minOfficeDays,
				});
			}
		}
	}

	return results;
}
