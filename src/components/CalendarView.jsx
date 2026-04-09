import { useState } from 'react';
import { ID } from 'appwrite';
import { databases, DATABASE_ID, AVAILABILITY_ID } from '../lib/appwrite';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Map any date that belongs to a bundle → the Saturday ISO (the bundle key).
// Standard bundle: Saturday + Sunday.
// Extended: Friday July 3 when Saturday is July 4.
// Extended: Monday Memorial Day (last Mon of May) when Sunday is the day before.
function isMemorialDay(d) {
  return d.getMonth() === 4 && d.getDay() === 1 && d.getDate() >= 25;
}

function buildBundleMap(saturdays) {
  const map = {};
  for (const satIso of saturdays) {
    const sat = new Date(satIso + 'T00:00:00');

    map[satIso] = satIso; // Saturday

    const sun = new Date(sat);
    sun.setDate(sun.getDate() + 1);
    map[isoFromDate(sun)] = satIso; // Sunday

    // Include Friday July 3 when Saturday is July 4
    const fri = new Date(sat);
    fri.setDate(fri.getDate() - 1);
    const friIso = isoFromDate(fri);
    if (friIso.slice(5, 10) === '07-03') {
      map[friIso] = satIso;
    }

    // Include Memorial Day (last Monday of May)
    const mon = new Date(sat);
    mon.setDate(mon.getDate() + 2);
    if (isMemorialDay(mon)) {
      map[isoFromDate(mon)] = satIso;
    }
  }
  return map;
}

function formatWeekend(satIso) {
  const sat = new Date(satIso + 'T00:00:00');
  const sun = new Date(sat);
  sun.setDate(sun.getDate() + 1);

  const fri = new Date(sat);
  fri.setDate(fri.getDate() - 1);
  const isJul3Weekend = fri.getMonth() === 6 && fri.getDate() === 3;

  const mon = new Date(sat);
  mon.setDate(mon.getDate() + 2);
  const isMemDay = isMemorialDay(mon);

  if (isJul3Weekend) {
    const friStr = fri.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${friStr}–${sun.getDate()}, ${sat.getFullYear()}`;
  }

  const satStr = sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (isMemDay) {
    return `${satStr}–${mon.getDate()}, ${sat.getFullYear()}`;
  }

  return `${satStr}–${sun.getDate()}, ${sat.getFullYear()}`;
}

function CalendarMonth({ year, month, bundleMap, byWeekend, personName, busyWeekends, tripsByWeekend, onToggle }) {
  const title = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const hasPerson = Boolean(personName.trim());

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

          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const satKey = bundleMap[iso];
          const isSat = (firstDayOfWeek + day - 1) % 7 === 6;

          if (!satKey) {
            return (
              <div key={day} className={`cal-cell${isSat ? ' cal-cell-sat-inactive' : ''}`}>
                {day}
              </div>
            );
          }

          const rows = byWeekend[satKey] || [];
          const count = rows.length;
          const isChecked = hasPerson && rows.some((r) => r.personName === personName.trim());
          const isBusy = busyWeekends.has(satKey);
          const isBest = count >= 3;
          const isSaturdayCell = iso === satKey;

          const tripNames = tripsByWeekend[satKey] || [];
          let titleText;
          if (tripNames.length) {
            const availNames = count ? rows.map((r) => r.personName).join(', ') : '';
            titleText = tripNames.join(', ') + (availNames ? '\n' + availNames : '');
          } else if (count) {
            titleText = rows.map((r) => r.personName).join(', ');
          } else {
            titleText = 'Click to mark yourself free';
          }

          // Build class list: busy > checked > unavail > default
          let stateClass = '';
          if (isBusy) {
            stateClass = ' cal-busy';
          } else if (hasPerson && isChecked) {
            stateClass = ' cal-checked';
          } else if (hasPerson && !isChecked) {
            stateClass = ' cal-unavail';
          }

          return (
            <button
              key={day}
              className={`cal-cell cal-cell-sat${stateClass}${isBest ? ' cal-best' : ''}`}
              onClick={() => !isBusy && onToggle(satKey, isChecked, rows)}
              title={titleText}
            >
              <span className="cal-day-num">{day}</span>
              {isSaturdayCell && count > 0 && <span className="cal-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarView({ weekends, allRows, personName, onChange, busyWeekends = new Set(), tripsByWeekend = {} }) {
  const [toggling, setToggling] = useState(null);
  const [error, setError] = useState(null);

  const byWeekend = {};
  for (const row of allRows) {
    if (!byWeekend[row.weekendStart]) byWeekend[row.weekendStart] = [];
    byWeekend[row.weekendStart].push(row);
  }

  const bundleMap = buildBundleMap(weekends);

  const ranked = [...weekends]
    .map((w) => ({ weekend: w, count: (byWeekend[w] || []).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const EXCLUDED_MONTHS = new Set([3]); // April

  const today = new Date();
  const months = [];
  const cur = new Date(today.getFullYear(), today.getMonth(), 1);
  while (months.length < 6) {
    if (!EXCLUDED_MONTHS.has(cur.getMonth())) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  async function handleToggle(satKey, isChecked, rows) {
    if (!personName.trim()) {
      alert('Enter your name first.');
      return;
    }
    if (toggling) return;
    setToggling(satKey);
    setError(null);
    try {
      if (!isChecked) {
        const doc = await databases.createDocument(DATABASE_ID, AVAILABILITY_ID, ID.unique(), {
          personName: personName.trim(),
          weekendStart: satKey,
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
        {personName.trim() ? (
          <>
            <span className="legend-item"><span className="legend-swatch legend-available" /> Available</span>
            <span className="legend-item"><span className="legend-swatch legend-unavail" /> Unavailable</span>
            <span className="legend-item"><span className="legend-swatch legend-busy" /> Busy (trip)</span>
            <span className="legend-item"><span className="legend-swatch legend-best-border" /> 3+ people free</span>
          </>
        ) : (
          <>
            <span className="legend-item"><span className="legend-swatch legend-tan" /> Weekend</span>
            <span className="legend-item"><span className="legend-swatch legend-best-border" /> 3+ people free</span>
          </>
        )}
      </div>

      <div className="cal-months">
        {months.map(({ year, month }) => (
          <CalendarMonth
            key={`${year}-${month}`}
            year={year}
            month={month}
            bundleMap={bundleMap}
            byWeekend={byWeekend}
            personName={personName}
            busyWeekends={busyWeekends}
            tripsByWeekend={tripsByWeekend}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
