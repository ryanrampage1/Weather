import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Moon, MapPin, Loader2, AlertCircle, RefreshCw, Thermometer, Droplets, Smile, ChevronLeft, ChevronRight, Leaf, ChevronDown, ChevronUp, Radar, Settings, Sprout, Fan, Info, Car } from 'lucide-react';
import TravelCalculator from './components/TravelCalculator';

const defaultPrefs = {
  minTemp: 60,
  maxTemp: 90,
  maxUv: 5,
  maxHumidity: 70,
  maxWindSpeed: 15,
  allowRain: false
};

const SingleSlider = ({ min, max, value, onChange, colorClass, suffix = "" }) => {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative w-full h-6 flex items-center">
      <div className="absolute w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      <div className={`absolute h-2 rounded-full ${colorClass}`} style={{ width: `${percent}%` }}></div>
      <div 
        className="absolute h-5 w-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 pointer-events-none z-10"
        style={{ left: `calc(${percent}% - ${percent * 0.36}px)` }}
      >
        {value}{suffix}
      </div>
      <input 
        type="range" 
        min={min} max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute w-full h-full opacity-0 cursor-pointer appearance-none z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-9 [&::-webkit-slider-thumb]:h-5 [&::-moz-range-thumb]:w-9 [&::-moz-range-thumb]:h-5"
      />
    </div>
  );
};

