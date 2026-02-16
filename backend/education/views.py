import requests
from rest_framework.response import Response
from .models import Scheme,Crop,Doubt
from .serializers import SchemeSerializer,CropSerializer,DoubtSerializer
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from django.conf import settings
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from .utils import load_crops_data
import urllib.parse
import pandas as pd
from pathlib import Path

def market_prices(request):
    url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

    params = {
        "api-key": settings.DATA_GOV_API_KEY,
        "format": "json",
        "limit": request.GET.get("limit", 20),
    }

    if request.GET.get("state"):
        params["filters[state]"] = request.GET["state"]

    if request.GET.get("commodity"):
        params["filters[commodity]"] = request.GET["commodity"]

    try:
        response = requests.get(url, params=params, timeout=20)

        if response.status_code == 200:
            data = response.json()

            if data.get("records"):
                print("Live API used")
                data["source"] = "live"
                return JsonResponse(data, safe=False)

    except requests.exceptions.RequestException as e:
        print("API failed:", e)

    # Fallback only if API truly failed
    print("Using CSV fallback")

    csv_path = Path(settings.BASE_DIR) / "farmeasy" / "data" / "market_price.csv"
    df = pd.read_csv(csv_path)

    df.columns = df.columns.str.strip()
    df.columns = df.columns.str.lower().str.replace(" ", "_")

    if request.GET.get("state"):
        df = df[df["state"] == request.GET["state"]]

    limit = int(request.GET.get("limit", 200))
    df = df.head(limit)

    data = {
        "records": df.to_dict(orient="records"),
        "source": "csv"
    }

    return JsonResponse(data, safe=False)


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

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_doubt(request):
    serializer = DoubtSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(farmer=request.user)
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_doubts(request):
    doubts = Doubt.objects.filter(farmer=request.user)
    serializer = DoubtSerializer(doubts, many=True)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def reply_doubt(request, pk):
    doubt = Doubt.objects.get(id=pk)

    # Only admin/expert should reply
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)

    doubt.reply = request.data.get("reply")
    doubt.status = "Answered"
    doubt.save()

    return Response({"message": "Reply added"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    try:
        profile = request.user.profile
        mobile_number = profile.mobile_number
        role = profile.role
    except Exception:
        mobile_number = None
        role = "FARMER"

    return Response({
        "username": request.user.username,
        "email": request.user.email,
        "mobile_number": mobile_number,
        "role": role,
    })