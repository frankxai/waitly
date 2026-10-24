import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cn } from './utils.ts';

describe('cn', () => {
    it('merges multiple classes correctly', () => {
        assert.strictEqual(cn('class1', 'class2'), 'class1 class2');
    });

    it('merges tailwind classes properly using tailwind-merge', () => {
        // px-2 py-1 and p-4 conflict, p-4 should win
        assert.strictEqual(cn('px-2 py-1', 'p-4'), 'p-4');
    });

    it('handles conditional classes', () => {
        assert.strictEqual(cn('base-class', true && 'active-class', false && 'inactive-class'), 'base-class active-class');
    });

    it('handles arrays and objects', () => {
        assert.strictEqual(cn(['class-a', 'class-b'], { 'class-c': true, 'class-d': false }), 'class-a class-b class-c');
    });
});
