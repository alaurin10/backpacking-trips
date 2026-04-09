import { useState, useEffect, useRef, useMemo } from 'react';
import { ID, Query } from 'appwrite';
import { databases, DATABASE_ID, AVAILABILITY_ID, TRIPS_ID, TRIP_INTEREST_ID } from '../lib/appwrite';
import { computeBusyWeekends, getOverlappingWeekends } from '../lib/weekendUtils';
import CalendarView from '../components/CalendarView';
import NameSelector from '../components/NameSelector';
import { SkeletonCalendar } from '../components/Skeleton';
import useDocumentTitle from '../hooks/useDocumentTitle';

// April (3) is excluded — 0-indexed
const EXCLUDED_MONTHS = new Set([3]);

function getUpcomingSaturdays(count = 26) {
  const saturdays = [];
  const today = new Date();
  const d = new Date(today);
  // Advance to next Saturday (day 6)
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  while (saturdays.length < count) {
    if (!EXCLUDED_MONTHS.has(d.getMonth())) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      saturdays.push(iso);
    }
    d.setDate(d.getDate() + 7);
  }
  return saturdays;
}

const WEEKENDS = getUpcomingSaturdays(26);

export default function Availability() {
  const [personName, setPersonName] = useState(() => localStorage.getItem('bp_name') || '');
  const [rows, setRows] = useState([]);
  const [trips, setTrips] = useState([]);
  const [tripInterests, setTripInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);
  const populatedRef = useRef(new Set());

  useDocumentTitle('Availability');

  useEffect(() => {
    Promise.all([
      databases.listDocuments(DATABASE_ID, AVAILABILITY_ID, []),
      databases.listDocuments(DATABASE_ID, TRIPS_ID, [Query.limit(500)]),
      databases.listDocuments(DATABASE_ID, TRIP_INTEREST_ID, [Query.limit(500)]),
    ])
      .then(([availRes, tripsRes, interestsRes]) => {
        setRows(availRes.documents);
        setTrips(tripsRes.documents);
        setTripInterests(interestsRes.documents);
      })
      .finally(() => setLoading(false));
  }, []);

  const busyWeekends = useMemo(() => {
    if (!personName.trim()) return new Set();
    return computeBusyWeekends(personName.trim(), tripInterests, trips);
  }, [personName, tripInterests, trips]);

  const tripsByWeekend = useMemo(() => {
    const map = {};
    for (const trip of trips) {
      if (!trip.startDate) continue;
      for (const w of getOverlappingWeekends(trip.startDate, trip.endDate)) {
        if (!map[w]) map[w] = [];
        map[w].push(trip.name);
      }
    }
    return map;
  }, [trips]);

  // Auto-populate all weekends for a person with zero availability records
  useEffect(() => {
    if (loading || !personName.trim()) return;
    const trimmed = personName.trim();
    if (populatedRef.current.has(trimmed)) return;
    populatedRef.current.add(trimmed);

    const existing = rows.filter((r) => r.personName === trimmed);
    if (existing.length > 0) return;

    let cancelled = false;
    setPopulating(true);
    Promise.all(
      WEEKENDS.map((w) =>
        databases.createDocument(DATABASE_ID, AVAILABILITY_ID, ID.unique(), {
          personName: trimmed,
          weekendStart: w,
        })
      )
    )
      .then((docs) => { if (!cancelled) setRows((prev) => [...prev, ...docs]); })
      .catch((err) => console.error('Auto-populate availability failed:', err))
      .finally(() => { if (!cancelled) setPopulating(false); });

    return () => { cancelled = true; };
  }, [loading, personName, rows]);

  function handleNameChange(name) {
    setPersonName(name);
    localStorage.setItem('bp_name', name);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Availability</h1>
      </div>

      <div className="name-bar">
        <label>Your name:</label>
        <NameSelector value={personName} onChange={handleNameChange} />
      </div>

      {loading || populating ? (
        populating ? (
          <div className="status-msg">Setting up your availability...</div>
        ) : (
          <SkeletonCalendar />
        )
      ) : (
        <CalendarView
          weekends={WEEKENDS}
          allRows={rows}
          personName={personName}
          onChange={setRows}
          busyWeekends={busyWeekends}
          tripsByWeekend={tripsByWeekend}
        />
      )}
    </div>
  );
}
