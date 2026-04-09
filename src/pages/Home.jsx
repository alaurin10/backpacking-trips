import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { databases, DATABASE_ID, TRIPS_ID } from '../lib/appwrite';
import { Query } from 'appwrite';
import TripCard from '../components/TripCard';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function buildMonthCells(year, month) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildRangeSet(trips) {
  // Returns { dateStr: 'start' | 'range' }
  const map = {};
  trips.forEach((trip) => {
    const start = trip.startDate;
    const end = trip.endDate || trip.startDate;
    let cur = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    while (cur <= endDate) {
      const ds = cur.toISOString().slice(0, 10);
      map[ds] = ds === start ? 'start' : 'range';
      cur.setDate(cur.getDate() + 1);
    }
  });
  return map;
}

function MiniCalendar({ year, month, rangeSet }) {
  const cells = buildMonthCells(year, month);
  return (
    <div className="trips-mini-cal">
      <div className="trips-cal-grid">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="trips-cal-header">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="trips-cal-cell trips-cal-empty" />;
          const ds = toDateStr(year, month, day);
          const mark = rangeSet[ds];
          return (
            <div
              key={day}
              className={`trips-cal-cell${mark === 'start' ? ' trips-cal-start' : mark === 'range' ? ' trips-cal-range' : ''}`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    databases
      .listDocuments(DATABASE_ID, TRIPS_ID, [Query.orderAsc('startDate')])
      .then((res) => setTrips(res.documents))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="status-msg">Loading trips...</div>;
  if (error) return <div className="status-msg error">Error: {error}</div>;

  const dated = trips.filter((t) => t.startDate);
  const undated = trips.filter((t) => !t.startDate);

  const byMonth = {};
  dated.forEach((trip) => {
    const key = trip.startDate.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(trip);
  });

  const monthKeys = Object.keys(byMonth).sort();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trips</h1>
        <Link to="/trips/new" className="btn btn-primary">+ Add Trip</Link>
      </div>

      {trips.length === 0 ? (
        <p className="status-msg">No trips yet. Add one to get started!</p>
      ) : (
        <>
          {monthKeys.map((key) => {
            const [yearStr, monthStr] = key.split('-');
            const year = Number(yearStr);
            const month = Number(monthStr) - 1; // 0-indexed for Date
            const monthTrips = byMonth[key];
            const rangeSet = buildRangeSet(monthTrips);

            return (
              <div key={key} className="trips-month-section">
                <h2 className="trips-month-title">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <div className="trips-month-body">
                  <MiniCalendar year={year} month={month} rangeSet={rangeSet} />
                  <div className="trips-month-cards">
                    {monthTrips.map((trip) => (
                      <TripCard key={trip.$id} trip={trip} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {undated.length > 0 && (
            <div className="trips-month-section trips-undated-section">
              <h2 className="trips-month-title trips-undated-title">No Date Set</h2>
              <div className="trip-grid">
                {undated.map((trip) => (
                  <TripCard key={trip.$id} trip={trip} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
