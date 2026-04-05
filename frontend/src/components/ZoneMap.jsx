import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const INDIA_CENTER = [22.5, 78.9];
const RISK_COLORS = { high: "#EF4444", medium: "#F59E0B", low: "#10B981" };

function FitBounds({ zones }) {
  const map = useMap();
  useEffect(() => {
    if (zones.length > 0) {
      const bounds = zones.filter(z => z.lat && z.lng).map(z => [z.lat, z.lng]);
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    }
  }, [zones, map]);
  return null;
}

export default function ZoneMap({ zones = [], selectedPins = [], onZoneClick, height = 180, showWeather = false }) {
  const validZones = zones.filter(z => z.lat && z.lng);

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 8 }}>
      <MapContainer
        center={validZones.length > 0 ? [validZones[0].lat, validZones[0].lng] : INDIA_CENTER}
        zoom={validZones.length > 0 ? 11 : 5}
        style={{ height, width: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds zones={validZones} />

        {validZones.map((zone, idx) => {
          const key = zone.pin || `${zone.lat}-${zone.lng}`;
          const isSelected = selectedPins.includes(key) || selectedPins.includes(`${zone.lat}`);
          const risk = zone.risk_level || "medium";
          const color = isSelected ? "#1A56A0" : RISK_COLORS[risk] || "#F59E0B";

          return (
            <CircleMarker
              key={key + idx}
              center={[zone.lat, zone.lng]}
              radius={isSelected ? 12 : 9}
              pathOptions={{ color, fillColor: color, fillOpacity: isSelected ? 0.6 : 0.35, weight: isSelected ? 3 : 2 }}
              eventHandlers={{ click: () => onZoneClick && onZoneClick(zone) }}
            >
              <Popup>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, minWidth: 130 }}>
                  <strong style={{ fontSize: 12.5 }}>{zone.name}</strong>
                  <br />
                  <span style={{ color: RISK_COLORS[risk], fontWeight: 600, textTransform: "uppercase", fontSize: 10 }}>
                    {risk} risk
                  </span>
                  {showWeather && zone.weather && (
                    <div style={{ marginTop: 5, borderTop: "1px solid #e2e8f0", paddingTop: 4, fontSize: 11 }}>
                      <div>{zone.weather.condition || ""}</div>
                      <div>Temp: {zone.weather.temperature}°C (feels {zone.weather.feels_like}°C)</div>
                      <div>Rain: {zone.weather.rain_mm}mm | Wind: {zone.weather.wind_kmh}km/h</div>
                      {zone.aqi && <div>AQI: {zone.aqi.us_aqi} ({zone.aqi.category})</div>}
                      {zone.active_triggers > 0 && (
                        <div style={{ color: "#EF4444", fontWeight: 600, marginTop: 2 }}>
                          {zone.active_triggers} trigger(s) active!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
