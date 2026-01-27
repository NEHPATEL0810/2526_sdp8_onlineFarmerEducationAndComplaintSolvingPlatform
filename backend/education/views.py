import requests
from django.http import JsonResponse
from django.conf import settings
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from .utils import load_crops_data
import urllib.parse

def market_prices(request):
    state = request.GET.get("state")
    commodity = request.GET.get("commodity")

    if not state:
        return JsonResponse({"records": []})

    base_url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

    query = {
        "api-key": settings.DATA_GOV_API_KEY,
        "format": "json",
        "limit": "100",
        "filters[state]": state
    }

    if commodity:
        query["filters[commodity]"] = commodity

    full_url = base_url + "?" + urllib.parse.urlencode(query, safe="[]")

    try:
        response = requests.get(full_url, timeout=120)

        if not response.text or not response.text.strip().startswith("{"):
            return JsonResponse({"records": []})

        return JsonResponse(response.json(), safe=False)

    except Exception:
        return JsonResponse({"records": []})


def agri_schemes(request):
    url = "https://api.data.gov.in/resource/9afdf346-16d7-4f17-a2e3-684540c59a77"

    params = {
        "api-key": settings.DATA_GOV_API_KEY,
        "format": "json",
        "limit": 500
    }

    response=requests.get(url,params=params,timeout=20)
    data=response.json()

    return JsonResponse({
        "count": len(data.get("records",[])),
        "records": data.get("records",[])
    },safe=False)

def get_all_crops(request):
    crops=load_crops_data()

    search=request.GET.get("search")
    season=request.GET.get("season")
    soil=request.GET.get("soil")

    if search:
        crops=[
            c for c in crops
            if search.lower() in c["name"].lower()
        ]
    
    if season:
        crops=[
            c for c in crops
            if c["season"].lower==season.lower()
        ]

    if soil:
        crops=[
           c for c in crops
           if soil.lower in [s.lower() for s in c.get("soil",[])]
        ]
    return JsonResponse({
        "count": len(crops),
        "crops": crops
    })