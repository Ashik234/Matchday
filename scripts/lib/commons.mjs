// Wikimedia Commons file fetching + metadata.

import { createHash } from 'node:crypto';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const USER_AGENT = 'Matchday/1.0 (https://github.com/ashik-dignizant/matchday; ashik.k@dignizant.com)';

/**
 * Fetch metadata for a Commons file: categories, caption, attribution.
 */
export async function fetchFileMetadata(filename) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo|categories',
    titles: `File:${filename}`,
    iiprop: 'extmetadata|url|size',
    cllimit: '50',
    origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Commons meta ${res.status}`);
  const json = await res.json();
  const pages = json.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;
  const info = page.imageinfo?.[0] ?? {};
  const meta = info.extmetadata ?? {};
  return {
    filename,
    categories: (page.categories ?? []).map((c) => c.title.replace(/^Category:/, '')),
    caption: meta.ImageDescription?.value || '',
    attribution: meta.Artist?.value?.replace(/<[^>]+>/g, '').trim() || '',
    width: info.width,
    height: info.height,
  };
}

/**
 * Download a Commons file as a Buffer + return sha1 hash.
 */
export async function downloadFile(filename, { width = 800 } = {}) {
  const url = `${FILEPATH}/${encodeURIComponent(filename)}?width=${width}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Download ${filename} ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = createHash('sha1').update(buf).digest('hex');
  return { buffer: buf, hash };
}
