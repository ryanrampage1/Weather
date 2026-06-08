import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, MapPin, Loader2, AlertCircle, RefreshCw, Thermometer, Droplets, Smile, ChevronLeft, ChevronRight, Leaf, ChevronDown, ChevronUp, Radar } from 'lucide-react';

export default function App() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationName, setLocationName] = useState("Chicago, IL");
  const [dateOffset, setDateOffset] = useState(0); // 0 = Today, -1 = Yesterday, 1 = Tomorrow...
  const [showMowInfo, setShowMowInfo] = useState(false);
  const [coords, setCoords] = useState({ lat: 41.8781, lon: -87.6298 });
  
  // Default coordinates (Chicago, IL 60603)
  const defaultLat = 41.8781;
  const defaultLon = -87.6298;

  const fetchWeather = async (lat, lon, name) => {
    setLoading(true);
    setError(null);
    try {
      // Expanded API call: past_days=7, forecast_days=7 (14 days total).
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation,uv_index,temperature_2m&daily=uv_index_max,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode&hourly=precipitation,uv_index,temperature_2m,precipitation_probability&past_days=7&forecast_days=7&timezone=auto&precipitation_unit=inch&temperature_unit=fahrenheit`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Failed to fetch weather data');
      
      const data = await res.json();
      
      // Calculate current hour index to do rolling 24h math for "Today"
      const nowTime = new Date().getTime();
      let currentHourIdx = 0;
      let minDiff = Infinity;
      data.hourly.time.forEach((t, i) => {
         const diff = Math.abs(new Date(t).getTime() - nowTime);
         if (diff < minDiff) {
             minDiff = diff;
             currentHourIdx = i;
         }
      });

      const rainPast24 = data.hourly.precipitation.slice(Math.max(0, currentHourIdx - 24), currentHourIdx).reduce((a, b) => a + (b || 0), 0);
      const rainNext12 = data.hourly.precipitation.slice(currentHourIdx, currentHourIdx + 12).reduce((a, b) => a + (b || 0), 0);

      setWeather({
        raw: data,
        currentHourIdx,
        rainPast24: Number(rainPast24.toFixed(2)),
        rainNext12: Number(rainNext12.toFixed(2))
      });
      
      setCoords({ lat, lon });
      if (name) setLocationName(name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(defaultLat, defaultLon, "Chicago, IL");
  }, []);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather(position.coords.latitude, position.coords.longitude, "Your Current Location");
      },
      (err) => {
        console.warn(err);
        setError("Location access denied. Showing default location.");
        fetchWeather(defaultLat, defaultLon, "Chicago, IL");
      },
      { timeout: 10000 }
    );
  };

  const getUvSeverity = (uv) => {
    if (uv <= 2) return { text: "Low", color: "text-green-600", bg: "bg-green-100" };
    if (uv <= 5) return { text: "Moderate", color: "text-yellow-600", bg: "bg-yellow-100" };
    if (uv <= 7) return { text: "High", color: "text-orange-600", bg: "bg-orange-100" };
    if (uv <= 10) return { text: "Very High", color: "text-red-600", bg: "bg-red-100" };
    return { text: "Extreme", color: "text-purple-600", bg: "bg-purple-100" };
  };

  // --- Rendering Logic based on dateOffset ---
  const isToday = dateOffset === 0;
  // API returns past_days=7, meaning index 0 is 7 days ago, index 7 is Today.
  const dailyIndex = dateOffset + 7; 

  let displayDateLabel = "";
  let targetHourlyData = [];
  let groupedWindows = [];
  let bestMowingDays = [];

  if (weather && weather.raw.daily.time[dailyIndex]) {
    const rawDaily = weather.raw.daily;
    const rawHourly = weather.raw.hourly;
    const targetDateStr = rawDaily.time[dailyIndex]; // e.g. "2026-06-08"

    // Timezone safe date formatting
    const [y, m, d] = targetDateStr.split('-');
    const baseDateString = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    
    if (dateOffset === 0) displayDateLabel = `Today, ${baseDateString}`;
    else if (dateOffset === 1) displayDateLabel = `Tomorrow, ${baseDateString}`;
    else if (dateOffset === -1) displayDateLabel = `Yesterday, ${baseDateString}`;
    else displayDateLabel = baseDateString;

    // Filter Hourly Data strictly for the selected day (6 AM to 8 PM)
    rawHourly.time.forEach((t, i) => {
      if (t.startsWith(targetDateStr)) {
          // Parse hour manually to avoid browser timezone shifts overriding the API's auto timezone
          const timePart = t.split('T')[1];
          const rawHour = parseInt(timePart.split(':')[0], 10);
          
          if (rawHour >= 6 && rawHour <= 20) {
              const ampm = rawHour >= 12 ? 'PM' : 'AM';
              const displayHour = rawHour % 12 || 12;
              targetHourlyData.push({
                  time: `${displayHour} ${ampm}`,
                  rawHour: rawHour,
                  uv: Number(rawHourly.uv_index[i]?.toFixed(1) || 0),
                  temp: Math.round(rawHourly.temperature_2m[i]),
                  precipProb: rawHourly.precipitation_probability[i] || 0,
                  precipAmount: Number(rawHourly.precipitation[i] || 0)
              });
          }
      }
    });

    // Group valid kids play hours into digestible schedule blocks
    const playWindows = targetHourlyData.filter(h => 
      h.uv < 4 && h.precipAmount === 0 && h.rawHour >= 6 && h.rawHour <= 19
    );

    if (playWindows.length > 0) {
      let currentGroup = [playWindows[0]];
      for (let i = 1; i < playWindows.length; i++) {
        if (playWindows[i].rawHour === currentGroup[currentGroup.length - 1].rawHour + 1) {
          currentGroup.push(playWindows[i]);
        } else {
          groupedWindows.push(currentGroup);
          currentGroup = [playWindows[i]];
        }
      }
      groupedWindows.push(currentGroup);
    }

    // --- Mowing Algorithm (Looks at Next 7 Days regardless of selected date) ---
    for (let i = 7; i <= 13; i++) {
      const rain = rawDaily.precipitation_sum[i];
      const prevRain = rawDaily.precipitation_sum[i - 1]; // Look at yesterday to check for wet grass
      const maxTemp = rawDaily.temperature_2m_max[i];
      const dateStr = rawDaily.time[i];
      
      const [y, m, d] = dateStr.split('-');
      let dayName = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' });
      if (i === 7) dayName = "Today";
      if (i === 8) dayName = "Tomorrow";

      // Core Rule: It cannot rain today.
      if (rain <= 0.05) { 
        let score = 10;
        let tip = "Prime mowing conditions";
        
        // Penalize and adjust tips based on surrounding data
        if (prevRain > 0.15) {
          score -= 3;
          tip = "Wait for PM (let grass dry)";
        } else if (maxTemp > 85) {
          score -= 2;
          tip = "Mow early (gets hot)";
        } else if (maxTemp < 55) {
          score -= 2;
          tip = "Chilly, but dry";
        }

        bestMowingDays.push({ dayName, maxTemp, tip, score, dateStr });
      }
    }
    
    // Sort by best score. If scores are tied, prioritize the sooner date.
    bestMowingDays.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.dateStr.localeCompare(b.dateStr);
    });
    
    // Only return the top 3 options
    bestMowingDays = bestMowingDays.slice(0, 3);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header Block */}
        <div className="bg-slate-900 text-white px-5 py-4 pb-5">
          {/* Top Control Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 pr-4 overflow-hidden">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <h1 className="text-base font-bold tracking-tight truncate">{locationName}</h1>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={() => fetchWeather(defaultLat, defaultLon, locationName)}
                disabled={loading}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={getUserLocation}
                disabled={loading}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                title="Use my location"
              >
                <MapPin className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Date Navigator */}
          <div className="bg-slate-800/80 rounded-2xl p-1.5 flex flex-col">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setDateOffset(d => Math.max(-7, d - 1))}
                disabled={loading || dateOffset === -7}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5 text-slate-300" />
              </button>
              
              <div className="flex flex-col items-center justify-center flex-1">
                {loading && !weather ? (
                  <div className="h-5 w-24 bg-slate-700 animate-pulse rounded"></div>
                ) : (
                  <span className="font-bold text-[15px] tracking-wide">{displayDateLabel}</span>
                )}
              </div>
              
              <button 
                onClick={() => setDateOffset(d => Math.min(6, d + 1))}
                disabled={loading || dateOffset === 6}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            
            {/* Go back to today button */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out flex justify-center ${!isToday ? 'h-6 opacity-100 mt-0.5' : 'h-0 opacity-0'}`}>
               <button 
                 onClick={() => setDateOffset(0)} 
                 className="text-[10px] uppercase tracking-wider font-bold text-blue-400 hover:text-blue-300 px-4 py-1"
               >
                  • Return to Today •
               </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {loading && !weather ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
              <p>Fetching local radar and sensors...</p>
            </div>
          ) : weather && weather.raw.daily.time[dailyIndex] ? (
            <div className="space-y-6">
              
              {/* Daily / Current Summary Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Temp Box */}
                <div className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-orange-100 text-center shadow-sm">
                  <Thermometer className="w-5 h-5 text-orange-500 mb-1" />
                  <span className="text-3xl font-black text-orange-900 tracking-tighter">
                    {isToday ? Math.round(weather.raw.current.temperature_2m) : Math.round(weather.raw.daily.temperature_2m_max[dailyIndex])}°
                  </span>
                  <span className="text-[10px] font-bold uppercase mt-1 text-orange-600">
                    {isToday ? 'Current' : 'Daily High'}
                  </span>
                  <span className="text-[10px] font-bold text-orange-700/60 uppercase mt-0.5 whitespace-nowrap">
                    H: {Math.round(weather.raw.daily.temperature_2m_max[dailyIndex])}° L: {Math.round(weather.raw.daily.temperature_2m_min[dailyIndex])}°
                  </span>
                </div>

                {/* Rain Box */}
                <div className="bg-blue-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-blue-100 text-center shadow-sm">
                  <CloudRain className="w-5 h-5 text-blue-500 mb-1" />
                  <span className="text-2xl font-black text-blue-900 tracking-tighter">
                    {isToday ? weather.rainPast24 : weather.raw.daily.precipitation_sum[dailyIndex].toFixed(2)}"
                  </span>
                  <span className="text-[10px] font-bold uppercase mt-1 text-blue-600">
                    {isToday ? 'Past 24h' : 'Total Rain'}
                  </span>
                  {isToday ? (
                    <div className="mt-0.5 flex flex-col gap-0 text-[9px] font-bold text-blue-700/60 uppercase whitespace-nowrap">
                      <span>Current: {weather.raw.current.precipitation}"</span>
                      <span>Next 12h: {weather.rainNext12}"</span>
                    </div>
                  ) : (
                    <div className="mt-0.5 flex flex-col gap-0 text-[9px] font-bold text-blue-700/60 uppercase whitespace-nowrap">
                      <span>Max Prob: {weather.raw.daily.precipitation_probability_max[dailyIndex]}%</span>
                    </div>
                  )}
                </div>

                {/* UV Box */}
                <div className="bg-amber-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-amber-100 text-center shadow-sm">
                  <Sun className="w-5 h-5 text-amber-500 mb-1" />
                  <span className="text-2xl font-black text-amber-900 tracking-tighter">
                    {isToday ? weather.raw.current.uv_index : weather.raw.daily.uv_index_max[dailyIndex]}
                  </span>
                  <span className={`text-[10px] font-bold uppercase mt-1 ${getUvSeverity(isToday ? weather.raw.current.uv_index : weather.raw.daily.uv_index_max[dailyIndex]).color}`}>
                    {getUvSeverity(isToday ? weather.raw.current.uv_index : weather.raw.daily.uv_index_max[dailyIndex]).text}
                  </span>
                  <span className="text-[10px] font-bold text-amber-700/60 uppercase mt-0.5">
                    Peak: {weather.raw.daily.uv_index_max[dailyIndex]}
                  </span>
                </div>
              </div>

              {/* Unified 12-Hour Timeline */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-4">Hourly Detail (6 AM - 8 PM)</p>
                <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
                  {targetHourlyData.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center shrink-0 space-y-2">
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{item.time}</span>
                      <span className="text-lg font-bold text-slate-800">{item.temp}°</span>
                      <div className="flex items-center gap-0.5 text-blue-500 font-semibold mb-1">
                        <Droplets className="w-3 h-3" />
                        <span className="text-[10px]">{item.precipProb}%</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getUvSeverity(item.uv).bg} ${getUvSeverity(item.uv).color}`}>
                        UV {item.uv}
                      </div>
                      <span className={`text-[10px] font-bold mt-1 ${item.precipAmount > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                        {item.precipAmount > 0 ? item.precipAmount.toFixed(2) : '0'}"
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Radar (Only visible when viewing Today) */}
              {isToday && (
                <div className="bg-white rounded-2xl p-1 border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-50">
                    <Radar className="w-4 h-4 text-blue-500" />
                    <p className="text-xs text-slate-800 uppercase tracking-wider font-bold">Live Doppler</p>
                  </div>
                  <div className="h-64 w-full bg-slate-100 relative pointer-events-auto">
                     <iframe
                        width="100%"
                        height="100%"
                        src={`https://embed.windy.com/embed2.html?lat=${coords.lat}&lon=${coords.lon}&zoom=8&level=surface&overlay=radar&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=mph&metricTemp=%C2%B0F&radarRange=-1`}
                        frameBorder="0"
                        title="Live Weather Radar"
                        className="absolute inset-0"
                     ></iframe>
                  </div>
                </div>
              )}

              {/* Kids Outdoor Windows */}
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Smile className="w-5 h-5 text-emerald-500" />
                  <p className="text-xs text-emerald-800 uppercase tracking-wider font-bold">Ideal Play Windows</p>
                </div>
                <p className="text-[10px] font-bold text-emerald-600/70 uppercase mb-4">
                  6 AM to 7 PM • UV &lt; 4 • No Rain
                </p>

                {groupedWindows.length > 0 ? (
                  <div className="space-y-2">
                    {groupedWindows.map((group, idx) => {
                      const isSingleHour = group.length === 1;
                      const timeLabel = isSingleHour 
                        ? group[0].time 
                        : `${group[0].time} - ${group[group.length - 1].time}`;
                      
                      const avgTemp = Math.round(group.reduce((sum, h) => sum + h.temp, 0) / group.length);
                      const avgUv = (group.reduce((sum, h) => sum + h.uv, 0) / group.length).toFixed(1);
                      const avgPrecipProb = Math.round(group.reduce((sum, h) => sum + h.precipProb, 0) / group.length);

                      return (
                        <div key={idx} className="bg-white rounded-xl p-3 border border-emerald-200/60 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-emerald-400 rounded-full"></div>
                            <div>
                              <h3 className="text-sm font-bold text-emerald-950">{timeLabel}</h3>
                              <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wide">
                                {group.length} {group.length === 1 ? 'Hour' : 'Hours'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex flex-col justify-center items-center">
                              <span className="text-base font-black text-emerald-800 leading-none">{avgPrecipProb}%</span>
                              <span className="text-[9px] font-bold text-emerald-500 uppercase mt-0.5">Rain</span>
                            </div>
                            <div className="flex flex-col justify-center items-center">
                              <span className="text-base font-black text-emerald-800 leading-none">{avgUv}</span>
                              <span className="text-[9px] font-bold text-emerald-500 uppercase mt-0.5">UV</span>
                            </div>
                            <div className="flex flex-col justify-center items-center">
                              <span className="text-base font-black text-emerald-800 leading-none">{avgTemp}°</span>
                              <span className="text-[9px] font-bold text-emerald-500 uppercase mt-0.5">Temp</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white/50 rounded-xl p-4 border border-emerald-100 text-center text-sm font-medium text-emerald-800/70">
                    No ideal outdoor windows matching criteria for this day. Time for indoor activities!
                  </div>
                )}
              </div>

              {/* Lawn Care Planner (Weekly Context) */}
              <div className="bg-lime-50 rounded-2xl p-5 border border-lime-100 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-lime-600" />
                    <p className="text-xs text-lime-900 uppercase tracking-wider font-bold">Lawn Care Planner</p>
                  </div>
                  <button 
                    onClick={() => setShowMowInfo(!showMowInfo)}
                    className="p-1.5 hover:bg-lime-200/50 rounded-full transition-colors"
                    title="View algorithm criteria"
                  >
                    {showMowInfo ? <ChevronUp className="w-4 h-4 text-lime-700" /> : <ChevronDown className="w-4 h-4 text-lime-700" />}
                  </button>
                </div>
                <p className="text-[10px] font-bold text-lime-700/70 uppercase mb-4">
                  Top upcoming days to mow
                </p>

                {/* Expanding Info Box */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showMowInfo ? 'max-h-48 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                  <div className="p-3 bg-lime-100/50 rounded-xl border border-lime-200/50 text-xs text-lime-900/80 space-y-1">
                    <p className="font-bold text-lime-900 mb-1 border-b border-lime-200 pb-1">Scoring Criteria:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Dry Rule:</strong> Must have &lt; 0.05" of rain.</li>
                      <li><strong>Soggy Turf:</strong> Penalized if it rained &gt; 0.15" the day prior.</li>
                      <li><strong>Heat Stress:</strong> Penalized if high temp &gt; 85°F.</li>
                      <li><strong>Cold Snap:</strong> Penalized if high temp &lt; 55°F.</li>
                    </ul>
                  </div>
                </div>

                {bestMowingDays.length > 0 ? (
                  <div className="space-y-2">
                    {bestMowingDays.map((day, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-3 border border-lime-200/60 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-lime-500 text-white shadow-sm' : 'bg-lime-100 text-lime-700'}`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-lime-950">{day.dayName}</h3>
                            <p className="text-[10px] font-bold text-lime-600/70 uppercase tracking-wide">
                              {day.tip}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center items-end">
                          <span className="text-base font-black text-lime-800 leading-none">{Math.round(day.maxTemp)}°</span>
                          <span className="text-[9px] font-bold text-lime-500 uppercase mt-0.5">High</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/50 rounded-xl p-4 border border-lime-100 text-center text-sm font-medium text-lime-800/70">
                    No ideal mowing days in the next week due to rain. Let it grow!
                  </div>
                )}
              </div>

            </div>
          ) : null}
          
        </div>
      </div>

      {/* Sources Footer */}
      <div className="mt-8 text-center text-xs text-slate-400">
        <p>
          Data powered by{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-slate-600 transition-colors underline decoration-slate-300 underline-offset-2">
            Open-Meteo
          </a>
        </p>
        <p className="mt-1 opacity-75">
          Underlying models by NWS, NOAA & ECMWF
        </p>
      </div>
    </div>
  );
}