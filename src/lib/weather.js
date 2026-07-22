// School location (Wilmington, NC area) — no per-user settings field exists
// for this yet, so it's a fixed constant. Open-Meteo requires no API key
// and permits direct browser calls.
const SCHOOL_LAT = 34.1946
const SCHOOL_LON = -77.9086

const CACHE_KEY = 'clark_weather_cache'
const REFRESH_MS = 60 * 60 * 1000 // refresh roughly hourly, not on every load

function weatherIcon(code) {
  if (code === 0) return 'sun'
  if ([1, 2, 3].includes(code)) return 'cloud-sun'
  if ([45, 48].includes(code)) return 'fog'
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow'
  if ([95, 96, 99].includes(code)) return 'storm'
  return 'cloud'
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
  } catch {
    return null
  }
}

/** Returns { tempF, icon, fetchedAt } from cache if fresh, otherwise fetches
    and re-caches. Falls back to stale cache (or null) on network failure. */
export async function fetchWeather() {
  const cached = readCache()
  if (cached && Date.now() - cached.fetchedAt < REFRESH_MS) return cached

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${SCHOOL_LAT}&longitude=${SCHOOL_LON}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
    )
    if (!res.ok) throw new Error('Weather fetch failed')
    const data = await res.json()
    const result = {
      tempF: Math.round(data.current.temperature_2m),
      icon: weatherIcon(data.current.weather_code),
      fetchedAt: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(result))
    return result
  } catch {
    return cached || null
  }
}
