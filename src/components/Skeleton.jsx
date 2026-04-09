export function SkeletonTripGrid({ count = 6 }) {
  return (
    <div className="trip-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="skeleton-card-top">
            <div className="skeleton skeleton-text" style={{ width: '70%', height: '1rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '40%', height: '0.75rem', marginTop: '0.5rem' }} />
          </div>
          <div className="skeleton-card-bottom">
            <div className="skeleton skeleton-text" style={{ width: '90%', height: '0.7rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '60%', height: '0.7rem', marginTop: '0.35rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <div className="skeleton skeleton-text" style={{ width: '260px', height: '1.5rem' }} />
          <div className="skeleton skeleton-text" style={{ width: '160px', height: '0.9rem', marginTop: '0.5rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '60px', height: '34px', borderRadius: 'var(--radius)' }} />
          <div className="skeleton" style={{ width: '70px', height: '34px', borderRadius: 'var(--radius)' }} />
        </div>
      </div>
      <div className="skeleton-stats-grid">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton-stat-item">
            <div className="skeleton skeleton-text" style={{ width: '50%', height: '0.6rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '70%', height: '0.9rem', marginTop: '0.35rem' }} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: '2rem' }}>
        <div className="skeleton skeleton-text" style={{ width: '120px', height: '1rem', marginBottom: '0.75rem' }} />
        <div className="skeleton" style={{ width: '100%', height: '80px', borderRadius: 'var(--radius)' }} />
      </div>
    </div>
  );
}

export function SkeletonCalendar({ count = 6 }) {
  return (
    <div className="cal-months">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-cal-month">
          <div className="skeleton skeleton-text" style={{ width: '60%', height: '0.9rem', margin: '0 auto 0.65rem' }} />
          <div className="skeleton-cal-grid">
            {Array.from({ length: 35 }, (_, j) => (
              <div key={j} className="skeleton skeleton-cal-cell" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
