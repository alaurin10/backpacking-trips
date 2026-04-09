import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { gpx } from '@tmcw/togeojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function FitBounds({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson) return;
    try {
      const bounds = L.geoJSON(geojson).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24] });
      }
    } catch {
      // ignore invalid bounds
    }
  }, [geojson, map]);
  return null;
}

export default function RouteMap({ gpxUrl }) {
  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!gpxUrl) {
      setGeojson(null);
      return;
    }
    setLoading(true);
    setError(null);
    setGeojson(null);

    fetch(gpxUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load GPX (${r.status})`);
        return r.text();
      })
      .then((text) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'application/xml');
        const gj = gpx(xmlDoc);
        setGeojson(gj);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [gpxUrl]);

  if (loading) {
    return <div className="route-map-placeholder">Loading route...</div>;
  }

  if (error) {
    return (
      <div className="route-map-placeholder route-map-error">
        Could not load route: {error}
      </div>
    );
  }

  return (
    <MapContainer
      center={[39, -105]}
      zoom={8}
      className="route-map"
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
        maxZoom={17}
      />
      {geojson && (
        <>
          <GeoJSON
            key={gpxUrl}
            data={geojson}
            style={{ color: '#3d6b45', weight: 3, opacity: 0.9 }}
          />
          <FitBounds geojson={geojson} />
        </>
      )}
    </MapContainer>
  );
}
