import test from 'node:test';
import assert from 'node:assert/strict';
import { toCanvasExportError } from '../src/utils/canvasExport.js';

test('SecurityError dipetakan ke pesan Indonesia tanpa istilah Inggris', () => {
    const mapped = toCanvasExportError(new DOMException('The operation is insecure.', 'SecurityError'));
    assert.equal(mapped.name, 'CanvasExportError');
    assert.doesNotMatch(mapped.message, /insecure|operation/i);
    assert.match(mapped.message, /HTTPS atau localhost/);
});

test('pesan tainted canvas dari browser lain juga dipetakan', () => {
    const mapped = toCanvasExportError(new DOMException('Tainted canvases may not be exported.', 'SecurityError'));
    assert.equal(mapped.name, 'CanvasExportError');
    assert.doesNotMatch(mapped.message, /tainted/i);
});

test('error biasa diteruskan apa adanya', () => {
    const original = new Error('Gagal menghasilkan file gambar.');
    assert.equal(toCanvasExportError(original), original);
});
