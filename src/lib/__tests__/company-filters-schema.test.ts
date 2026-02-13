import Ajv from "ajv";
import { describe, expect, it } from "vitest";
import companyFilters from "../holiday/data/company-filters.json";
import companyFiltersSchema from "../holiday/data/company-filters.schema.json";

describe("company-filters.json schema validation", () => {
	const ajv = new Ajv();
	const validate = ajv.compile(companyFiltersSchema);

	it("should be valid against the JSON schema", () => {
		const valid = validate(companyFilters);
		expect(validate.errors).toBeNull();
		expect(valid).toBe(true);
	});
});
