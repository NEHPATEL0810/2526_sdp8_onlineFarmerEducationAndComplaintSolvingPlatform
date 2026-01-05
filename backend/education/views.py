from django.shortcuts import render
import requests
from django.http import JsonResponse
from django.conf import settings

def market_prices(request):
    url="https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

    params={
        "api-key":settings.DATA_GOV_API_KEY,
        "format":"json",
        "limit": request.GET.get("limit",20),
    }

    if request.GET.get("state"):
        params["filters[state]"]=request.GET["state"]

    if request.GET.get("commodity"):
        params["filters[commodity]"]=request.GET["commodity"]

    response=requests.get(url,params=params)
    return JsonResponse(response.json(), safe=False)