import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { ArrowLeft, Clock, CloudRain, Sun, Wind, Cloud } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export default function TravelMap({ routeCoords, sampledPoints, weatherData, onClose, durationMins }) {
  const [hourOffset, setHourOffset] = useState(0);

  // Compute map bounds to fit the entire route
  const bounds = useMemo(() => {
    if (!routeCoords || routeCoords.length === 0) return null;
    const lats = routeCoords.map(c => c[1]);
    const lons = routeCoords.map(c => c[0]);
    return [
      [Math.min(...lats), Math.min(...lons)] as [number, number],
      [Math.max(...lats), Math.max(...lons)] as [number, number]
    ];
  }, [routeCoords]);

  // Leaflet uses [lat, lon]
  const polylinePositions = useMemo(() => {
    return routeCoords.map(c => [c[1], c[0]] as [number, number]);
  }, [routeCoords]);

  const now = new Date();
  const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const selectedTime = new Date(currentHour.getTime() + hourOffset * 3600 * 1000);

  const createCustomIcon = (temp, precip, wind) => {
    let IconComponent = Sun;
    let colorClass = "text-emerald-500";
    let bgClass = "border-emerald-200";

    if (precip > 0) {
      IconComponent = CloudRain;
      colorClass = "text-rose-500";
      bgClass = "border-rose-300";
    } else if (wind > 25) {
      IconComponent = Wind;
      colorClass = "text-yellow-500";
      bgClass = "border-yellow-300";
    }

    const htmlString = renderToString(
      <div className={`flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 ${bgClass} p-1.5 min-w-[48px]`}>
        <IconComponent className={`w-5 h-5 ${colorClass}`} />
        <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 leading-none">{temp}°</span>
      </div>
    );

    return L.divIcon({
      html: htmlString,
      className: 'bg-transparent border-none',
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
  };

  if (!bounds) return null;

  return (
    <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white leading-tight">Interactive Route Weather</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Time Travel Slider</p>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-slate-200 dark:bg-slate-800">
        <MapContainer bounds={bounds} className="w-full h-full" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <Polyline positions={polylinePositions} pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.8 }} />
          
          {sampledPoints.map((point, i) => {
            // Find weather for this point at the selected time
            const pointWeather = weatherData[i];
            if (!pointWeather || !pointWeather.hourly) return null;

            let closestIdx = 0;
            let minDiff = Infinity;
            
            pointWeather.hourly.time.forEach((timeStr, idx) => {
              const t = new Date(timeStr + 'Z').getTime() - (pointWeather.utc_offset_seconds * 1000);
              const diff = Math.abs(t - selectedTime.getTime());
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
              }
            });

            const temp = Math.round(pointWeather.hourly.temperature_2m[closestIdx]);
            const precip = pointWeather.hourly.precipitation[closestIdx] || 0;
            const wind = pointWeather.hourly.wind_speed_10m[closestIdx] || 0;

            const icon = createCustomIcon(temp, precip, wind);

            return (
              <Marker key={i} position={[point[1], point[0]] as [number, number]} icon={icon}>
                <Popup className="rounded-xl overflow-hidden">
                  <div className="p-1">
                    <p className="font-bold text-sm mb-1 text-slate-800">Point {i + 1}</p>
                    <p className="text-xs text-slate-600">Temp: {temp}°F</p>
                    <p className="text-xs text-slate-600">Rain: {precip}"</p>
                    <p className="text-xs text-slate-600">Wind: {wind} mph</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Slider Control Container */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-10 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Clock className="w-5 h-5" />
            <span className="font-bold text-lg">
              {hourOffset === 0 ? "Now" : `+${hourOffset} Hour${hourOffset > 1 ? 's' : ''}`}
            </span>
          </div>
          <span className="text-sm font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {selectedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', weekday: 'short' })}
          </span>
        </div>
        
        <div className="relative pt-2 pb-2">
          <input
            type="range"
            min="0"
            max="24"
            value={hourOffset}
            onChange={(e) => setHourOffset(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 px-1 uppercase tracking-wider">
            <span>Now</span>
            <span>+12h</span>
            <span>+24h</span>
          </div>
        </div>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4 font-medium">
          Slide to see how weather along the route changes over time.
        </p>
      </div>

    </div>
  );
}
