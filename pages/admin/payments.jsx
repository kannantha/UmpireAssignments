import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';

function PaymentModal({ fixture, payment, onClose, onSaved }) {
  const [form, setForm] = useState({
    team1_amount: payment?.team1_amount ?? '',
    team2_amount: payment?.team2_amount ?? '',
    team1_paid:   payment?.team1_paid   ?? false,
    team2_paid:   payment?.team2_paid   ?? false,
    notes:        payment?.notes        ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    setError('');
    const payload = {
      fixture_id:   fixture.id,
      team1_amount: parseFloat(form.team1_amount) || 0,
      team2_amount: parseFloat(form.team2_amount) || 0,
      team1_paid:   form.team1_paid,
      team2_paid:   form.team2_paid,
      notes:        form.notes,
    };

    const { error } = payment?.id
      ? await supabase.from('payments').update(payload).eq('id', payment.id)
      : await supabase.from('payments').insert(payload);

    setSaving(false);
    if (error) setError(error.message);
    else onSaved();
  }

  const totalOwed = (parseFloat(form.team1_amount) || 0) + (parseFloat(form.team2_amount) || 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Payment Details</h2>
            <p className="text-sm text-gray-500">{fixture.team1} vs {fixture.team2}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Team 1 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-3">{fixture.team1}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  placeholder="0.00"
                  value={form.team1_amount}
                  onChange={e => set('team1_amount', e.target.value)}
                />
              </div>
              <div className="flex flex-col justify-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.team1_paid}
                    onChange={e => set('team1_paid', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                  />
                  <span className={`text-sm font-medium ${form.team1_paid ? 'text-green-600' : 'text-gray-600'}`}>
                    {form.team1_paid ? '✓ Paid' : 'Not paid'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Team 2 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-3">{fixture.team2}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  placeholder="0.00"
                  value={form.team2_amount}
                  onChange={e => set('team2_amount', e.target.value)}
                />
              </div>
              <div className="flex flex-col justify-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.team2_paid}
                    onChange={e => set('team2_paid', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                  />
                  <span className={`text-sm font-medium ${form.team2_paid ? 'text-green-600' : 'text-gray-600'}`}>
                    {form.team2_paid ? '✓ Paid' : 'Not paid'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Total */}
          {totalOwed > 0 && (
            <div className="flex justify-between text-sm font-medium text-gray-700 px-1">
              <span>Total</span>
              <span>${totalOwed.toFixed(2)}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Any payment notes…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
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

export default function Payments() {
  const [rows, setRows] = useState([]);   // fixtures joined with payment data
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);  // { fixture, payment }
  const [filterPaid, setFilterPaid] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const [{ data: fixtures }, { data: payments }, { data: asgn }, { data: umpires }] =
      await Promise.all([
        supabase.from('fixtures').select('*').gte('date', today).order('date', { ascending: true }),
        supabase.from('payments').select('*'),
        supabase.from('assignments').select('fixture_id, role, umpire_id'),
        supabase.from('umpires').select('id, name'),
      ]);

    const umpireMap = Object.fromEntries((umpires ?? []).map(u => [u.id, u]));
    const payMap = Object.fromEntries((payments ?? []).map(p => [p.fixture_id, p]));
    const assignMap = {};
    for (const a of (asgn ?? [])) {
      if (!assignMap[a.fixture_id]) assignMap[a.fixture_id] = [];
      assignMap[a.fixture_id].push({ ...a, umpires: umpireMap[a.umpire_id] });
    }

    const enriched = (fixtures ?? []).map(f => ({
      ...f,
      payments: payMap[f.id] ? [payMap[f.id]] : [],
      assignments: assignMap[f.id] ?? [],
    }));

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function getUmpireNames(f) {
    const u1 = f.assignments?.find(a => a.role === 'umpire1')?.umpires?.name;
    const u2 = f.assignments?.find(a => a.role === 'umpire2')?.umpires?.name;
    return [u1, u2].filter(Boolean).join(', ') || '—';
  }

  const displayed = rows.filter(f => {
    const p = f.payments?.[0];
    if (filterPaid === 'unpaid') {
      if (p?.team1_paid && p?.team2_paid) return false;
    }
    if (filterPaid === 'partial') {
      if (!p) return false;
      if ((p.team1_paid && p.team2_paid) || (!p.team1_paid && !p.team2_paid)) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return [f.team1, f.team2, f.ground].some(v => v?.toLowerCase().includes(s));
    }
    return true;
  });

  // Summary stats
  const stats = rows.reduce((acc, f) => {
    const p = f.payments?.[0];
    if (!p) return acc;
    acc.total  += (p.team1_amount || 0) + (p.team2_amount || 0);
    acc.paid   += (p.team1_paid ? (p.team1_amount || 0) : 0) + (p.team2_paid ? (p.team2_amount || 0) : 0);
    acc.unpaid += (!p.team1_paid ? (p.team1_amount || 0) : 0) + (!p.team2_paid ? (p.team2_amount || 0) : 0);
    return acc;
  }, { total: 0, paid: 0, unpaid: 0 });

  return (
    <AdminLayout title="Payments">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Owed',    value: stats.total,  color: 'bg-blue-50  text-blue-700'  },
          { label: 'Collected',     value: stats.paid,   color: 'bg-green-50 text-green-700' },
          { label: 'Outstanding',   value: stats.unpaid, color: 'bg-red-50   text-red-700'   },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.color}`}>
            <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1">${s.value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          className="input flex-1"
          placeholder="Search teams, ground…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          {['all','unpaid','partial'].map(v => (
            <button
              key={v}
              onClick={() => setFilterPaid(v)}
              className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                filterPaid === v
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

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
                  {['Date','Match','Umpires','Team 1 Pmt','Team 2 Pmt','Total','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No fixtures found.</td>
                  </tr>
                ) : displayed.map(f => {
                  const p = f.payments?.[0];
                  const t1a = p?.team1_amount ?? 0;
                  const t2a = p?.team2_amount ?? 0;
                  return (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {format(parseISO(f.date), 'MMM d')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{f.team1}</div>
                        <div className="text-gray-400 text-xs">vs {f.team2}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{getUmpireNames(f)}</td>
                      <td className="px-4 py-3">
                        {p ? (
                          <div className="flex items-center gap-2">
                            <span>${(+t1a).toFixed(2)}</span>
                            <span className={`badge ${p.team1_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {p.team1_paid ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p ? (
                          <div className="flex items-center gap-2">
                            <span>${(+t2a).toFixed(2)}</span>
                            <span className={`badge ${p.team2_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {p.team2_paid ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p ? `$${(+t1a + +t2a).toFixed(2)}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="text-brand-600 hover:text-brand-800 font-medium text-sm"
                          onClick={() => setModal({ fixture: f, payment: p })}
                        >
                          {p ? 'Edit' : 'Set'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <PaymentModal
          fixture={modal.fixture}
          payment={modal.payment}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </AdminLayout>
  );
}
