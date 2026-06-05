import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankImageCandidates } from '../lib/image-rank.mjs';

test('prefers national-team image over generic portrait', () => {
  const candidates = [
    { filename: 'Lionel_Messi_2018.jpg', categories: ['Lionel Messi'] },
    { filename: 'Messi_Argentina_national_team_2022.jpg', categories: ['Argentina national football team players'] },
  ];
  const ranked = rankImageCandidates(candidates, { country: 'Argentina', countryAdjective: 'Argentine' });
  assert.equal(ranked[0].filename, 'Messi_Argentina_national_team_2022.jpg');
  assert.equal(ranked[0].source, 'wikidata-national-team');
});

test('detects national team via filename keyword "world cup"', () => {
  const candidates = [
    { filename: 'Mbappe_World_Cup_2022_final.jpg', categories: ['France footballers'] },
  ];
  const ranked = rankImageCandidates(candidates, { country: 'France', countryAdjective: 'French' });
  assert.equal(ranked[0].source, 'wikidata-tournament');
});

test('detects training image when caption mentions training and country', () => {
  const candidates = [
    { filename: 'Vinicius_training_Brazil_2024.jpg', categories: [], caption: 'training session with Brazil' },
  ];
  const ranked = rankImageCandidates(candidates, { country: 'Brazil', countryAdjective: 'Brazilian' });
  assert.equal(ranked[0].source, 'wikidata-national-team-training');
});

test('rejects images that have ONLY club categories', () => {
  const candidates = [
    { filename: 'player.jpg', categories: ['Real Madrid CF players'] },
  ];
  const ranked = rankImageCandidates(candidates, { country: 'Brazil', countryAdjective: 'Brazilian' });
  assert.equal(ranked.length, 0);
});

test('falls back to wikidata-portrait when no national signal', () => {
  const candidates = [
    { filename: 'random_photo.jpg', categories: ['Wikipedia featured pictures'] },
  ];
  const ranked = rankImageCandidates(candidates, { country: 'Spain', countryAdjective: 'Spanish' });
  assert.equal(ranked[0].source, 'wikidata-portrait');
});

test('returns empty array when given empty array', () => {
  assert.deepEqual(rankImageCandidates([], { country: 'X', countryAdjective: 'X' }), []);
});
