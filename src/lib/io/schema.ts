/**
 * Zod schema for calendar export data.
 * Validates JSON import payloads before applying to calendar state.
 */

import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const dateStringSchema = z.string().regex(dateRegex, "Expected YYYY-MM-DD date format");

const dateRangeSchema = z.object({
	start: dateStringSchema,
	end: dateStringSchema,
});

const categorySchema = z.object({
	label: z.string(),
	color: z.string(),
	emoji: z.string(),
	dates: z.array(dateStringSchema),
	ranges: z.array(dateRangeSchema).optional(),
});

export const exportDataSchema = z.object({
	version: z.literal(1),
	exportDate: z.string(),
	categories: z.strictObject({
		oof: categorySchema,
		holiday: categorySchema,
		sick: categorySchema,
	}),
	settings: z
		.object({
			minOfficeDays: z.number().optional(),
			rollingWindowWeeks: z.number().optional(),
			bestWeeksCount: z.number().optional(),
			sickDaysPenalize: z.boolean().optional(),
			holidayPenalize: z.boolean().optional(),
			startingWeek: z.string().nullable().optional(),
			defaultPattern: z.array(z.number()).nullable().optional(),
			holidays: z
				.object({
					countryCode: z.string().nullable().optional(),
					holidaysAsOOF: z.boolean().optional(),
					companyName: z.string().nullable().optional(),
				})
				.optional(),
		})
		.optional(),
});

export type ExportData = z.infer<typeof exportDataSchema>;

/** Validate unknown data against the export schema */
export function validateExportData(data: unknown): {
	success: boolean;
	data?: ExportData;
	error?: string;
} {
	const result = exportDataSchema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, error: result.error.issues[0]?.message ?? "Validation failed" };
}
