import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  let html;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch URL: ' + err.message });
  }

  const $ = cheerio.load(html);
  const fixtures = [];

  // ── Strategy: scan every <table> and look for columns we care about ──
  const COL_KEYWORDS = {
    date:   ['date'],
    time:   ['time'],
    team1:  ['home', 'team one', 'team 1', 'team1'],
    team2:  ['away', 'team two', 'team 2', 'team2', 'visitor'],
    ground: ['ground', 'venue', 'location', 'field'],
    series: ['series', 'league', 'division', 'tournament'],
    matchNo:['#', 'match', 'no.', 'number'],
  };

  function matchKey(header) {
    const h = header.toLowerCase().trim();
    for (const [key, keywords] of Object.entries(COL_KEYWORDS)) {
      if (keywords.some(k => h.includes(k))) return key;
    }
    return null;
  }

  $('table').each((_, table) => {
    const headers = [];
    const colMap = {};

    // Find header row (th elements, or first tr)
    const headerRow = $(table).find('thead tr').first();
    const cells = headerRow.length
      ? headerRow.find('th, td')
      : $(table).find('tr').first().find('th, td');

    cells.each((i, cell) => {
      const text = $(cell).text().trim();
      headers.push(text);
      const key = matchKey(text);
      if (key) colMap[key] = i;
    });

    // Need at least date and two teams to be a schedule table
    if (!colMap.date || (!colMap.team1 && !colMap.team2)) return;

    // Parse data rows
    const rows = $(table).find('tbody tr');
    if (!rows.length) return;

    rows.each((_, row) => {
      const tds = $(row).find('td');
      if (tds.length < 3) return;

      const get = key => (colMap[key] !== undefined ? $(tds[colMap[key]]).text().trim() : '');

      const rawDate = get('date');
      if (!rawDate) return;

      // Parse date formats: MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, "Apr 11, 2026", etc.
      let parsedDate = '';
      const mdyMatch = rawDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const isoMatch = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);
      const textMatch = rawDate.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);

      if (mdyMatch) {
        const [, m, d, y] = mdyMatch;
        parsedDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      } else if (isoMatch) {
        parsedDate = isoMatch[0];
      } else if (textMatch) {
        const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                         jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
        const mo = months[textMatch[1].toLowerCase().slice(0,3)];
        if (mo) parsedDate = `${textMatch[3]}-${mo}-${textMatch[2].padStart(2,'0')}`;
      }

      if (!parsedDate) return;

      const team1 = get('team1');
      const team2 = get('team2');
      if (!team1 || !team2) return;

      const matchNo = get('matchNo');
      const fixture = {
        match_number: matchNo,
        date:         parsedDate,
        time:         get('time'),
        ground:       get('ground'),
        series_name:  get('series'),
        team1,
        team2,
        // Stable external_id for upsert
        external_id: `${parsedDate}-${team1.replace(/\s+/g,'-')}-${team2.replace(/\s+/g,'-')}`,
        source_url:  url,
      };
      fixtures.push(fixture);
    });
  });

  if (fixtures.length === 0) {
    return res.status(200).json({
      fixtures: [],
      warning: 'No fixtures found. The page structure may differ — try importing via CSV instead.',
    });
  }

  return res.status(200).json({ fixtures });
}
