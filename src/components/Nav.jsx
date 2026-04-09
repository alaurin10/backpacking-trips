import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Nav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <nav className="nav">
      <Link to="/" className="nav-brand">
        Cascade Concrete Planner
      </Link>
      <button
        className={`hamburger${menuOpen ? ' hamburger-open' : ''}`}
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        <span /><span /><span />
      </button>
      <div className={`nav-links${menuOpen ? ' nav-links-open' : ''}`}>
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
