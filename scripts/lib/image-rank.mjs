// Rank Wikidata image candidates by likelihood of being a national-team photo.
// Pure functions — no I/O. Imported by the scraper and the test suite.

const NATIONAL_TEAM_PATTERNS = [
  /national[\s_-]?team/i,
  /\bcap(s|ped)?\b/i,
];
const TOURNAMENT_PATTERNS = [
  /world[\s_-]?cup/i,
  /\beuro\s?\d{4}/i,
  /copa[\s_-]?america/i,
  /africa[\s_-]?cup/i,
  /asian[\s_-]?cup/i,
];
const TRAINING_PATTERNS = [/training/i, /practice/i];

const CLUB_CATEGORY_PATTERN = /\b(FC|CF|AFC|United|City|Real|Bayern|Athletic|Atletico|club|Liga)\b/i;

function hasAny(text, patterns) {
  return patterns.some((re) => re.test(text));
}

function classifyCandidate(candidate, { country, countryAdjective }) {
  const filename = candidate.filename || '';
  const caption = candidate.caption || '';
  const categories = candidate.categories || [];
  const haystack = `${filename} ${caption} ${categories.join(' ')}`;

  const mentionsCountry =
    new RegExp(`\\b${escapeRe(country)}\\b`, 'i').test(haystack) ||
    new RegExp(`\\b${escapeRe(countryAdjective)}\\b`, 'i').test(haystack);

  const onlyClubCategories =
    categories.length > 0 &&
    categories.every((c) => CLUB_CATEGORY_PATTERN.test(c) && !/national/i.test(c));

  if (onlyClubCategories && !mentionsCountry) return null;

  if (hasAny(haystack, NATIONAL_TEAM_PATTERNS) && mentionsCountry) {
    return 'wikidata-national-team';
  }
  if (hasAny(haystack, TOURNAMENT_PATTERNS)) {
    return 'wikidata-tournament';
  }
  if (hasAny(haystack, TRAINING_PATTERNS) && mentionsCountry) {
    return 'wikidata-national-team-training';
  }
  return 'wikidata-portrait';
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SOURCE_PRIORITY = {
  'wikidata-national-team': 0,
  'wikidata-tournament': 1,
  'wikidata-national-team-training': 2,
  'wikidata-portrait': 3,
};

export function rankImageCandidates(candidates, context) {
  const labeled = [];
  for (const c of candidates) {
    const source = classifyCandidate(c, context);
    if (source === null) continue;
    labeled.push({ ...c, source });
  }
  labeled.sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]);
  return labeled;
}
