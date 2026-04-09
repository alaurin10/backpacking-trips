import { Link, useLocation } from 'react-router-dom';

export default function Nav() {
  const location = useLocation();

  return (
    <nav className="nav">
      <Link to="/" className="nav-brand">
        Backpacking Planner
      </Link>
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}>
          Trips
        </Link>
        <Link
          to="/availability"
          className={location.pathname === '/availability' ? 'nav-link active' : 'nav-link'}
        >
          Availability
        </Link>
      </div>
    </nav>
  );
}
