import {describe, expect, it} from 'vitest';
import {entriesToObject, objectToEntries} from './map-field';

describe('map-field', () => {
    it('objectToEntries converts a record to ordered entries', () => {
        expect(objectToEntries({a: '1', b: '2'})).toEqual([
            {key: 'a', value: '1'},
            {key: 'b', value: '2'},
        ]);
    });

    it('objectToEntries returns [] for non-objects', () => {
        expect(objectToEntries(null)).toEqual([]);
        expect(objectToEntries(undefined)).toEqual([]);
        expect(objectToEntries(['x'])).toEqual([]);
        expect(objectToEntries('s')).toEqual([]);
    });

    it('entriesToObject serializes entries; last occurrence wins on duplicate keys', () => {
        expect(entriesToObject([{key: 'a', value: '1'}, {key: 'a', value: '2'}])).toEqual({a: '2'});
    });

    it('entriesToObject omits empty and whitespace-only keys and trims keys', () => {
        expect(entriesToObject([
            {key: '', value: 'x'},
            {key: '   ', value: 'y'},
            {key: ' b ', value: 'z'},
        ])).toEqual({b: 'z'});
    });

    it('round-trips object -> entries -> object', () => {
        const obj = {DIA_PARTY_API: 'FXC(bw-party)', DIA_MESSAGING_API: 'FXC(bw-messaging)'};
        expect(entriesToObject(objectToEntries(obj))).toEqual(obj);
    });
});
