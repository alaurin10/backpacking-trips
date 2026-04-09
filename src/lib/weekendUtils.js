function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Find Saturday keys for weekends whose Sat/Sun days overlap with a date range
export function getOverlappingWeekends(startDate, endDate) {
  if (!startDate) return [];
  const start = new Date(startDate + 'T00:00:00');
  const end = endDate ? new Date(endDate + 'T00:00:00') : new Date(start);
  const weekendKeys = new Set();
  const d = new Date(start);
  while (d <= end) {
    const dow = d.getDay();
    if (dow === 6) {
      weekendKeys.add(isoFromDate(d));
    } else if (dow === 0) {
      const sat = new Date(d);
      sat.setDate(sat.getDate() - 1);
      weekendKeys.add(isoFromDate(sat));
    }
    d.setDate(d.getDate() + 1);
  }
  return [...weekendKeys];
}

// Compute the set of Saturday keys where a person is busy due to trip interest
export function computeBusyWeekends(personName, tripInterests, trips, excludeTripId) {
  const busy = new Set();
  const interests = tripInterests.filter(
    (i) => i.personName === personName && (!excludeTripId || i.tripId !== excludeTripId)
  );
  for (const interest of interests) {
    const trip = trips.find((t) => t.$id === interest.tripId);
    if (trip?.startDate) {
      for (const w of getOverlappingWeekends(trip.startDate, trip.endDate)) {
        busy.add(w);
      }
    }
  }
  return busy;
}
