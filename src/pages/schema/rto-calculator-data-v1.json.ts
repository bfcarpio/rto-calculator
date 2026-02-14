import { toJSONSchema } from "zod";
import { exportDataSchema } from "../../lib/io/schema";

export function GET() {
	const jsonSchema = toJSONSchema(exportDataSchema);
	return new Response(JSON.stringify(jsonSchema, null, 2), {
		headers: { "Content-Type": "application/schema+json" },
	});
}
