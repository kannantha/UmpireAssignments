import { useState, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import Papa from 'papaparse';

export default function LoadGames() {
  const [url, setUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [preview, setPreview] = useState([]);
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  // ── Scrape from URL ─────────────────────────────────────────────────────────
  async function handleScrape(e) {
    e.preventDefault();
    setScraping(true);
    setPreview([]);
    setWarning('');
    setResult(null);

    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    setScraping(false);

    if (data.error) {
      setWarning(data.error);
      return;
    }
    setPreview(data.fixtures || []);
    if (data.warning) setWarning(data.warning);
  }

  // ── Import CSV ──────────────────────────────────────────────────────────────
  function handleCsvFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setWarning('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        // Normalise column names (the fixture.csv uses quoted headers)
        const fixtures = data.map((row, i) => {
          // Handle both quoted and unquoted header names
          const get = (...keys) => {
            for (const k of keys) {
              const found = Object.entries(row).find(
                ([col]) => col.trim().replace(/"/g, '').toLowerCase() === k.toLowerCase()
              );
              if (found && found[1]?.trim()) return found[1].trim();
            }
            return '';
          };

          const rawDate = get('Date', 'date');
          // Convert MM/DD/YYYY → YYYY-MM-DD
          let parsedDate = rawDate;
          const m = rawDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (m) parsedDate = `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;

          const team1 = get('Team One', 'team1', 'home');
          const team2 = get('Team Two', 'team2', 'away');

          if (!parsedDate || !team1 || !team2) return null;

          return {
            match_number: get('#', 'match number', 'match_number'),
            date:         parsedDate,
            time:         get('Time', 'time'),
            ground:       get('Ground', 'ground', 'venue'),
            series_name:  get('Series', 'series', 'league'),
            division:     get('Division', 'division'),
            match_type:   get('Match Type', 'type'),
            team1,
            team2,
            external_id:  `${parsedDate}-${team1.replace(/\s+/g,'-')}-${team2.replace(/\s+/g,'-')}`,
            source_url:   'csv-import',
          };
        }).filter(Boolean);

        setPreview(fixtures);
        if (fixtures.length === 0) setWarning('No valid rows found in CSV.');
      },
      error: (err) => setWarning('CSV parse error: ' + err.message),
    });
  }

  // ── Save to Supabase ────────────────────────────────────────────────────────
  async function handleSave() {
    if (!preview.length) return;
    setSaving(true);
    setResult(null);

    // Upsert on external_id so re-importing updates instead of duplicating
    const { data, error } = await supabase
      .from('fixtures')
      .upsert(preview, { onConflict: 'external_id', ignoreDuplicates: false })
      .select();

    setSaving(false);
    if (error) {
      setResult({ ok: false, message: error.message });
    } else {
      setResult({ ok: true, message: `${data.length} fixture(s) saved successfully.` });
      setPreview([]);
      setUrl('');
    }
  }

  return (
    <AdminLayout title="Load Games">
      {/* URL Scraper */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Scrape from CricClubs URL</h2>
        <p className="text-sm text-gray-500 mb-4">
          Paste a CricClubs schedule URL and we'll pull the fixtures automatically.
        </p>
        <form onSubmit={handleScrape} className="flex gap-2 flex-col sm:flex-row">
          <input
            type="url"
            className="input flex-1"
            placeholder="https://cricclubs.com/.../viewLeagueSchedule.do?league=…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={scraping}>
            {scraping ? 'Fetching…' : 'Fetch Fixtures'}
          </button>
        </form>
      </div>

      {/* CSV Import */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Import from CSV</h2>
        <p className="text-sm text-gray-500 mb-4">
          Import a CSV exported from CricClubs. Expected columns: #, Series, Division, Match Type,
          Date (MM/DD/YYYY), Time, Team One, Team Two, Ground.
        </p>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleCsvFile}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileRef.current?.click()}
          >
            Choose CSV File
          </button>
          <span className="text-sm text-gray-400">or drag to upload</span>
        </div>
      </div>

      {/* Warning / result */}
      {warning && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md px-4 py-3 mb-4">
          ⚠️ {warning}
        </div>
      )}
      {result && (
        <div className={`border text-sm rounded-md px-4 py-3 mb-4 ${
          result.ok
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {result.ok ? '✅' : '❌'} {result.message}
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Preview — {preview.length} fixture{preview.length !== 1 ? 's' : ''}
              </h2>
              <p className="text-sm text-gray-500">
                Review below, then click Save. Existing fixtures (same date + teams) will be updated.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : `Save ${preview.length} Fixture${preview.length !== 1 ? 's' : ''}`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['#','Date','Time','Team 1','Team 2','Ground','Series'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((f, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{f.match_number || i+1}</td>
                    <td className="px-4 py-3 font-medium">{f.date}</td>
                    <td className="px-4 py-3">{f.time}</td>
                    <td className="px-4 py-3 font-medium">{f.team1}</td>
                    <td className="px-4 py-3 font-medium">{f.team2}</td>
                    <td className="px-4 py-3 text-gray-600">{f.ground}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{f.series_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
