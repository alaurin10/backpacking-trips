import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { databases, DATABASE_ID, TRIPS_ID } from '../lib/appwrite';
import { Query } from 'appwrite';
import TripCard from '../components/TripCard';
import { SkeletonTripGrid } from '../components/Skeleton';
import useDocumentTitle from '../hooks/useDocumentTitle';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const DIFFICULTIES = ['all', 'easy', 'moderate', 'hard'];
const DIFFICULTY_LABELS_FILTER = { all: 'All', easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

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

function buildTripNameMap(trips) {
  const map = {};
  trips.forEach((trip) => {
    const start = trip.startDate;
    const end = trip.endDate || trip.startDate;
    let cur = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    while (cur <= endDate) {
      const ds = cur.toISOString().slice(0, 10);
      if (!map[ds]) map[ds] = [];
      map[ds].push(trip.name);
      cur.setDate(cur.getDate() + 1);
    }
  });
  return map;
}

function MiniCalendar({ year, month, rangeSet, tripNameMap }) {
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
          const names = tripNameMap[ds];
          return (
            <div
              key={day}
              className={`trips-cal-cell${mark === 'start' ? ' trips-cal-start' : mark === 'range' ? ' trips-cal-range' : ''}`}
              title={names?.length ? names.join(', ') : undefined}
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
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showCalendars, setShowCalendars] = useState(false);

  useDocumentTitle('Trips');

  useEffect(() => {
    databases
      .listDocuments(DATABASE_ID, TRIPS_ID, [Query.orderAsc('startDate')])
      .then((res) => setTrips(res.documents))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <div className="status-msg error">Error: {error}</div>;

  // Filter
  const searchLower = search.toLowerCase();
  const filtered = trips.filter((t) => {
    if (difficultyFilter !== 'all' && t.difficulty !== difficultyFilter) return false;
    if (search && !(t.name.toLowerCase().includes(searchLower) || (t.location || '').toLowerCase().includes(searchLower))) return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'distance') return (b.distanceMiles || 0) - (a.distanceMiles || 0);
    // default: date ascending, undated last
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  });

  const dated = sorted.filter((t) => t.startDate);
  const undated = sorted.filter((t) => !t.startDate);

  const byMonth = {};
  dated.forEach((trip) => {
    const key = trip.startDate.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(trip);
  });

  const monthKeys = Object.keys(byMonth).sort();
  let cardIndex = 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trips</h1>
        <Link to="/trips/new" className="btn btn-primary">+ Add Trip</Link>
      </div>

      {loading ? (
        <SkeletonTripGrid />
      ) : trips.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 4L6 40h36L24 4z" fill="var(--green-light)" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M16 40l8-16 8 16" fill="var(--green)" opacity="0.3"/>
            <path d="M10 40l6-12 6 12" fill="var(--green)" opacity="0.2"/>
          </svg>
          <p className="empty-state-text">No trips yet</p>
          <Link to="/trips/new" className="btn btn-primary">Plan your first trip</Link>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <input
              type="text"
              className="filter-input"
              placeholder="Search trips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="filter-pills">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  className={`filter-pill${difficultyFilter === d ? ' filter-pill-active' : ''}`}
                  onClick={() => setDifficultyFilter(d)}
                >
                  {DIFFICULTY_LABELS_FILTER[d]}
                </button>
              ))}
            </div>
            <select className="filter-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Sort: Date</option>
              <option value="name">Sort: Name</option>
              <option value="distance">Sort: Distance</option>
            </select>
            <button className="cal-toggle" onClick={() => setShowCalendars((s) => !s)}>
              {showCalendars ? 'Hide calendars' : 'Show calendars'}
            </button>
          </div>

          {filtered.length !== trips.length && (
            <p className="filter-count">Showing {filtered.length} of {trips.length} trips</p>
          )}

          {sorted.length === 0 ? (
            <p className="status-msg">No trips match your filters.</p>
          ) : (
            <>
              {monthKeys.map((key) => {
                const [yearStr, monthStr] = key.split('-');
                const year = Number(yearStr);
                const month = Number(monthStr) - 1;
                const monthTrips = byMonth[key];
                const rangeSet = buildRangeSet(monthTrips);
                const tripNameMap = buildTripNameMap(monthTrips);

                return (
                  <div key={key} className="trips-month-section">
                    <h2 className="trips-month-title">
                      {MONTH_NAMES[month]} {year}
                    </h2>
                    <div className="trips-month-body">
                      <div className={`trips-mini-cal-wrap${showCalendars ? ' cal-visible' : ''}`}>
                        <MiniCalendar year={year} month={month} rangeSet={rangeSet} tripNameMap={tripNameMap} />
                      </div>
                      <div className="trips-month-cards">
                        {monthTrips.map((trip) => {
                          const idx = cardIndex++;
                          return <TripCard key={trip.$id} trip={trip} style={{ animationDelay: `${idx * 0.05}s` }} />;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {undated.length > 0 && (
                <div className="trips-month-section trips-undated-section">
                  <h2 className="trips-month-title trips-undated-title">No Date Set</h2>
                  <div className="trip-grid">
                    {undated.map((trip) => {
                      const idx = cardIndex++;
                      return <TripCard key={trip.$id} trip={trip} style={{ animationDelay: `${idx * 0.05}s` }} />;
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
