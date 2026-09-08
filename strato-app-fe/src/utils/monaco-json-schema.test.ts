import {describe, expect, it} from 'vitest';
import {sanitizeJsonSchemaForMonaco} from './monaco-json-schema';

describe('sanitizeJsonSchemaForMonaco', () => {
    it('rewrites type "secret" to "string"', () => {
        expect(sanitizeJsonSchemaForMonaco({type: 'secret'})).toEqual({type: 'string'});
    });

    it('drops x-strato-* extension keys', () => {
        expect(sanitizeJsonSchemaForMonaco({type: 'string', 'x-strato-secret': true}))
            .toEqual({type: 'string'});
    });

    it('recurses into nested properties and additionalProperties', () => {
        const input = {
            type: 'object',
            properties: {
                sectionA: {
                    type: 'object',
                    additionalProperties: {
                        type: 'object',
                        properties: {
                            token: {type: 'secret', 'x-strato-secret': true},
                            name: {type: 'string'},
                        },
                    },
                },
            },
        };
        const expected = {
            type: 'object',
            properties: {
                sectionA: {
                    type: 'object',
                    additionalProperties: {
                        type: 'object',
                        properties: {
                            token: {type: 'string'},
                            name: {type: 'string'},
                        },
                    },
                },
            },
        };
        expect(sanitizeJsonSchemaForMonaco(input)).toEqual(expected);
    });

    it('handles arrays of subschemas', () => {
        expect(sanitizeJsonSchemaForMonaco({anyOf: [{type: 'secret'}, {type: 'number'}]}))
            .toEqual({anyOf: [{type: 'string'}, {type: 'number'}]});
    });

    it('does not mutate the input', () => {
        const input = {type: 'secret', 'x-strato-secret': true};
        const copy = JSON.parse(JSON.stringify(input));
        sanitizeJsonSchemaForMonaco(input);
        expect(input).toEqual(copy);
    });

    it('passes primitives through unchanged', () => {
        expect(sanitizeJsonSchemaForMonaco('x')).toBe('x');
        expect(sanitizeJsonSchemaForMonaco(5)).toBe(5);
        expect(sanitizeJsonSchemaForMonaco(null)).toBe(null);
    });
});
