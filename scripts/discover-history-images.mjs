#!/usr/bin/env node
// Discover real Wikimedia Commons image URLs for each moment
// Uses Commons search API to find actual filenames
// Run: node scripts/discover-history-images.mjs

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchCommons(query, limit = 3) {
  await sleep(1500); // polite delay
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=${limit}&srprop=snippet&format=json`;
  const r = await fetch(url, { headers: { 'User-Agent': 'MatchdayHistoryBot/1.0 (educational)' } });
  if (!r.ok) { console.warn(`  429/err for: ${query}`); return []; }
  const d = await r.json();
  return (d.query?.search ?? []).map(s => s.title);
}

async function getImageUrl(fileTitle) {
  await sleep(800);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json`;
  const r = await fetch(url, { headers: { 'User-Agent': 'MatchdayHistoryBot/1.0 (educational)' } });
  if (!r.ok) return null;
  const d = await r.json();
  const pages = Object.values(d.query?.pages ?? {});
  return pages[0]?.imageinfo?.[0]?.url ?? null;
}

const SEARCHES = [
  ['1930-first-world-cup',    '1930 FIFA World Cup Uruguay'],
  ['1950-maracanazo',         'Maracanazo 1950 World Cup Uruguay Brazil'],
  ['1954-miracle-of-bern',    '1954 World Cup Final West Germany Hungary'],
  ['1958-pele-final',         'Pele 1958 World Cup Brazil'],
  ['1966-england-wins',       '1966 World Cup Final England Wembley'],
  ['1970-brazil-wins',        '1970 World Cup Final Brazil Italy'],
  ['1974-cruyff',             'Johan Cruyff 1974 Netherlands football'],
  ['1982-italy',              'Paolo Rossi 1982 World Cup Italy'],
  ['1986-hand-of-god',        'Maradona Hand of God 1986 World Cup'],
  ['1990-cameroon',           'Roger Milla 1990 World Cup Cameroon'],
  ['1994-baggio',             'Roberto Baggio 1994 World Cup penalty'],
  ['1998-france-wins',        'Zidane 1998 World Cup Final France'],
  ['1998-bergkamp',           'Dennis Bergkamp 1998 World Cup goal Argentina'],
  ['2002-senegal',            'Senegal France 2002 World Cup'],
  ['2002-brazil-wins',        'Ronaldo 2002 World Cup Final Brazil Germany'],
  ['2006-zidane',             'Zidane headbutt Materazzi 2006 World Cup Final'],
  ['2006-maxi',               'Maxi Rodriguez goal 2006 World Cup Argentina Mexico'],
  ['2010-spain-wins',         'Iniesta goal 2010 World Cup Final Spain Netherlands'],
  ['2014-van-persie',         'Robin van Persie header 2014 World Cup'],
  ['2014-james',              'James Rodriguez volley 2014 World Cup Colombia'],
  ['2014-germany-brazil-7-1', 'Germany Brazil 7-1 2014 World Cup semi final'],
  ['2014-germany-wins',       'Mario Gotze 2014 World Cup Final Germany Argentina'],
  ['2018-croatia',            '2018 World Cup semi final Croatia England'],
  ['2018-france',             '2018 World Cup Final France Croatia'],
  ['2022-saudi-argentina',    'Saudi Arabia Argentina 2022 World Cup'],
  ['2022-messi-trophy',       'Messi trophy 2022 World Cup Final Argentina France'],
];

console.log('Discovering real Commons image filenames...\n');

for (const [id, query] of SEARCHES) {
  console.log(`[${id}]`);
  const results = await searchCommons(query, 5);
  if (!results.length) {
    console.log('  → no results\n');
    continue;
  }
  for (const title of results) {
    const imgUrl = await getImageUrl(title);
    if (imgUrl) {
      console.log(`  ✓ ${title}`);
      console.log(`    ${imgUrl}`);
    } else {
      console.log(`  - ${title} (no URL)`);
    }
  }
  console.log('');
}
