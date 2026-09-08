import {describe, expect, it} from 'vitest';
import {mergeConfigData, applyResolutions, resolutionKey} from './configMerge';
import {ConfigurationData} from '../../../models/configuration.model';

const leaf = (v: unknown): ConfigurationData =>
    v === undefined ? {} : {sec: {item: {field: v}}};

describe('mergeConfigData — leaf matrix', () => {
    it('all equal — unchanged, no conflict', () => {
        const r = mergeConfigData(leaf('x'), leaf('x'), leaf('x'));
        expect(r.conflicts).toEqual([]);
        expect(r.merged).toEqual(leaf('x'));
    });

    it('ours unchanged, theirs changed — take theirs', () => {
        const r = mergeConfigData(leaf('x'), leaf('x'), leaf('y'));
        expect(r.conflicts).toEqual([]);
        expect(r.merged).toEqual(leaf('y'));
    });

    it('ours changed, theirs unchanged — take ours', () => {
        const r = mergeConfigData(leaf('x'), leaf('y'), leaf('x'));
        expect(r.conflicts).toEqual([]);
        expect(r.merged).toEqual(leaf('y'));
    });

    it('both changed to same value — auto, no conflict', () => {
        const r = mergeConfigData(leaf('x'), leaf('y'), leaf('y'));
        expect(r.conflicts).toEqual([]);
        expect(r.merged).toEqual(leaf('y'));
    });

    it('both changed to different values — conflict, merged keeps ours', () => {
        const r = mergeConfigData(leaf('x'), leaf('y'), leaf('z'));
        expect(r.conflicts).toHaveLength(1);
        expect(r.conflicts[0]).toEqual({
            path: ['sec', 'item', 'field'], base: 'x', ours: 'y', theirs: 'z',
        });
        expect(r.merged).toEqual(leaf('y'));
    });

    it('ours added, theirs absent — keep ours', () => {
        const r = mergeConfigData(leaf(undefined), leaf('x'), leaf(undefined));
        expect(r.conflicts).toEqual([]);
        expect(r.merged).toEqual(leaf('x'));
    });

    it('theirs added, ours absent — keep theirs', () => {
        const r = mergeConfigData(leaf(undefined), leaf(undefined), leaf('y'));
        expect(r.conflicts).toEqual([]);
        expect(r.merged).toEqual(leaf('y'));
    });

    it('both added different values — conflict', () => {
        const r = mergeConfigData(leaf(undefined), leaf('x'), leaf('y'));
        expect(r.conflicts).toHaveLength(1);
        expect(r.merged).toEqual(leaf('x'));
    });

    it('ours deleted, theirs unchanged — take deletion', () => {
        const r = mergeConfigData(leaf('x'), leaf(undefined), leaf('x'));
        expect(r.conflicts).toEqual([]);
        expect(r.merged).toEqual(leaf(undefined));
    });

    it('theirs deleted, ours unchanged — take deletion', () => {
        const r = mergeConfigData(leaf('x'), leaf('x'), leaf(undefined));
        expect(r.conflicts).toEqual([]);
        expect(r.merged).toEqual(leaf(undefined));
    });

    it('we deleted, they edited — conflict', () => {
        const r = mergeConfigData(leaf('x'), leaf(undefined), leaf('y'));
        expect(r.conflicts).toHaveLength(1);
        expect(r.conflicts[0]).toMatchObject({base: 'x', ours: undefined, theirs: 'y'});
    });

    it('we edited, they deleted — conflict', () => {
        const r = mergeConfigData(leaf('x'), leaf('y'), leaf(undefined));
        expect(r.conflicts).toHaveLength(1);
        expect(r.conflicts[0]).toMatchObject({base: 'x', ours: 'y', theirs: undefined});
    });
});

