import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, AVAILABILITY_ID } from '../lib/appwrite';
import CalendarView from '../components/CalendarView';

function getUpcomingSaturdays(count = 26) {
  const saturdays = [];
  const today = new Date();
  const d = new Date(today);
  // Advance to next Saturday (day 6)
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  for (let i = 0; i < count; i++) {
    // Use local date parts to avoid UTC offset shifting the day
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    saturdays.push(iso);
    d.setDate(d.getDate() + 7);
  }
  return saturdays;
}

const WEEKENDS = getUpcomingSaturdays(26);

export default function Availability() {
  const [personName, setPersonName] = useState(() => localStorage.getItem('bp_name') || '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    databases
      .listDocuments(DATABASE_ID, AVAILABILITY_ID, [])
      .then((res) => setRows(res.documents))
      .finally(() => setLoading(false));
  }, []);

  function handleNameChange(e) {
    setPersonName(e.target.value);
    localStorage.setItem('bp_name', e.target.value);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Availability</h1>
      </div>

      <div className="name-bar">
        <label htmlFor="personName">Your name:</label>
        <input
          id="personName"
          type="text"
          value={personName}
          onChange={handleNameChange}
          placeholder="Enter your name to check in"
          className="name-input"
        />
      </div>

      {loading ? (
        <div className="status-msg">Loading...</div>
      ) : (
        <CalendarView
          weekends={WEEKENDS}
          allRows={rows}
          personName={personName}
          onChange={setRows}
        />
      )}
    </div>
  );
}
