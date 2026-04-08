import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';

function FixtureModal({ fixture, umpires, onClose, onSaved }) {
  const isNew = !fixture?.id;
  const [form, setForm] = useState(
    fixture ?? {
      match_number: '', date: '', time: '9:00 AM',
      ground: '', series_name: '', team1: '', team2: '',
    }
  );
  const [umpire1Id, setUmpire1Id] = useState('');
  const [umpire2Id, setUmpire2Id] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fixture?.id) return;
    supabase
      .from('assignments')
      .select('role, umpire_id')
      .eq('fixture_id', fixture.id)
      .then(({ data }) => {
        data?.forEach(a => {
          if (a.role === 'umpire1') setUmpire1Id(a.umpire_id ?? '');
          if (a.role === 'umpire2') setUmpire2Id(a.umpire_id ?? '');
        });
      });
  }, [fixture]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.date || !form.team1 || !form.team2) {
      setError('Date, Team 1 and Team 2 are required.');
      return;
    }
    setSaving(true);
    setError('');

    // Explicitly pick only fixture table columns — never send joined data back to Supabase
    const eid = `${form.date}-${form.team1.replace(/\s+/g,'-')}-${form.team2.replace(/\s+/g,'-')}`;
    const payload = {
      match_number: form.match_number || null,
      date:         form.date,
      time:         form.time || null,
      ground:       form.ground || null,
      series_name:  form.series_name || null,
      division:     form.division || null,
      match_type:   form.match_type || null,
      team1:        form.team1,
      team2:        form.team2,
      external_id:  eid,
    };

    let fixtureId = fixture?.id;
    console.log('Saving fixture payload:', payload);
    if (isNew) {
      const { data, error } = await supabase.from('fixtures').insert(payload).select().single();
      if (error) { console.error('Insert error:', error); setError(error.message); setSaving(false); return; }
      fixtureId = data.id;
    } else {
      const { data, error } = await supabase.from('fixtures').update(payload).eq('id', fixtureId).select().single();
      if (error) { console.error('Update error:', error); setError(error.message); setSaving(false); return; }
    }

    // Save umpire assignments
    const r1 = await upsertAssignment(fixtureId, 'umpire1', umpire1Id);
    const r2 = await upsertAssignment(fixtureId, 'umpire2', umpire2Id);
    if (r1) { setError(r1); setSaving(false); return; }
    if (r2) { setError(r2); setSaving(false); return; }

    setSaving(false);
    onSaved();
  }

  async function upsertAssignment(fixtureId, role, umpireId) {
    const { error: delErr } = await supabase.from('assignments').delete()
      .eq('fixture_id', fixtureId).eq('role', role);
    if (delErr) return `Delete ${role} failed: ${delErr.message}`;
    if (umpireId) {
      const { error: insErr } = await supabase.from('assignments')
        .insert({ fixture_id: fixtureId, role, umpire_id: umpireId });
      if (insErr) return `Assign ${role} failed: ${insErr.message}`;
    }
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isNew ? 'Add Fixture' : 'Edit Fixture'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="label">Time</label>
              <input type="text" className="input" placeholder="9:00 AM" value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Team 1 *</label>
              <input type="text" className="input" value={form.team1} onChange={e => set('team1', e.target.value)} />
            </div>
            <div>
              <label className="label">Team 2 *</label>
              <input type="text" className="input" value={form.team2} onChange={e => set('team2', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Ground</label>
              <input type="text" className="input" value={form.ground} onChange={e => set('ground', e.target.value)} />
            </div>
            <div>
              <label className="label">Match #</label>
              <input type="text" className="input" value={form.match_number} onChange={e => set('match_number', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Series / League</label>
            <input type="text" className="input" value={form.series_name} onChange={e => set('series_name', e.target.value)} />
          </div>

          <hr className="border-gray-200" />
          <p className="text-sm font-medium text-gray-700">Umpire Assignment</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Umpire 1</label>
              <select className="input" value={umpire1Id} onChange={e => setUmpire1Id(e.target.value)}>
                <option value="">— None —</option>
                {umpires.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Umpire 2</label>
              <select className="input" value={umpire2Id} onChange={e => setUmpire2Id(e.target.value)}>
                <option value="">— None —</option>
                {umpires.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Fixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [umpires, setUmpires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalFixture, setModalFixture] = useState(undefined); // undefined = closed
  const [filter, setFilter] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: fx }, { data: allUmpires }, { data: asgn }] = await Promise.all([
      supabase.from('fixtures').select('*').order('date', { ascending: true }).order('time', { ascending: true }),
      supabase.from('umpires').select('id, name').order('name'),
      supabase.from('assignments').select('fixture_id, role, umpire_id'),
    ]);
    const umpireMap = Object.fromEntries((allUmpires ?? []).map(u => [u.id, u]));
    const assignMap = {};
    for (const a of (asgn ?? [])) {
      if (!assignMap[a.fixture_id]) assignMap[a.fixture_id] = [];
      assignMap[a.fixture_id].push({ ...a, umpires: umpireMap[a.umpire_id] });
    }
    const enriched = (fx ?? []).map(f => ({ ...f, assignments: assignMap[f.id] ?? [] }));
    setFixtures(enriched);
    setUmpires((allUmpires ?? []).filter(u => u.active !== false));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete(id) {
    if (!confirm('Delete this fixture?')) return;
    setDeleting(id);
    await supabase.from('fixtures').delete().eq('id', id);
    setFixtures(f => f.filter(x => x.id !== id));
    setDeleting(null);
  }

  const today = new Date().toISOString().split('T')[0];

  const displayed = fixtures.filter(f => {
    if (filter === 'upcoming' && f.date < today) return false;
    if (filter === 'past' && f.date >= today) return false;
    if (search) {
      const s = search.toLowerCase();
      return [f.team1, f.team2, f.ground, f.series_name]
        .some(v => v?.toLowerCase().includes(s));
    }
    return true;
  });

  function getUmpire(f, role) {
    return f.assignments?.find(a => a.role === role)?.umpires?.name ?? '';
  }

  return (
    <AdminLayout title="Fixtures">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          className="input flex-1"
          placeholder="Search teams, ground, series…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          {['upcoming','all','past'].map(v => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                filter === v
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn-primary whitespace-nowrap" onClick={() => setModalFixture(null)}>
          + Add Fixture
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date','Time','Teams','Ground','Umpires','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      No fixtures found.
                    </td>
                  </tr>
                ) : displayed.map(f => {
                  const u1 = getUmpire(f, 'umpire1');
                  const u2 = getUmpire(f, 'umpire2');
                  return (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {format(parseISO(f.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{f.time}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{f.team1}</div>
                        <div className="text-gray-400 text-xs">vs</div>
                        <div className="font-medium text-gray-900">{f.team2}</div>
                        {f.series_name && (
                          <div className="text-xs text-brand-600 mt-0.5">{f.series_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{f.ground}</td>
                      <td className="px-4 py-3">
                        {u1 || u2 ? (
                          <div className="space-y-1">
                            {u1 && <div className="flex items-center gap-1.5"><span className="badge bg-brand-100 text-brand-700">U1</span> {u1}</div>}
                            {u2 && <div className="flex items-center gap-1.5"><span className="badge bg-brand-100 text-brand-700">U2</span> {u2}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="text-brand-600 hover:text-brand-800 text-sm font-medium"
                            onClick={() => setModalFixture(f)}
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                            onClick={() => handleDelete(f.id)}
                            disabled={deleting === f.id}
                          >
                            {deleting === f.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            {displayed.length} fixture{displayed.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalFixture !== undefined && (
        <FixtureModal
          fixture={modalFixture}
          umpires={umpires}
          onClose={() => setModalFixture(undefined)}
          onSaved={() => { setModalFixture(undefined); loadData(); }}
        />
      )}
    </AdminLayout>
  );
}
