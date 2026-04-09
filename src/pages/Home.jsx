import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { databases, DATABASE_ID, TRIPS_ID } from '../lib/appwrite';
import { Query } from 'appwrite';
import TripCard from '../components/TripCard';

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trips</h1>
        <Link to="/trips/new" className="btn btn-primary">+ Add Trip</Link>
      </div>
      {trips.length === 0 ? (
        <p className="status-msg">No trips yet. Add one to get started!</p>
      ) : (
        <div className="trip-grid">
          {trips.map((trip) => (
            <TripCard key={trip.$id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