describe('mergeConfigData — deep equality on object/array values', () => {
    const obj = (v: unknown): ConfigurationData => ({sec: {item: {field: v}}});

    it('treats deeply equal nested objects as unchanged', () => {
        const r = mergeConfigData(
            obj({a: 1, b: [1, 2]}),
            obj({a: 1, b: [1, 2]}),
            obj({a: 1, b: [1, 2]}),
        );
        expect(r.conflicts).toEqual([]);
    });

    it('reports conflict when nested object differs', () => {
        const r = mergeConfigData(
            obj({a: 1}),
            obj({a: 2}),
            obj({a: 3}),
        );
        expect(r.conflicts).toHaveLength(1);
    });
});

describe('mergeConfigData — multi-leaf scenarios', () => {
    it('different leaves: one auto-takes theirs, one auto-takes ours, one conflicts', () => {
        const base: ConfigurationData = {sec: {item: {a: 1, b: 2, c: 3}}};
        const ours: ConfigurationData = {sec: {item: {a: 1, b: 22, c: 33}}};
        const theirs: ConfigurationData = {sec: {item: {a: 11, b: 2, c: 333}}};
        const r = mergeConfigData(base, ours, theirs);
        expect(r.conflicts).toHaveLength(1);
        expect(r.conflicts[0].path).toEqual(['sec', 'item', 'c']);
        expect(r.merged).toEqual({sec: {item: {a: 11, b: 22, c: 33}}});
    });

    it('item-level add: only on theirs — auto-take', () => {
        const base: ConfigurationData = {sec: {existing: {a: 1}}};
        const ours: ConfigurationData = {sec: {existing: {a: 1}}};
        const theirs: ConfigurationData = {sec: {existing: {a: 1}, newItem: {x: 9}}};
        const r = mergeConfigData(base, ours, theirs);
        expect(r.conflicts).toEqual([]);
        expect(r.merged).toEqual(theirs);
    });

    it('section-level add: only on ours — keep ours', () => {
        const base: ConfigurationData = {};
        const ours: ConfigurationData = {newSection: {item: {a: 1}}};
        const theirs: ConfigurationData = {};
        const r = mergeConfigData(base, ours, theirs);
        expect(r.conflicts).toEqual([]);
        expect(r.merged).toEqual(ours);
    });
});

describe('applyResolutions', () => {
    it('takes theirs when chosen', () => {
        const conflict = {path: ['s', 'i', 'f'] as [string, string, string], base: 'x', ours: 'y', theirs: 'z'};
        const merged: ConfigurationData = {s: {i: {f: 'y'}}};
        const result = applyResolutions(merged, [conflict], {
            [resolutionKey(['s', 'i', 'f'])]: {choice: 'theirs'},
        });
        expect(result).toEqual({s: {i: {f: 'z'}}});
    });

    it('takes manual value', () => {
        const conflict = {path: ['s', 'i', 'f'] as [string, string, string], base: 'x', ours: 'y', theirs: 'z'};
        const merged: ConfigurationData = {s: {i: {f: 'y'}}};
        const result = applyResolutions(merged, [conflict], {
            [resolutionKey(['s', 'i', 'f'])]: {choice: 'manual', value: 'custom'},
        });
        expect(result).toEqual({s: {i: {f: 'custom'}}});
    });

    it('keep-ours leaves merged unchanged', () => {
        const conflict = {path: ['s', 'i', 'f'] as [string, string, string], base: 'x', ours: 'y', theirs: 'z'};
        const merged: ConfigurationData = {s: {i: {f: 'y'}}};
        const result = applyResolutions(merged, [conflict], {
            [resolutionKey(['s', 'i', 'f'])]: {choice: 'ours'},
        });
        expect(result).toEqual({s: {i: {f: 'y'}}});
    });

    it('take-theirs with undefined removes the leaf', () => {
        const conflict = {path: ['s', 'i', 'f'] as [string, string, string], base: 'x', ours: 'y', theirs: undefined};
        const merged: ConfigurationData = {s: {i: {f: 'y'}}};
        const result = applyResolutions(merged, [conflict], {
            [resolutionKey(['s', 'i', 'f'])]: {choice: 'theirs'},
        });
        expect(result).toEqual({});
    });
});
