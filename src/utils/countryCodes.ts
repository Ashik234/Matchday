const FIFA_TO_ISO: Record<string, string> = {
  ALG: 'dz', ARG: 'ar', AUS: 'au', AUT: 'at', BEL: 'be', BIH: 'ba',
  BRA: 'br', CPV: 'cv', CAN: 'ca', COL: 'co', CIV: 'ci', CRO: 'hr',
  CUW: 'cw', CZE: 'cz', COD: 'cd', ECU: 'ec', EGY: 'eg', ENG: 'gb-eng',
  FRA: 'fr', GER: 'de', GHA: 'gh', HAI: 'ht', IRN: 'ir', IRQ: 'iq',
  JPN: 'jp', JOR: 'jo', MEX: 'mx', MAR: 'ma', NED: 'nl', NZL: 'nz',
  NOR: 'no', PAN: 'pa', PAR: 'py', POR: 'pt', QAT: 'qa', KSA: 'sa',
  SCO: 'gb-sct', SEN: 'sn', RSA: 'za', KOR: 'kr', ESP: 'es', SWE: 'se',
  SUI: 'ch', TUN: 'tn', TUR: 'tr', URU: 'uy', USA: 'us', UZB: 'uz',
};

export function fifaToIso(code: string | undefined | null): string {
  if (!code) return 'xx';
  return FIFA_TO_ISO[code.toUpperCase()] ?? code.toLowerCase().slice(0, 2);
}

// Country full name → ISO (for API-Football responses which may return full name)
const NAME_TO_ISO: Record<string, string> = {
  Algeria: 'dz', Argentina: 'ar', Australia: 'au', Austria: 'at',
  Belgium: 'be', 'Bosnia & Herzegovina': 'ba', Brazil: 'br',
  'Cabo Verde': 'cv', Canada: 'ca', Colombia: 'co', "Côte d'Ivoire": 'ci',
  Croatia: 'hr', 'Curaçao': 'cw', Czechia: 'cz', 'DR Congo': 'cd',
  Ecuador: 'ec', Egypt: 'eg', England: 'gb-eng', France: 'fr',
  Germany: 'de', Ghana: 'gh', Haiti: 'ht', Iran: 'ir', Iraq: 'iq',
  Japan: 'jp', Jordan: 'jo', Mexico: 'mx', Morocco: 'ma',
  Netherlands: 'nl', 'New Zealand': 'nz', Norway: 'no', Panama: 'pa',
  Paraguay: 'py', Portugal: 'pt', Qatar: 'qa', 'Saudi Arabia': 'sa',
  Scotland: 'gb-sct', Senegal: 'sn', 'South Africa': 'za',
  'South Korea': 'kr', Korea: 'kr', 'Korea Republic': 'kr',
  Spain: 'es', Sweden: 'se', Switzerland: 'ch', Tunisia: 'tn',
  Türkiye: 'tr', Turkey: 'tr', Uruguay: 'uy', 'United States': 'us',
  USA: 'us', Uzbekistan: 'uz',
};

export function nameToIso(name: string | undefined | null): string {
  if (!name) return 'xx';
  return NAME_TO_ISO[name] ?? name.toLowerCase().slice(0, 2);
}
