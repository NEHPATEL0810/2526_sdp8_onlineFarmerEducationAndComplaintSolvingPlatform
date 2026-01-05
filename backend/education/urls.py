from django.urls import path
from .views import market_prices,agri_schemes,get_all_crops

urlpatterns = [
    path("market-prices/", market_prices),
    path("agri-schemes/", agri_schemes),
    path("crops/",get_all_crops),
]
