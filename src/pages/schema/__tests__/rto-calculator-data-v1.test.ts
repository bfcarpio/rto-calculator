import { describe, expect, it } from "vitest";
import { GET } from "../rto-calculator-data-v1.json";

describe("JSON Schema endpoint", () => {
	it("returns a Response with schema+json content type", async () => {
		const response = GET();
		expect(response).toBeInstanceOf(Response);
		expect(response.headers.get("Content-Type")).toBe(
			"application/schema+json",
		);
	});

	it("returns valid JSON", async () => {
		const schema = JSON.parse(await GET().text());
		expect(schema).toHaveProperty("type", "object");
		expect(schema).toHaveProperty("properties");
	});

	it("requires version, exportDate, and categories", async () => {
		const schema = JSON.parse(await GET().text());
		expect(schema.required).toContain("version");
		expect(schema.required).toContain("exportDate");
		expect(schema.required).toContain("categories");
	});

	it("has category properties for oof, holiday, and sick", async () => {
		const schema = JSON.parse(await GET().text());
		const catProps = schema.properties.categories.properties;
		expect(catProps).toHaveProperty("oof");
		expect(catProps).toHaveProperty("holiday");
		expect(catProps).toHaveProperty("sick");
	});

	it("validates a correct export payload against the schema", async () => {
		const schema = JSON.parse(await GET().text());
		// version must be const 1
		expect(schema.properties.version.const).toBe(1);
		// exportDate must be string
		expect(schema.properties.exportDate.type).toBe("string");
		// dates must be array of strings with pattern
		const oofDates =
			schema.properties.categories.properties.oof.properties.dates;
		expect(oofDates.type).toBe("array");
		expect(oofDates.items.type).toBe("string");
		expect(oofDates.items.pattern).toBeDefined();
	});

	it("marks settings as optional", async () => {
		const schema = JSON.parse(await GET().text());
		const required: string[] = schema.required ?? [];
		expect(required).not.toContain("settings");
	});
});
