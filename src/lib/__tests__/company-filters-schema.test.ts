import { z } from "zod";
import { describe, expect, it } from "vitest";
import companyFilters from "../holiday/data/company-filters.json";

const extraHolidaySchema = z.union([
	z.object({
		name: z.string(),
		month: z.number().int().min(1).max(12),
		day: z.number().int().min(1).max(31),
	}).strict(),
	z.object({
		name: z.string(),
		after: z.string(),
	}).strict(),
]);

const companyEntrySchema = z.object({
	holidays: z.array(z.string()),
	extra: z.array(extraHolidaySchema).optional(),
}).strict();

const countryEntrySchema = z.object({
	name: z.string(),
	companies: z.record(z.string(), companyEntrySchema),
}).strict();

const companyFiltersSchema = z.record(z.string(), z.union([
	countryEntrySchema,
	z.string(), // $schema key
]));

describe("company-filters.json schema validation", () => {
	it("should be valid against the zod schema", () => {
		const result = companyFiltersSchema.safeParse(companyFilters);
		if (!result.success) {
			console.error(result.error.issues);
		}
		expect(result.success).toBe(true);
	});
});
