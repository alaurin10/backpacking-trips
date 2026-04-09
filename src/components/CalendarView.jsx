import { useState } from 'react';
import { ID } from 'appwrite';
import { databases, DATABASE_ID, AVAILABILITY_ID } from '../lib/appwrite';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatWeekend(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function CalendarMonth({ year, month, weekendSet, byWeekend, personName, onToggle }) {
  const title = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build flat cell array: nulls for leading empty cells, then day numbers
  const cells = Array(firstDayOfWeek).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="cal-month">
      <h3 className="cal-month-title">{title}</h3>
      <div className="cal-grid">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="cal-header-cell">{h}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="cal-cell cal-cell-empty" />;

          const isSat = (firstDayOfWeek + day - 1) % 7 === 6;
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isInteractive = isSat && weekendSet.has(iso);

          if (!isInteractive) {
            return (
              <div key={day} className={`cal-cell${isSat ? ' cal-cell-sat-inactive' : ''}`}>
                {day}
              </div>
            );
          }

          const rows = byWeekend[iso] || [];
          const count = rows.length;
          const isChecked = personName.trim() && rows.some((r) => r.personName === personName.trim());
          const isBest = count >= 3;

          return (
            <button
              key={day}
              className={`cal-cell cal-cell-sat${isChecked ? ' cal-checked' : ''}${isBest ? ' cal-best' : ''}`}
              onClick={() => onToggle(iso, isChecked, rows)}
              title={rows.length ? rows.map((r) => r.personName).join(', ') : 'Click to mark yourself free'}
            >
              <span className="cal-day-num">{day}</span>
              {count > 0 && <span className="cal-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarView({ weekends, allRows, personName, onChange }) {
  const [toggling, setToggling] = useState(null);
  const [error, setError] = useState(null);

  // Build lookup: iso date → array of availability rows
  const byWeekend = {};
  for (const row of allRows) {
    if (!byWeekend[row.weekendStart]) byWeekend[row.weekendStart] = [];
    byWeekend[row.weekendStart].push(row);
  }

  const weekendSet = new Set(weekends);

  // Best weekends: top 3 by count
  const ranked = [...weekends]
    .map((w) => ({ weekend: w, count: (byWeekend[w] || []).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Compute months to display: from current month through month of last weekend
  const today = new Date();
  const lastWeekend = weekends[weekends.length - 1];
  const endDate = lastWeekend ? new Date(lastWeekend + 'T00:00:00') : today;
  const months = [];
  const cur = new Date(today.getFullYear(), today.getMonth(), 1);
  while (cur <= endDate) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }

  async function handleToggle(iso, isChecked, rows) {
    if (!personName.trim()) {
      alert('Enter your name first.');
      return;
    }
    if (toggling) return;
    setToggling(iso);
    setError(null);
    try {
      if (!isChecked) {
        const doc = await databases.createDocument(DATABASE_ID, AVAILABILITY_ID, ID.unique(), {
          personName: personName.trim(),
          weekendStart: iso,
        });
        onChange((prev) => [...prev, doc]);
      } else {
        const existing = rows.find((r) => r.personName === personName.trim());
        if (existing) {
          await databases.deleteDocument(DATABASE_ID, AVAILABILITY_ID, existing.$id);
          onChange((prev) => prev.filter((r) => r.$id !== existing.$id));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      {ranked.length > 0 && (
        <div className="best-weekends">
          <h2 className="section-title">Best Weekends</h2>
          <div className="best-list">
            {ranked.map(({ weekend, count }, i) => (
              <div key={weekend} className={`best-item rank-${i + 1}`}>
                <span className="best-rank">#{i + 1}</span>
                <span className="best-date">{formatWeekend(weekend)}</span>
                <span className="best-count">{count} {count === 1 ? 'person' : 'people'} free</span>
                <span className="best-names">
                  {(byWeekend[weekend] || []).map((r) => r.personName).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      <div className="cal-legend">
        <span className="legend-item"><span className="legend-swatch legend-available" /> You're free</span>
        <span className="legend-item"><span className="legend-swatch legend-best" /> 3+ people free</span>
        <span className="legend-item"><span className="legend-swatch legend-sat" /> Weekend (click to toggle)</span>
      </div>

      <div className="cal-months">
        {months.map(({ year, month }) => (
          <CalendarMonth
            key={`${year}-${month}`}
            year={year}
            month={month}
            weekendSet={weekendSet}
            byWeekend={byWeekend}
            personName={personName}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
