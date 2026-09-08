/**
 * Rewrite an Strato materialized schema into a Monaco/JSON-Schema-safe shape.
 *
 * The materializer emits two non-standard pieces that Monaco's JSON validator does
 * not understand: `"type": "secret"` (a secret string field) and an
 * `x-strato-secret` extension keyword. This maps `secret` → `string` and drops
 * `x-strato-*` keys so the schema validates cleanly. Map fields already
 * materialize as standard `object` + `additionalProperties`, so they need no
 * special handling. The input is not mutated.
 */
export const sanitizeJsonSchemaForMonaco = (schema: unknown): unknown => {
    if (Array.isArray(schema)) {
        return schema.map(sanitizeJsonSchemaForMonaco);
    }
    if (schema === null || typeof schema !== 'object') {
        return schema;
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
        if (key.startsWith('x-strato')) continue;
        if (key === 'type' && value === 'secret') {
            out[key] = 'string';
            continue;
        }
        out[key] = sanitizeJsonSchemaForMonaco(value);
    }
    return out;
};
