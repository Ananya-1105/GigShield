"""
GigShield Parametric Trigger Engine — REAL weather data, any Indian location.

Uses Open-Meteo API (free, no key) for live weather + AQI.
Evaluates 5 trigger types per README with Two-Source Rule.

Triggers:
  01. Heavy Rain/Flood — rain >= 13mm/hr (≈80mm/6h) AND wind > 30km/h
  02. Extreme Heat — feels-like >= 45°C AND humidity < 30%
  03. Severe AQI — AQI >= 400 (Hazardous)
  04. Civic Disruption — extreme weather code (thunderstorm/violent rain)
  05. Cyclone/Disaster — wind >= 90km/h AND heavy rain

Payouts per README:
  Flood: Rs 350, Heat: Rs 200, AQI: Rs 250, Civic: Rs 350, Cyclone: Rs 350
"""

import json
from datetime import datetime, timezone
from services.weather_api import get_live_weather, get_live_aqi, get_full_location_data


def check_triggers_for_location(lat: float, lng: float, name: str = "") -> dict:
    """
    Check all parametric triggers for a lat/lng location using REAL weather data.
    Two-Source Rule: each trigger needs 2+ confirming signals.
    """
    weather = get_live_weather(lat, lng)
    aqi_data = get_live_aqi(lat, lng)

    rain = weather.get("rain_mm", 0)
    temp = weather.get("temperature", 0)
    feels_like = weather.get("feels_like", 0)
    wind = weather.get("wind_kmh", 0)
    humidity = weather.get("humidity", 0)
    code = weather.get("weather_code", 0)
    pm25 = aqi_data.get("pm25", 0)
    us_aqi = aqi_data.get("us_aqi", 0)

    active_triggers = []

    # Determine risk level from conditions
    risk_score = 0

    # 01. Heavy Rain / Flood — rain >= 13mm/hr AND (wind > 30 OR code >= 80)
    rain_source1 = rain >= 13  # ~80mm in 6hrs
    rain_source2 = wind > 30 or code in (65, 81, 82, 95, 96, 99)
    if rain_source1 and rain_source2:
        active_triggers.append({
            "id": "heavy_rain",
            "name": "Heavy Rain / Flood",
            "payout": 350,
            "confirmed_sources": 2,
            "source1": f"Rainfall: {rain}mm/hr",
            "source2": f"Wind: {wind}km/h, Code: {code}",
            "details": f"Rainfall {rain}mm/hr + Wind {wind}km/h",
        })
        risk_score += 35
    elif rain >= 5:
        risk_score += 15

    # 02. Extreme Heat — feels-like >= 45°C AND humidity factor
    heat_source1 = feels_like >= 45
    heat_source2 = humidity < 35 or temp >= 42
    if heat_source1 and heat_source2:
        active_triggers.append({
            "id": "extreme_heat",
            "name": "Extreme Heat",
            "payout": 200,
            "confirmed_sources": 2,
            "source1": f"Feels-like: {feels_like}°C",
            "source2": f"Temp: {temp}°C, Humidity: {humidity}%",
            "details": f"Feels-like {feels_like}°C, Humidity {humidity}%",
        })
        risk_score += 25
    elif feels_like >= 40:
        risk_score += 10

    # 03. Severe AQI — AQI >= 400 AND PM2.5 confirms
    aqi_source1 = us_aqi >= 400
    aqi_source2 = pm25 >= 250
    if aqi_source1 and aqi_source2:
        active_triggers.append({
            "id": "severe_aqi",
            "name": "Severe Air Quality",
            "payout": 250,
            "confirmed_sources": 2,
            "source1": f"AQI: {us_aqi}",
            "source2": f"PM2.5: {pm25}μg/m³",
            "details": f"AQI {us_aqi} ({aqi_data['category']}), PM2.5 {pm25}",
        })
        risk_score += 30
    elif us_aqi >= 200:
        risk_score += 12

    # 04. Civic Disruption — extreme weather codes (thunderstorm + violent conditions)
    severe_codes = {82, 95, 96, 99}  # Violent rain showers, thunderstorms
    civic_source1 = code in severe_codes
    civic_source2 = rain >= 8 or wind >= 50
    if civic_source1 and civic_source2:
        active_triggers.append({
            "id": "civic_disruption",
            "name": "Civic Disruption",
            "payout": 350,
            "confirmed_sources": 2,
            "source1": f"Weather: {weather['condition']}",
            "source2": f"Rain: {rain}mm, Wind: {wind}km/h",
            "details": f"{weather['condition']}, Rain {rain}mm, Wind {wind}km/h",
        })
        risk_score += 35

    # 05. Cyclone / Disaster — wind >= 90km/h AND heavy rain
    cyclone_source1 = wind >= 90
    cyclone_source2 = rain >= 10 or code in (95, 96, 99)
    if cyclone_source1 and cyclone_source2:
        active_triggers.append({
            "id": "cyclone",
            "name": "Cyclone / Disaster",
            "payout": 350,
            "confirmed_sources": 2,
            "source1": f"Wind: {wind}km/h",
            "source2": f"Rain: {rain}mm, Condition: {weather['condition']}",
            "details": f"Wind {wind}km/h + {weather['condition']}",
        })
        risk_score += 40
    elif wind >= 50:
        risk_score += 15

    # Compute overall risk level
    risk_score = min(100, risk_score)
    if risk_score >= 60:
        risk_level = "high"
    elif risk_score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "location": {"name": name, "lat": lat, "lng": lng},
        "weather": {
            "temperature": temp,
            "feels_like": feels_like,
            "rain_mm": rain,
            "wind_kmh": wind,
            "humidity": humidity,
            "condition": weather["condition"],
            "weather_code": code,
        },
        "aqi": aqi_data,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "active_triggers": active_triggers,
        "total_payout": sum(t["payout"] for t in active_triggers),
        "status": "triggers_active" if active_triggers else "all_clear",
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "forecast_7d": weather.get("forecast_7d", []),
    }


def check_user_zones(zones_json: str | None) -> list:
    """Check triggers for all of a user's registered zones."""
    if not zones_json:
        return []
    try:
        zones = json.loads(zones_json) if isinstance(zones_json, str) else zones_json
        results = []
        for z in zones:
            lat = z.get("lat", 0)
            lng = z.get("lng", 0)
            name = z.get("name", "")
            if lat and lng:
                result = check_triggers_for_location(lat, lng, name)
                results.append(result)
        return results
    except (json.JSONDecodeError, TypeError):
        return []
