import { Helmet } from 'react-helmet-async';

const TITLE = 'Matchday — FIFA World Cup 2026 Companion';
const DESCRIPTION =
  'Live scores, group standings, bracket, and the road to the Final. The premium World Cup 2026 companion.';

export function HeadTags() {
  return (
    <Helmet>
      <title>{TITLE}</title>
      <meta name="description" content={DESCRIPTION} />
      <meta property="og:title" content={TITLE} />
      <meta property="og:description" content={DESCRIPTION} />
      <meta property="og:image" content="/og-image.png" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={TITLE} />
      <meta name="twitter:description" content={DESCRIPTION} />
      <meta name="twitter:image" content="/og-image.png" />
      <meta name="theme-color" content="#0A1428" />
    </Helmet>
  );
}
