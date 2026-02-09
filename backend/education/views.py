import requests
from rest_framework.response import Response
from .models import Scheme,Crop
from .serializers import SchemeSerializer,CropSerializer
from rest_framework.decorators import api_view
from django.http import JsonResponse
from django.conf import settings
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from .utils import load_crops_data
import urllib.parse
import pandas as pd
from pathlib import Path

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

    try:
        response=requests.get(url,params=params,timeout=20)

        if response.status_code==200:
            return JsonResponse(response.json(),safe=False)
        
    except requests.exceptions.RequestException:
        print("API failed. Loading backup CSV...")
    
    csv_path=Path(settings.BASE_DIR)/"farmeasy"/"data"/"market_price.csv"
    df=pd.read_csv(csv_path)

    if request.GET.get("state"):
        df=df[df["State"]==request.GET["state"]]
    df.columns=df.columns.str.strip()
    df.columns=df.columns.str.lower().str.replace(" ","_")

    limit = int(request.GET.get("limit", 200))
    df = df.head(limit)
    
    data={
        "records":df.to_dict(orient="records")
    }
    return JsonResponse(data,safe=False)

@api_view(['GET'])
def agri_schemes(request):
    schemes=Scheme.objects.all()
    serializer=SchemeSerializer(schemes,many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_all_crops(request):
    crops=Crop.objects.all()

    search = request.GET.get("search")
    if search:
        crops = crops.filter(name__icontains=search)
        
    serializer=CropSerializer(crops,many=True)
    return Response(serializer.data)