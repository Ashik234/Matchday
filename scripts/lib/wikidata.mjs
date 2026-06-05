// Wikidata SPARQL + entity helpers. Rate-limited and politely User-Agent'd.

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const ENTITY_API = 'https://www.wikidata.org/wiki/Special:EntityData';
const USER_AGENT = 'Matchday/1.0 (https://github.com/ashik-dignizant/matchday; ashik.k@dignizant.com)';
const MIN_DELAY_MS = 1100;

let lastCall = 0;
async function throttle() {
  const wait = MIN_DELAY_MS - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export async function sparqlQuery(query) {
  await throttle();
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
  });
  if (res.status === 429) {
    const retry = Number(res.headers.get('retry-after') || 5);
    await new Promise((r) => setTimeout(r, retry * 1000));
    return sparqlQuery(query);
  }
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${await res.text().catch(() => '')}`);
  const json = await res.json();
  return json.results.bindings;
}

/**
 * Find the QID for a player given name + country (Wikidata country QID).
 * Returns the first match; null if none.
 */
export async function findPlayerQid(name, countryQid) {
  const query = `
    SELECT ?player WHERE {
      ?player wdt:P31 wd:Q5;
              rdfs:label "${escapeSparqlString(name)}"@en;
              wdt:P1532 wd:${countryQid}.
    } LIMIT 1
  `;
  const rows = await sparqlQuery(query);
  if (!rows.length) return null;
  const uri = rows[0].player.value;            // http://www.wikidata.org/entity/Q12345
  return uri.split('/').pop();
}

/**
 * Fetch the full entity JSON for a QID, returning the raw data.
 */
export async function fetchEntity(qid) {
  await throttle();
  const res = await fetch(`${ENTITY_API}/${qid}.json`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Entity ${qid} ${res.status}`);
  const json = await res.json();
  return json.entities[qid];
}

/**
 * Pull all P18 image filenames from an entity.
 */
export function extractImageFilenames(entity) {
  const claims = entity.claims?.P18 ?? [];
  return claims
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter((v) => typeof v === 'string');
}

function escapeSparqlString(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
