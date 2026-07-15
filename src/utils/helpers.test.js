import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImageUrl } from './helpers.js';

test('normalizes Google Drive share links into thumbnail URLs', () => {
  assert.equal(
    normalizeImageUrl('https://drive.google.com/file/d/abc123/view?usp=sharing'),
    'https://drive.google.com/thumbnail?id=abc123'
  );
});

test('converts existing Google Drive file URLs into thumbnail URLs', () => {
  assert.equal(
    normalizeImageUrl('https://drive.google.com/uc?export=download&id=abc123'),
    'https://drive.google.com/thumbnail?id=abc123'
  );
});

test('leaves regular image URLs unchanged', () => {
  const url = 'https://example.com/logo.png';
  assert.equal(normalizeImageUrl(url), url);
});
