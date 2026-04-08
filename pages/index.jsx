import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import Link from 'next/link';

export default function PublicLanding() {
  const [fixturesByDate, setFixturesByDate] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFixtures();
  }, []);

  async function loadFixtures() {
    const today = new Date().toISOString().split('T')[0];

    const { data: fixtures, error } = await supabase
      .from('fixtures')
      .select(`
        *,
        assignments (
          role,
          umpires ( id, name )
        )
      `)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Group by date
    const grouped = {};
    for (const f of fixtures) {
      const d = f.date;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(f);
    }
    setFixturesByDate(Object.entries(grouped));
    setLoading(false);
  }

  function dateLabel(dateStr) {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today — ' + format(d, 'EEEE, MMMM d');
    if (isTomorrow(d)) return 'Tomorrow — ' + format(d, 'EEEE, MMMM d');
    return format(d, 'EEEE, MMMM d, yyyy');
  }

  function getUmpire(assignments, role) {
    const a = assignments?.find(x => x.role === role);
    return a?.umpires?.name ?? null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-800 to-brand-900">
      {/* Header */}
      <header className="bg-brand-900 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Cricket Umpire Assignments
            </h1>
            <p className="text-brand-200 text-sm mt-0.5">Upcoming fixtures & officiating crew</p>
          </div>
          <Link href="/admin" className="btn-secondary text-xs">
            Admin
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent" />
          </div>
        ) : fixturesByDate.length === 0 ? (
          <div className="text-center py-24 text-brand-200">
            <div className="text-5xl mb-4">🏏</div>
            <p className="text-lg">No upcoming fixtures found.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {fixturesByDate.map(([date, fixtures]) => (
              <section key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-white">
                    {dateLabel(date)}
                  </h2>
                  <span className="badge bg-brand-700 text-brand-100">
                    {fixtures.length} match{fixtures.length !== 1 ? 'es' : ''}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {fixtures.map(f => {
                    const u1 = getUmpire(f.assignments, 'umpire1');
                    const u2 = getUmpire(f.assignments, 'umpire2');
                    const hasUmpires = u1 || u2;

                    return (
                      <div key={f.id} className="card p-4 hover:shadow-md transition-shadow">
                        {/* Series */}
                        {f.series_name && (
                          <p className="text-xs font-medium text-brand-600 uppercase tracking-wide mb-2 truncate">
                            {f.series_name}
                          </p>
                        )}

                        {/* Teams */}
                        <div className="mb-3">
                          <p className="font-semibold text-gray-900 text-base leading-tight">
                            {f.team1}
                          </p>
                          <p className="text-xs text-gray-400 my-0.5 font-medium">vs</p>
                          <p className="font-semibold text-gray-900 text-base leading-tight">
                            {f.team2}
                          </p>
                        </div>

                        {/* Details */}
                        <div className="space-y-1 text-sm text-gray-600 border-t border-gray-100 pt-3">
                          <div className="flex items-center gap-2">
                            <span className="w-4 text-center">🕐</span>
                            <span>{f.time || 'TBD'}</span>
                          </div>
                          {f.ground && (
                            <div className="flex items-center gap-2">
                              <span className="w-4 text-center">📍</span>
                              <span>{f.ground}</span>
                            </div>
                          )}
                        </div>

                        {/* Umpires */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                            Umpires
                          </p>
                          {hasUmpires ? (
                            <div className="space-y-1">
                              {u1 && (
                                <div className="flex items-center gap-2">
                                  <span className="badge bg-brand-100 text-brand-700">U1</span>
                                  <span className="text-sm text-gray-800">{u1}</span>
                                </div>
                              )}
                              {u2 && (
                                <div className="flex items-center gap-2">
                                  <span className="badge bg-brand-100 text-brand-700">U2</span>
                                  <span className="text-sm text-gray-800">{u2}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Not yet assigned</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
