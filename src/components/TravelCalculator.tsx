import React, { useState, useEffect } from 'react';
import { ArrowLeft, Car, MapPin, Loader2, AlertCircle, CloudRain, Sun, Wind, Cloud, Map, Share2, Check } from 'lucide-react';
import TravelMap from './TravelMap';

export default function TravelCalculator({ onBack }) {
  const [startLoc, setStartLoc] = useState('');
  const [endLoc, setEndLoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [routeInfo, setRouteInfo] = useState(null);
  const [windows, setWindows] = useState([]);
  const [routeCoords, setRouteCoords] = useState(null);
  const [sampledPoints, setSampledPoints] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [copied, setCopied] = useState(false);

  const calculateRoute = async (start = startLoc, end = endLoc) => {
    if (!start || !end) return;
    setLoading(true);
    setError(null);
    setRouteInfo(null);
    setWindows([]);

    try {
      const geocode = async (query) => {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
        if (!res.ok) throw new Error(`Geocoding failed for ${query}`);
        const data = await res.json();
        if (!data.results || data.results.length === 0) throw new Error(`Could not find location: ${query}`);
        return data.results[0];
      };

      // 1. Geocode Start and End
      const startObj = await geocode(start);
      const endObj = await geocode(end);

      // 2. Fetch Route from OSRM
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startObj.longitude},${startObj.latitude};${endObj.longitude},${endObj.latitude}?overview=full&geometries=geojson`;
      const osrmRes = await fetch(osrmUrl);
      if (!osrmRes.ok) throw new Error('Failed to fetch route. Make sure locations are reachable by car.');
      const osrmData = await osrmRes.json();
      
      if (osrmData.code !== 'Ok' || !osrmData.routes || osrmData.routes.length === 0) {
        throw new Error('No driving route found between these locations.');
      }

      const route = osrmData.routes[0];
      const durationSeconds = route.duration;
      const distanceMiles = route.distance * 0.000621371; // meters to miles
      const coords = route.geometry.coordinates;

      // 3. Sample Points (1 every 45 mins = 2700 seconds)
      const intervalSecs = 2700;
      const numPoints = Math.max(2, Math.ceil(durationSeconds / intervalSecs) + 1);
      
      const sampledCoords = [];
      for (let i = 0; i < numPoints; i++) {
        // Approximate the index based on assuming constant speed along the coordinate array
        // It's a simplification, but effective enough for weather.
        let idx = Math.floor((i / (numPoints - 1)) * (coords.length - 1));
        if (idx >= coords.length) idx = coords.length - 1;
        sampledCoords.push(coords[idx]);
      }

      setRouteInfo({
        startName: `${startObj.name}, ${startObj.admin1 || ''}`,
        endName: `${endObj.name}, ${endObj.admin1 || ''}`,
        durationMins: Math.round(durationSeconds / 60),
        distanceMiles: Math.round(distanceMiles),
        pointsCount: sampledCoords.length
      });

      // 4. Fetch Weather for Sampled Points
      const lats = sampledCoords.map(c => c[1]).join(',');
      const lons = sampledCoords.map(c => c[0]).join(',');
      
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&hourly=temperature_2m,precipitation,weathercode,wind_speed_10m&forecast_days=2&timezone=auto&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph`;
      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error('Failed to fetch weather data for the route.');
      
      // Open-Meteo returns an array if multiple locations are requested, or a single object if only 1 location.
      let fetchedWeatherData = await weatherRes.json();
      if (!Array.isArray(fetchedWeatherData)) {
         fetchedWeatherData = [fetchedWeatherData];
      }

      setRouteCoords(coords);
      setSampledPoints(sampledCoords);
      setWeatherData(fetchedWeatherData);

      // 5. Analyze Hourly Travel Windows
      const now = new Date();
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      
      const analyzedWindows = [];

      // Check leaving times for the next 24 hours
      for (let h = 0; h < 24; h++) {
        const leaveTime = new Date(currentHour.getTime() + h * 3600 * 1000);
        let windowStatus = 'ideal'; // 'ideal', 'warning', 'bad'
        let issues = [];
        let maxPrecip = 0;
        let maxWind = 0;

        for (let p = 0; p < sampledCoords.length; p++) {
          // Time we reach point p
          const pointTime = new Date(leaveTime.getTime() + p * intervalSecs * 1000);
          
          // Find corresponding hour index in weatherData[p]
          // Open-Meteo hourly.time is like "2023-08-01T14:00"
          const pointWeather = fetchedWeatherData[p];
          if (!pointWeather || !pointWeather.hourly) continue;
          
          let closestIdx = 0;
          let minDiff = Infinity;
          
          pointWeather.hourly.time.forEach((timeStr, idx) => {
            const t = new Date(timeStr + 'Z').getTime() - (pointWeather.utc_offset_seconds * 1000);
            const diff = Math.abs(t - pointTime.getTime());
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = idx;
            }
          });

          const precip = pointWeather.hourly.precipitation[closestIdx] || 0;
          const wind = pointWeather.hourly.wind_speed_10m[closestIdx] || 0;
          const temp = pointWeather.hourly.temperature_2m[closestIdx] || 0;

          if (precip > maxPrecip) maxPrecip = precip;
          if (wind > maxWind) maxWind = wind;

          if (precip > 0) {
            windowStatus = 'bad';
            if (!issues.includes('Rain/Snow')) issues.push('Rain/Snow');
          } else if (wind > 25) {
            if (windowStatus === 'ideal') windowStatus = 'warning';
            if (!issues.includes('High Winds')) issues.push('High Winds');
          }
        }

        analyzedWindows.push({
          leaveTime,
          arriveTime: new Date(leaveTime.getTime() + durationSeconds * 1000),
          status: windowStatus,
          issues: issues.length > 0 ? issues.join(', ') : 'Clear conditions',
          maxPrecip,
          maxWind
        });
      }

      setWindows(analyzedWindows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = urlParams.get('start');
    const endParam = urlParams.get('end');
    
    if (startParam) setStartLoc(startParam);
    if (endParam) setEndLoc(endParam);
    
    if (startParam && endParam) {
      calculateRoute(startParam, endParam);
    }
  }, []);

  const getStatusColor = (status) => {
    if (status === 'ideal') return 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-300';
    if (status === 'warning') return 'bg-yellow-100 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800/50 dark:text-yellow-300';
    return 'bg-rose-100 border-rose-200 text-rose-800 dark:bg-rose-900/30 dark:border-rose-800/50 dark:text-rose-300';
  };

  const getStatusIcon = (status) => {
    if (status === 'ideal') return <Sun className="w-5 h-5 text-emerald-500" />;
    if (status === 'warning') return <Wind className="w-5 h-5 text-yellow-500" />;
    return <CloudRain className="w-5 h-5 text-rose-500" />;
  };

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?page=travel&start=${encodeURIComponent(startLoc)}&end=${encodeURIComponent(endLoc)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col h-[850px] max-h-[90vh] relative">
        
        {/* Header Block */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-5 py-4 border-b border-transparent dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={onBack}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                title="Back to Home"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-400" />
                <h1 className="text-base font-bold tracking-tight">Travel Calculator</h1>
              </div>
            </div>
            <button 
              onClick={handleShare}
              disabled={!startLoc || !endLoc}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
              title="Share Route"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Input Section */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 space-y-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <MapPin className="w-4 h-4 text-blue-500" />
              </div>
              <input 
                type="text" 
                placeholder="Start ZIP or City (e.g. 60603)" 
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-shadow"
                value={startLoc}
                onChange={(e) => setStartLoc(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <MapPin className="w-4 h-4 text-rose-500" />
              </div>
              <input 
                type="text" 
                placeholder="End ZIP or City (e.g. Detroit, MI)" 
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-shadow"
                value={endLoc}
                onChange={(e) => setEndLoc(e.target.value)}
              />
            </div>

            <button 
              onClick={() => calculateRoute()}
              disabled={loading || !startLoc || !endLoc}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Map className="w-5 h-5" />}
              {loading ? 'Analyzing Route...' : 'Calculate Route'}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {routeInfo && (
            <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/30 text-indigo-900 dark:text-indigo-200 text-sm">
              <p className="font-bold mb-2">Trip Summary</p>
              <div className="flex justify-between items-center bg-white dark:bg-indigo-900/40 p-3 rounded-xl border border-indigo-50 dark:border-indigo-800/50">
                <div className="text-center">
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 uppercase font-bold tracking-wider">Distance</p>
                  <p className="font-black text-lg">{routeInfo.distanceMiles} mi</p>
                </div>
                <div className="w-px h-8 bg-indigo-200 dark:bg-indigo-800"></div>
                <div className="text-center">
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 uppercase font-bold tracking-wider">Est. Drive Time</p>
                  <p className="font-black text-lg">{Math.floor(routeInfo.durationMins / 60)}h {routeInfo.durationMins % 60}m</p>
                </div>
              </div>
              <p className="text-[10px] text-center mt-3 text-indigo-400 dark:text-indigo-500 font-medium">
                Checking weather at {routeInfo.pointsCount} points along the route (~every 45 mins).
              </p>
              <button 
                onClick={() => setShowMap(true)}
                className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Map className="w-4 h-4" />
                View Interactive Map
              </button>
            </div>
          )}

          {windows.length > 0 && (
            <div className="space-y-3 pb-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur py-2 z-10">Departure Windows</h3>
              <div className="space-y-2">
                {windows.map((win, i) => (
                  <div key={i} className={`rounded-xl p-3 border shadow-sm flex items-center justify-between ${getStatusColor(win.status)}`}>
                    <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-950 p-2 rounded-lg shadow-sm">
                        {getStatusIcon(win.status)}
                      </div>
                      <div>
                        <p className="font-bold text-sm">
                          Leave: {win.leaveTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] font-bold uppercase opacity-80 mt-0.5 tracking-wide">
                          Arrive ~{win.arriveTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{win.issues}</p>
                      {win.maxPrecip > 0 && (
                        <p className="text-[10px] font-bold opacity-80">Max Rain: {win.maxPrecip.toFixed(2)}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {showMap && routeCoords && sampledPoints && weatherData && (
          <TravelMap 
            routeCoords={routeCoords}
            sampledPoints={sampledPoints}
            weatherData={weatherData}
            durationMins={routeInfo.durationMins}
            onClose={() => setShowMap(false)}
          />
        )}
      </div>
    </div>
  );
}