const DualSlider = ({ min, max, minValue, maxValue, onChangeMin, onChangeMax }) => {
  const minPercent = ((minValue - min) / (max - min)) * 100;
  const maxPercent = ((maxValue - min) / (max - min)) * 100;
  
  return (
    <div className="relative w-full h-6 flex items-center">
      <div className="absolute w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      <div className="absolute h-2 bg-blue-500 rounded-l-full" style={{ left: 0, width: `${minPercent}%` }}></div>
      <div className="absolute h-2 bg-emerald-500" style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}></div>
      <div className="absolute h-2 bg-red-500 rounded-r-full" style={{ left: `${maxPercent}%`, width: `${100 - maxPercent}%` }}></div>

      <div 
        className="absolute h-5 w-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 pointer-events-none z-10"
        style={{ left: `calc(${minPercent}% - ${minPercent * 0.36}px)` }}
      >
        {minValue}°
      </div>

      <div 
        className="absolute h-5 w-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 pointer-events-none z-10"
        style={{ left: `calc(${maxPercent}% - ${maxPercent * 0.36}px)` }}
      >
        {maxValue}°
      </div>

      <input 
        type="range" 
        min={min} max={max} 
        value={minValue} 
        onChange={(e) => {
          const val = Math.min(Number(e.target.value), maxValue - 1);
          onChangeMin(val);
        }}
        className="absolute w-full h-full opacity-0 cursor-pointer appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-9 [&::-webkit-slider-thumb]:h-5 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-9 [&::-moz-range-thumb]:h-5 z-20"
      />

      <input 
        type="range" 
        min={min} max={max} 
        value={maxValue} 
        onChange={(e) => {
          const val = Math.max(Number(e.target.value), minValue + 1);
          onChangeMax(val);
        }}
        className="absolute w-full h-full opacity-0 cursor-pointer appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-9 [&::-webkit-slider-thumb]:h-5 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-9 [&::-moz-range-thumb]:h-5 z-20"
      />
    </div>
  );
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationName, setLocationName] = useState("Chicago, IL");
  const [dateOffset, setDateOffset] = useState(0); // 0 = Today, -1 = Yesterday, 1 = Tomorrow...
  const [showMowInfo, setShowMowInfo] = useState(false);
  const [showFertilizerInfo, setShowFertilizerInfo] = useState(false);
  const [showDataInfo, setShowDataInfo] = useState(false);
  const [coords, setCoords] = useState({ lat: 41.8781, lon: -87.6298 });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return JSON.parse(saved);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  }, [isDark]);

  const [playPrefs, setPlayPrefs] = useState(() => {
    const saved = localStorage.getItem('playPrefs');
    if (saved) {
      try {
        return { ...defaultPrefs, ...JSON.parse(saved) };
      } catch (e) {
        return defaultPrefs;
      }
    }
    return defaultPrefs;
  });
  const [showPlaySettings, setShowPlaySettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('playPrefs', JSON.stringify(playPrefs));
  }, [playPrefs]);
  
  // Default coordinates (Chicago, IL 60603)
  const defaultLat = 41.8781;
  const defaultLon = -87.6298;

  const fetchWeather = async (lat, lon, name) => {
    setLoading(true);
    setError(null);
    try {
      // Expanded API call: past_days=7, forecast_days=7 (14 days total).
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation,uv_index,temperature_2m&daily=uv_index_max,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode&hourly=precipitation,uv_index,temperature_2m,precipitation_probability,relative_humidity_2m,wind_speed_10m&past_days=7&forecast_days=7&timezone=auto&precipitation_unit=inch&temperature_unit=fahrenheit&wind_speed_unit=mph`;
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&past_days=7&forecast_days=7&timezone=auto`;
      
      const [res, aqiRes] = await Promise.all([fetch(url), fetch(aqiUrl)]);
      
      if (!res.ok) throw new Error('Failed to fetch weather data');
      
      const data = await res.json();
      let aqiData = null;
      if (aqiRes.ok) {
        aqiData = await aqiRes.json();
      }
      
      // Calculate current hour index to do rolling 24h math for "Today"
      const nowTime = new Date().getTime();
      let currentHourIdx = 0;
      let minDiff = Infinity;
      data.hourly.time.forEach((t, i) => {
         // Parse the API's local time string explicitly using its UTC offset
         const epoch = new Date(t + 'Z').getTime() - (data.utc_offset_seconds * 1000);
         const diff = Math.abs(epoch - nowTime);
         if (diff < minDiff) {
             minDiff = diff;
             currentHourIdx = i;
         }
      });

      if (aqiData && aqiData.hourly && aqiData.hourly.us_aqi) {
        data.hourly.us_aqi = aqiData.hourly.us_aqi;
        
        const dailyMaxAqi = [];
        data.daily.time.forEach(dateStr => {
           let maxAqi = 0;
           data.hourly.time.forEach((t, i) => {
              if (t.startsWith(dateStr)) {
                 const aqi = data.hourly.us_aqi[i];
                 if (aqi > maxAqi) maxAqi = aqi;
              }
           });
           dailyMaxAqi.push(maxAqi);
        });
        data.daily.us_aqi_max = dailyMaxAqi;
        data.current.us_aqi = data.hourly.us_aqi[currentHourIdx];
      }

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
    const initWeather = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      let zip = urlParams.get('zip');
      
      if (!zip) {
        const pathPart = window.location.pathname.replace(/\//g, '');
        if (/^\d{5}$/.test(pathPart)) {
          zip = pathPart;
        }
      }

      if (zip) {
        setLoading(true);
        try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${zip}&count=1&language=en&format=json`);
          if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
              const result = data.results[0];
              // Map the admin1 field to standard state abbreviations if needed, 
              // but Open-Meteo provides full state name. We'll use Name, Admin1.
              const locationStr = result.admin1 ? `${result.name}, ${result.admin1}` : result.name;
              fetchWeather(result.latitude, result.longitude, locationStr);
              return;
            }
          }
        } catch (err) {
          console.warn("Could not fetch coordinates for zip:", err);
        }
      }
      
      fetchWeather(defaultLat, defaultLon, "Chicago, IL");
    };
    
    initWeather();
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
    if (uv <= 2) return { text: "Low", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/40" };
    if (uv <= 5) return { text: "Moderate", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/40" };
    if (uv <= 7) return { text: "High", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/40" };
    if (uv <= 10) return { text: "Very High", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/40" };
    return { text: "Extreme", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/40" };
  };

  const getAqiSeverity = (aqi) => {
    if (!aqi) return { text: "Unknown", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-900/40" };
    if (aqi <= 50) return { text: "Good", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/40" };
    if (aqi <= 100) return { text: "Moderate", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/40" };
    if (aqi <= 150) return { text: "Sensitive", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/40" };
    if (aqi <= 200) return { text: "Unhealthy", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/40" };
    if (aqi <= 300) return { text: "Very Unhealthy", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/40" };
    return { text: "Hazardous", color: "text-rose-900 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/40" };
  };

  // --- Rendering Logic based on dateOffset ---
  const isToday = dateOffset === 0;
  // API returns past_days=7, meaning index 0 is 7 days ago, index 7 is Today.
  const dailyIndex = dateOffset + 7; 

  let displayDateLabel = "";
  let targetHourlyData = [];
  let groupedWindows = [];
  let bestMowingDays = [];
  let bestFertilizerDays = [];

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
                  precipAmount: Number(rawHourly.precipitation[i] || 0),
                  humidity: rawHourly.relative_humidity_2m[i] || 0,
                  windSpeed: Math.round(rawHourly.wind_speed_10m[i] || 0),
                  aqi: rawHourly.us_aqi ? rawHourly.us_aqi[i] : null
              });
          }
      }
    });

    // Group valid kids play hours into digestible schedule blocks
    const playWindows = targetHourlyData.filter(h => 
      h.uv <= playPrefs.maxUv && 
      (playPrefs.allowRain || h.precipAmount === 0) &&
      h.temp >= playPrefs.minTemp && 
      h.temp <= playPrefs.maxTemp &&
      h.humidity <= playPrefs.maxHumidity &&
      h.windSpeed <= playPrefs.maxWindSpeed &&
      h.rawHour >= 6 && h.rawHour <= 19
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

    // --- Fertilizer Algorithm (Looks at Next 7 Days) ---
    for (let i = 7; i <= 13; i++) {
      const rainToday = rawDaily.precipitation_sum[i];
      const rainTomorrow = rawDaily.precipitation_sum[i + 1] || 0;
      const maxTemp = rawDaily.temperature_2m_max[i];
      const dateStr = rawDaily.time[i];
      
      const [y, m, d] = dateStr.split('-');
      let dayName = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' });
      if (i === 7) dayName = "Today";
      if (i === 8) dayName = "Tomorrow";

      let score = 10;
      let tip = "Great day to fertilize";
      
      const rain48h = rainToday + rainTomorrow;

      if (rain48h > 1.0) {
        score -= 5;
        tip = "Heavy rain expected (washout risk)";
      } else if (rain48h === 0) {
        score -= 3;
        tip = "No rain expected (must hand water)";
      } else if (rainToday > 0.5) {
        score -= 2;
        tip = "Moderate rain (potential runoff)";
      } else if (rain48h > 0.1 && rain48h <= 0.5) {
        tip = "Perfect light rain to water in";
        score += 1;
      }

      if (maxTemp > 85) {
        score -= 4;
        tip = "Too hot (burn risk)";
      } else if (maxTemp < 50) {
        score -= 2;
        tip = "Too cold for absorption";
      }

      if (score > 3) {
        bestFertilizerDays.push({ dayName, maxTemp, tip, score, dateStr, rain48h });
      }
    }

    bestFertilizerDays.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.dateStr.localeCompare(b.dateStr);
    });
    bestFertilizerDays = bestFertilizerDays.slice(0, 3);

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

  if (currentPage === 'travel') {
    return <TravelCalculator onBack={() => setCurrentPage('home')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors duration-300">
        
        {/* Header Block */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-5 py-4 pb-5 border-b border-transparent dark:border-slate-800">
          {/* Top Control Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 pr-4 overflow-hidden">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <h1 className="text-base font-bold tracking-tight truncate">{locationName}</h1>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={() => setIsDark(!isDark)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                title="Toggle Dark Mode"
              >
                {isDark ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-white" />}
              </button>
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
              <button 
                onClick={() => setCurrentPage('travel')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                title="Travel Calculator"
              >
                <Car className="w-4 h-4 text-white" />
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
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {loading && !weather ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
              <p>Fetching local radar and sensors...</p>
            </div>
          ) : weather && weather.raw.daily.time[dailyIndex] ? (
            <div className="space-y-6">
              
              {/* Daily / Current Summary Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Temp Box */}
                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-2xl p-4 flex flex-col items-center justify-center border border-orange-100 dark:border-orange-900/30 text-center shadow-sm">
                  <Thermometer className="w-5 h-5 text-orange-500 dark:text-orange-400 mb-1" />
                  <span className="text-3xl font-black text-orange-900 dark:text-orange-100 tracking-tighter">
                    {isToday ? Math.round(weather.raw.current.temperature_2m) : Math.round(weather.raw.daily.temperature_2m_max[dailyIndex])}°
                  </span>
                  <span className="text-[10px] font-bold uppercase mt-1 text-orange-600 dark:text-orange-400">
                    {isToday ? 'Current' : 'Daily High'}
                  </span>
                  <span className="text-[10px] font-bold text-orange-700/60 dark:text-orange-400/60 uppercase mt-0.5 whitespace-nowrap">
                    H: {Math.round(weather.raw.daily.temperature_2m_max[dailyIndex])}° L: {Math.round(weather.raw.daily.temperature_2m_min[dailyIndex])}°
                  </span>
                </div>

                {/* Rain Box */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4 flex flex-col items-center justify-center border border-blue-100 dark:border-blue-900/30 text-center shadow-sm">
                  <CloudRain className="w-5 h-5 text-blue-500 dark:text-blue-400 mb-1" />
                  <span className="text-2xl font-black text-blue-900 dark:text-blue-100 tracking-tighter">
                    {isToday ? weather.rainPast24 : weather.raw.daily.precipitation_sum[dailyIndex].toFixed(2)}"
                  </span>
                  <span className="text-[10px] font-bold uppercase mt-1 text-blue-600 dark:text-blue-400">
                    {isToday ? 'Past 24h' : 'Total Rain'}
                  </span>
                  {isToday ? (
                    <div className="mt-0.5 flex flex-col gap-0 text-[9px] font-bold text-blue-700/60 dark:text-blue-400/60 uppercase whitespace-nowrap">
                      <span>Current: {weather.raw.current.precipitation}"</span>
                      <span>Next 12h: {weather.rainNext12}"</span>
                    </div>
                  ) : (
                    <div className="mt-0.5 flex flex-col gap-0 text-[9px] font-bold text-blue-700/60 dark:text-blue-400/60 uppercase whitespace-nowrap">
                      <span>Max Prob: {weather.raw.daily.precipitation_probability_max[dailyIndex]}%</span>
                    </div>
                  )}
                </div>

                {/* UV Box */}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 flex flex-col items-center justify-center border border-amber-100 dark:border-amber-900/30 text-center shadow-sm">
                  <Sun className="w-5 h-5 text-amber-500 dark:text-amber-400 mb-1" />
                  <span className="text-2xl font-black text-amber-900 dark:text-amber-100 tracking-tighter">
                    {isToday ? weather.raw.current.uv_index : weather.raw.daily.uv_index_max[dailyIndex]}
                  </span>
                  <span className={`text-[10px] font-bold uppercase mt-1 ${getUvSeverity(isToday ? weather.raw.current.uv_index : weather.raw.daily.uv_index_max[dailyIndex]).color}`}>
                    {getUvSeverity(isToday ? weather.raw.current.uv_index : weather.raw.daily.uv_index_max[dailyIndex]).text}
                  </span>
                  <span className="text-[10px] font-bold text-amber-700/60 dark:text-amber-400/60 uppercase mt-0.5">
                    UV Peak: {weather.raw.daily.uv_index_max[dailyIndex]}
                  </span>
                </div>

                {/* AQI Box */}
                {weather.raw.current.us_aqi !== undefined && (
                  <div className="bg-purple-50 dark:bg-purple-950/30 rounded-2xl p-4 flex flex-col items-center justify-center border border-purple-100 dark:border-purple-900/30 text-center shadow-sm">
                    <Fan className="w-5 h-5 text-purple-500 dark:text-purple-400 mb-1" />
                    <span className="text-2xl font-black text-purple-900 dark:text-purple-100 tracking-tighter">
                      {isToday ? weather.raw.current.us_aqi : weather.raw.daily.us_aqi_max[dailyIndex]}
                    </span>
                    <span className={`text-[10px] font-bold uppercase mt-1 ${getAqiSeverity(isToday ? weather.raw.current.us_aqi : weather.raw.daily.us_aqi_max[dailyIndex]).color}`}>
                      {getAqiSeverity(isToday ? weather.raw.current.us_aqi : weather.raw.daily.us_aqi_max[dailyIndex]).text}
                    </span>
                    <span className="text-[10px] font-bold text-purple-700/60 dark:text-purple-400/60 uppercase mt-0.5">
                      Max AQI: {weather.raw.daily.us_aqi_max[dailyIndex]}
                    </span>
                  </div>
                )}
              </div>

              {/* Unified 12-Hour Timeline */}
              <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-4">Hourly Detail (6 AM - 8 PM)</p>
                <div className="flex gap-2 overflow-x-auto pb-3 -mx-2 px-2" style={{ scrollbarWidth: 'none' }}>
                  {targetHourlyData.map((item, idx) => {
                    const isCurrentHour = isToday && item.rawHour === new Date().getHours();
                    return (
                    <div key={idx} className={`flex flex-col items-center shrink-0 space-y-2 px-3 py-2 rounded-2xl ${isCurrentHour ? 'bg-blue-50 dark:bg-blue-900/40 ring-1 ring-blue-200 dark:ring-blue-800/60' : ''}`}>
                      <span className={`text-xs whitespace-nowrap ${isCurrentHour ? 'text-blue-600 dark:text-blue-400 font-bold' : 'font-medium text-slate-500 dark:text-slate-400'}`}>{item.time}</span>
                      <span className={`text-lg font-bold ${isCurrentHour ? 'text-blue-900 dark:text-blue-100' : 'text-slate-800 dark:text-slate-200'}`}>{item.temp}°</span>
                      <div className="flex items-center gap-0.5 text-blue-500 font-semibold mb-1">
                        <Droplets className="w-3 h-3" />
                        <span className="text-[10px]">{item.precipProb}%</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getUvSeverity(item.uv).bg} ${getUvSeverity(item.uv).color}`}>
                        UV {item.uv}
                      </div>
                      {item.aqi !== null && (
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getAqiSeverity(item.aqi).bg} ${getAqiSeverity(item.aqi).color}`}>
                          AQI {item.aqi}
                        </div>
                      )}
                      <span className={`text-[10px] font-bold mt-1 ${item.precipAmount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'}`}>
                        {item.precipAmount > 0 ? item.precipAmount.toFixed(2) : '0'}"
                      </span>
                    </div>
                  )})}
                </div>
              </div>

              {/* Live Radar (Only visible when viewing Today) */}
              {isToday && (
                <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-1 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800/50">
                    <Radar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <p className="text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider font-bold">Live Doppler</p>
                  </div>
                  <div className="h-64 w-full bg-slate-100 dark:bg-slate-800 relative pointer-events-auto">
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
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Smile className="w-5 h-5 text-emerald-500" />
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider font-bold">Ideal Play Windows</p>
                  </div>
                  <button 
                    onClick={() => setShowPlaySettings(!showPlaySettings)}
                    className="p-1.5 hover:bg-emerald-200/50 rounded-full transition-colors"
                    title="Customize criteria"
                  >
                    <Settings className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  </button>
                </div>
                <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase mb-4">
                  {playPrefs.minTemp}°-{playPrefs.maxTemp}° • UV ≤ {playPrefs.maxUv} • Hum ≤ {playPrefs.maxHumidity}% • Wind ≤ {playPrefs.maxWindSpeed}mph {playPrefs.allowRain ? '' : '• No Rain'}
                </p>

                {/* Settings Panel */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showPlaySettings ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                  <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 shadow-inner space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-emerald-900 dark:text-emerald-100 dark:text-emerald-100 mb-1">
                        <span>Temperature</span>
                        <span>{playPrefs.minTemp}° - {playPrefs.maxTemp}°</span>
                      </div>
                      <DualSlider 
                        min={30} max={110} 
                        minValue={playPrefs.minTemp} 
                        maxValue={playPrefs.maxTemp} 
                        onChangeMin={(v) => setPlayPrefs({...playPrefs, minTemp: v})}
                        onChangeMax={(v) => setPlayPrefs({...playPrefs, maxTemp: v})}
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs font-bold text-emerald-900 dark:text-emerald-100 dark:text-emerald-100 mb-1">
                        <span>Max UV Index</span>
                        <span>{playPrefs.maxUv}</span>
                      </div>
                      <SingleSlider 
                        min={1} max={11} 
                        value={playPrefs.maxUv} 
                        onChange={(v) => setPlayPrefs({...playPrefs, maxUv: v})} 
                        colorClass="bg-emerald-500" 
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-emerald-900 dark:text-emerald-100 dark:text-emerald-100 mb-1">
                        <span>Max Humidity</span>
                        <span>{playPrefs.maxHumidity}%</span>
                      </div>
                      <SingleSlider 
                        min={0} max={100} 
                        value={playPrefs.maxHumidity} 
                        onChange={(v) => setPlayPrefs({...playPrefs, maxHumidity: v})} 
                        colorClass="bg-emerald-500" 
                        suffix="%" 
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-emerald-900 dark:text-emerald-100 dark:text-emerald-100 mb-1">
                        <span>Max Wind Speed</span>
                        <span>{playPrefs.maxWindSpeed} mph</span>
                      </div>
                      <SingleSlider 
                        min={0} max={40} 
                        value={playPrefs.maxWindSpeed} 
                        onChange={(v) => setPlayPrefs({...playPrefs, maxWindSpeed: v})} 
                        colorClass="bg-emerald-500" 
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-100 dark:border-emerald-800/50">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">Allow Rain</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={playPrefs.allowRain} onChange={(e) => setPlayPrefs({...playPrefs, allowRain: e.target.checked})} />
                        <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

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
                        <div key={idx} className="bg-white dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-emerald-400 dark:bg-emerald-500 rounded-full"></div>
                            <div>
                              <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">{timeLabel}</h3>
                              <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wide">
                                {group.length} {group.length === 1 ? 'Hour' : 'Hours'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex flex-col justify-center items-center">
                              <span className="text-base font-black text-emerald-800 dark:text-emerald-200 leading-none">{avgPrecipProb}%</span>
                              <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 uppercase mt-0.5">Rain</span>
                            </div>
                            <div className="flex flex-col justify-center items-center">
                              <span className="text-base font-black text-emerald-800 dark:text-emerald-200 leading-none">{avgUv}</span>
                              <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 uppercase mt-0.5">UV</span>
                            </div>
                            <div className="flex flex-col justify-center items-center">
                              <span className="text-base font-black text-emerald-800 dark:text-emerald-200 leading-none">{avgTemp}°</span>
                              <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 uppercase mt-0.5">Temp</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white/50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30 text-center text-sm font-medium text-emerald-800/70 dark:text-emerald-400/70">
                    No ideal outdoor windows matching criteria for this day. Time for indoor activities!
                  </div>
                )}
              </div>

              {/* Lawn Care Planner (Weekly Context) */}
              <div className="bg-lime-50 dark:bg-lime-950/20 rounded-2xl p-5 border border-lime-100 dark:border-lime-900/30 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                    <p className="text-xs text-lime-900 dark:text-lime-300 uppercase tracking-wider font-bold">Lawn Care Planner</p>
                  </div>
                  <button 
                    onClick={() => setShowMowInfo(!showMowInfo)}
                    className="p-1.5 hover:bg-lime-200/50 rounded-full transition-colors"
                    title="View algorithm criteria"
                  >
                    {showMowInfo ? <ChevronUp className="w-4 h-4 text-lime-700 dark:text-lime-400" /> : <ChevronDown className="w-4 h-4 text-lime-700 dark:text-lime-400" />}
                  </button>
                </div>
                <p className="text-[10px] font-bold text-lime-700/70 dark:text-lime-400/70 uppercase mb-4">
                  Top upcoming days to mow
                </p>

                {/* Expanding Info Box */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showMowInfo ? 'max-h-48 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                  <div className="p-3 bg-lime-100/50 dark:bg-lime-900/30 rounded-xl border border-lime-200/50 dark:border-lime-800/50 text-xs text-lime-900/80 dark:text-lime-300/80 space-y-1">
                    <p className="font-bold text-lime-900 dark:text-lime-200 mb-1 border-b border-lime-200 dark:border-lime-800/50 pb-1">Scoring Criteria:</p>
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
                      <div key={idx} className="bg-white dark:bg-lime-900/20 rounded-xl p-3 border border-lime-200/60 dark:border-lime-800/40 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-lime-500 text-white shadow-sm' : 'bg-lime-100 dark:bg-lime-900/50 text-lime-700 dark:text-lime-300'}`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-lime-950 dark:text-lime-100">{day.dayName}</h3>
                            <p className="text-[10px] font-bold text-lime-600/70 dark:text-lime-400/70 uppercase tracking-wide">
                              {day.tip}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center items-end">
                          <span className="text-base font-black text-lime-800 dark:text-lime-200 leading-none">{Math.round(day.maxTemp)}°</span>
                          <span className="text-[9px] font-bold text-lime-500 dark:text-lime-400 uppercase mt-0.5">High</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/50 dark:bg-lime-900/10 rounded-xl p-4 border border-lime-100 dark:border-lime-900/30 text-center text-sm font-medium text-lime-800/70 dark:text-lime-400/70">
                    No ideal mowing days in the next week due to rain. Let it grow!
                  </div>
                )}
              </div>

              {/* Fertilizer Planner */}
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-5 border border-amber-100 dark:border-amber-900/30 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Sprout className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-amber-900 dark:text-amber-300 uppercase tracking-wider font-bold">Fertilizer Planner</p>
                  </div>
                  <button 
                    onClick={() => setShowFertilizerInfo(!showFertilizerInfo)}
                    className="p-1.5 hover:bg-amber-200/50 rounded-full transition-colors"
                    title="View algorithm criteria"
                  >
                    {showFertilizerInfo ? <ChevronUp className="w-4 h-4 text-amber-700 dark:text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-700 dark:text-amber-400" />}
                  </button>
                </div>
                <p className="text-[10px] font-bold text-amber-700/70 dark:text-amber-400/70 uppercase mb-4">
                  Top upcoming days to fertilize
                </p>

                {/* Expanding Info Box */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFertilizerInfo ? 'max-h-48 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                  <div className="p-3 bg-amber-100/50 dark:bg-amber-900/30 rounded-xl border border-amber-200/50 dark:border-amber-800/50 text-xs text-amber-900/80 dark:text-amber-300/80 space-y-1">
                    <p className="font-bold text-amber-900 dark:text-amber-200 mb-1 border-b border-amber-200 dark:border-amber-800/50 pb-1">Scoring Criteria:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Water-in Rule:</strong> Ideal to have 0.1" - 0.5" rain within 48h to wash nutrients into soil.</li>
                      <li><strong>Washout Risk:</strong> Penalized if &gt; 1.0" rain within 48h.</li>
                      <li><strong>Burn Risk:</strong> Penalized if high temp &gt; 85°F (nitrogen burn).</li>
                      <li><strong>Dormant:</strong> Penalized if high temp &lt; 50°F (grass won't absorb).</li>
                    </ul>
                  </div>
                </div>

                {bestFertilizerDays.length > 0 ? (
                  <div className="space-y-2">
                    {bestFertilizerDays.map((day, idx) => (
                      <div key={idx} className="bg-white dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200/60 dark:border-amber-800/40 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'}`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">{day.dayName}</h3>
                            <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wide">
                              {day.tip}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center items-end">
                          <span className="text-base font-black text-amber-800 dark:text-amber-200 leading-none">{Math.round(day.maxTemp)}°</span>
                          <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 uppercase mt-0.5">High</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-100 dark:border-amber-900/30 text-center text-sm font-medium text-amber-800/70 dark:text-amber-400/70">
                    No ideal fertilizing days in the next week.
                  </div>
                )}
              </div>

            </div>
          ) : null}
          
        </div>
      </div>

      {/* Sources Footer */}
      <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto w-full px-4">
        <p>
          Data powered by{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-slate-600 transition-colors underline decoration-slate-300 underline-offset-2">
            Open-Meteo
          </a>
        </p>
        <button 
          onClick={() => setShowDataInfo(!showDataInfo)}
          className="mt-3 flex items-center justify-center gap-1.5 mx-auto bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 py-1.5 px-4 rounded-full transition-all focus:outline-none font-medium text-[11px]"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Where is this data coming from?</span>
          {showDataInfo ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
        </button>
        
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showDataInfo ? 'max-h-96 opacity-100 mt-3 pb-8' : 'max-h-0 opacity-0 pb-0'}`}>
          <div className="bg-slate-200/50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-300/50 dark:border-slate-800 text-left space-y-3 shadow-inner">
            <p className="leading-relaxed"><strong>Open-Meteo</strong> is an open-source weather API that aggregates state-of-the-art models from national weather services globally without tracking or advertising.</p>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
              <li><strong>Weather:</strong> Forecasted using high-resolution models like the NWS HRRR (USA) and ECMWF (Global).</li>
              <li><strong>Air Quality:</strong> Sourced from the US EPA and global networks, tracking real-time pollutants.</li>
              <li><strong>UV Index:</strong> Provided by Copernicus ECMWF, tracking solar radiation intensity.</li>
              <li><strong>Live Radar:</strong> Embedded from Windy.com, showing real-time doppler radar feeds.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}