from fastapi import APIRouter, Query
from services.weather_api import geocode_search, get_full_location_data
from services.trigger_engine import check_triggers_for_location

router = APIRouter(prefix="/weather")


@router.get("/geocode")
def search_locations(q: str = Query(..., min_length=2, description="City or area name")):
    """Search for Indian locations by name. Returns up to 6 results with lat/lng."""
    results = geocode_search(q, country="IN", count=6)
    return results


@router.get("/live")
def get_live(lat: float = Query(...), lng: float = Query(...), name: str = Query("")):
    """Get live weather + AQI + trigger analysis for a specific lat/lng."""
    return check_triggers_for_location(lat, lng, name)
