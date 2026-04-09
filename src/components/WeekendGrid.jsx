import { ID } from 'appwrite';
import { databases, DATABASE_ID, AVAILABILITY_ID } from '../lib/appwrite';

function formatWeekend(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function WeekendGrid({ weekends, allRows, personName, onChange }) {
  // Group rows by weekendStart
  const byWeekend = {};
  for (const row of allRows) {
    if (!byWeekend[row.weekendStart]) byWeekend[row.weekendStart] = [];
    byWeekend[row.weekendStart].push(row);
  }

  // Top 3 best weekends
  const ranked = [...weekends]
    .map((w) => ({ weekend: w, count: (byWeekend[w] || []).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  async function handleToggle(weekendStart, checked) {
    if (!personName.trim()) {
      alert('Enter your name first.');
      return;
    }
    if (checked) {
      const doc = await databases.createDocument(DATABASE_ID, AVAILABILITY_ID, ID.unique(), {
        personName: personName.trim(),
        weekendStart,
      });
      onChange((prev) => [...prev, doc]);
    } else {
      const existing = (byWeekend[weekendStart] || []).find(
        (r) => r.personName === personName.trim()
      );
      if (existing) {
        await databases.deleteDocument(DATABASE_ID, AVAILABILITY_ID, existing.$id);
        onChange((prev) => prev.filter((r) => r.$id !== existing.$id));
      }
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

      <table className="avail-table">
        <thead>
          <tr>
            <th>Weekend (Sat)</th>
            <th>Who's Free</th>
            <th>Count</th>
            <th>I'm Free</th>
          </tr>
        </thead>
        <tbody>
          {weekends.map((weekend) => {
            const rows = byWeekend[weekend] || [];
            const count = rows.length;
            const isChecked = rows.some((r) => r.personName === personName.trim());
            const isHighlighted = count >= 3;

            return (
              <tr key={weekend} className={isHighlighted ? 'row-highlight' : ''}>
                <td>{formatWeekend(weekend)}</td>
                <td className="names-cell">
                  {rows.map((r) => r.personName).join(', ')}
                </td>
                <td className="count-cell">{count > 0 ? count : ''}</td>
                <td className="check-cell">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleToggle(weekend, e.target.checked)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
