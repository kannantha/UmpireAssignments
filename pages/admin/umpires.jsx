import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';

function UmpireModal({ umpire, onClose, onSaved }) {
  const isNew = !umpire?.id;
  const [form, setForm] = useState(
    umpire ?? { name: '', phone: '', zelle: '', active: true }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handlePhoneChange(v) {
    set('phone', v);
    // Auto-fill zelle if it was same as old phone or empty
    if (!form.zelle || form.zelle === form.phone) set('zelle', v);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name:   form.name.trim(),
      phone:  form.phone.trim(),
      zelle:  form.zelle.trim() || form.phone.trim(),
      active: form.active,
    };

    const { error } = isNew
      ? await supabase.from('umpires').insert(payload)
      : await supabase.from('umpires').update(payload).eq('id', umpire.id);

    setSaving(false);
    if (error) setError(error.message);
    else onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isNew ? 'Add Umpire' : 'Edit Umpire'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input type="text" className="input" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input type="tel" className="input" placeholder="(555) 123-4567" value={form.phone} onChange={e => handlePhoneChange(e.target.value)} />
          </div>
          <div>
            <label className="label">Zelle Number / Handle</label>
            <input type="text" className="input" placeholder="Same as phone or email" value={form.zelle} onChange={e => set('zelle', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Leave blank to use phone number as Zelle handle.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
            <label htmlFor="active" className="text-sm text-gray-700">Active (appears in assignment dropdown)</label>
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

export default function Umpires() {
  const [umpires, setUmpires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(undefined);
  const [showInactive, setShowInactive] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('umpires')
      .select('*')
      .order('name');
    setUmpires(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm('Delete this umpire? Their past assignment records will be cleared.')) return;
    setDeleting(id);
    await supabase.from('umpires').delete().eq('id', id);
    setUmpires(u => u.filter(x => x.id !== id));
    setDeleting(null);
  }

  async function toggleActive(umpire) {
    await supabase.from('umpires').update({ active: !umpire.active }).eq('id', umpire.id);
    setUmpires(us => us.map(u => u.id === umpire.id ? { ...u, active: !u.active } : u));
  }

  const displayed = showInactive ? umpires : umpires.filter(u => u.active);

  return (
    <AdminLayout title="Umpires">
      <div className="flex items-center justify-between mb-6">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600"
          />
          Show inactive umpires
        </label>
        <button className="btn-primary" onClick={() => setModal(null)}>+ Add Umpire</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name','Phone','Zelle','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">No umpires found.</td>
                </tr>
              ) : displayed.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {u.phone
                      ? <a href={`tel:${u.phone}`} className="hover:text-brand-600">{u.phone}</a>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {u.zelle || u.phone || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u)}>
                      <span className={`badge ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-brand-600 hover:text-brand-800 font-medium"
                        onClick={() => setModal(u)}
                      >
                        Edit
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        className="text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                        onClick={() => handleDelete(u.id)}
                        disabled={deleting === u.id}
                      >
                        {deleting === u.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            {displayed.length} umpire{displayed.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {modal !== undefined && (
        <UmpireModal
          umpire={modal}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); load(); }}
        />
      )}
    </AdminLayout>
  );
}
