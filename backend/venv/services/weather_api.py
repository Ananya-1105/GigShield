"""
GigShield Weather API — Real data from Open-Meteo (free, no API key needed)

APIs used:
  - Forecast: https://api.open-meteo.com/v1/forecast
  - Air Quality: https://air-quality-api.open-meteo.com/v1/air-quality
  - Geocoding: https://geocoding-api.open-meteo.com/v1/search

All free, no rate limits for reasonable usage, no API key required.
"""

import requests
import logging

logger = logging.getLogger("gigshield.weather")

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
AQI_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


def geocode_search(query: str, country: str = "IN", count: int = 6) -> list:
    """Search for locations in India by name. Returns list of results with lat/lng."""
    try:
        resp = requests.get(GEOCODE_URL, params={
            "name": query,
            "count": count,
            "language": "en",
            "format": "json",
        }, timeout=8)
        data = resp.json()
        results = data.get("results", [])

        # Filter to India only
        filtered = []
        for r in results:
            if r.get("country_code", "").upper() == "IN" or r.get("country", "") == "India":
                filtered.append({
                    "name": r.get("name", ""),
                    "admin1": r.get("admin1", ""),  # State
                    "lat": round(r.get("latitude", 0), 4),
                    "lng": round(r.get("longitude", 0), 4),
                    "population": r.get("population", 0),
                    "display": f"{r.get('name', '')}, {r.get('admin1', '')}",
                })

        return filtered

    except Exception as e:
        logger.error(f"Geocode error: {e}")
        return []


def get_live_weather(lat: float, lng: float) -> dict:
    """
    Fetch real-time weather for a location from Open-Meteo.
    Returns temperature, rain, wind, and weather condition.
    """
    try:
        resp = requests.get(FORECAST_URL, params={
            "latitude": lat,
            "longitude": lng,
            "current": "temperature_2m,apparent_temperature,rain,weather_code,wind_speed_10m,relative_humidity_2m",
            "daily": "temperature_2m_max,rain_sum,weather_code,wind_speed_10m_max",
            "timezone": "Asia/Kolkata",
            "forecast_days": 7,
        }, timeout=8)
        data = resp.json()
        current = data.get("current", {})

        weather_code = current.get("weather_code", 0)
        condition = _weather_code_to_text(weather_code)
        rain_mm = current.get("rain", 0)
        temp = current.get("temperature_2m", 0)
        feels_like = current.get("apparent_temperature", 0)
        wind = current.get("wind_speed_10m", 0)
        humidity = current.get("relative_humidity_2m", 0)

        # Daily forecast for 7-day risk
        daily = data.get("daily", {})
        forecast_7d = []
        if daily.get("time"):
            for i, day in enumerate(daily["time"][:7]):
                forecast_7d.append({
                    "date": day,
                    "temp_max": daily.get("temperature_2m_max", [0] * 7)[i],
                    "rain_sum": daily.get("rain_sum", [0] * 7)[i],
                    "wind_max": daily.get("wind_speed_10m_max", [0] * 7)[i],
                    "weather_code": daily.get("weather_code", [0] * 7)[i],
                })

        return {
            "temperature": temp,
            "feels_like": feels_like,
            "rain_mm": rain_mm,
            "wind_kmh": wind,
            "humidity": humidity,
            "condition": condition,
            "weather_code": weather_code,
            "forecast_7d": forecast_7d,
        }

    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return {
            "temperature": 0, "feels_like": 0, "rain_mm": 0,
            "wind_kmh": 0, "humidity": 0, "condition": "Unknown",
            "weather_code": 0, "forecast_7d": [],
        }


def get_live_aqi(lat: float, lng: float) -> dict:
    """Fetch real-time AQI (PM2.5) from Open-Meteo Air Quality API."""
    try:
        resp = requests.get(AQI_URL, params={
            "latitude": lat,
            "longitude": lng,
            "current": "pm2_5,us_aqi,pm10",
            "timezone": "Asia/Kolkata",
        }, timeout=8)
        data = resp.json()
        current = data.get("current", {})

        pm25 = current.get("pm2_5", 0)
        us_aqi = current.get("us_aqi", 0)
        pm10 = current.get("pm10", 0)

        # Indian AQI category
        if us_aqi <= 50:
            category = "Good"
        elif us_aqi <= 100:
            category = "Moderate"
        elif us_aqi <= 150:
            category = "Unhealthy (Sensitive)"
        elif us_aqi <= 200:
            category = "Unhealthy"
        elif us_aqi <= 300:
            category = "Very Unhealthy"
        else:
            category = "Hazardous"

        return {
            "pm25": round(pm25, 1),
            "pm10": round(pm10, 1),
            "us_aqi": round(us_aqi),
            "category": category,
        }

    except Exception as e:
        logger.error(f"AQI API error: {e}")
        return {"pm25": 0, "pm10": 0, "us_aqi": 0, "category": "Unknown"}


def get_full_location_data(lat: float, lng: float) -> dict:
    """Get complete weather + AQI for a location."""
    weather = get_live_weather(lat, lng)
    aqi = get_live_aqi(lat, lng)
    return {**weather, "aqi": aqi}


def _weather_code_to_text(code: int) -> str:
    """Convert WMO weather code to readable text."""
    codes = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
        95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
    }
    return codes.get(code, "Unknown")
