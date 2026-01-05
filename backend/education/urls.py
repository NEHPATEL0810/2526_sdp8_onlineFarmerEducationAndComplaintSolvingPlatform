from django.urls import path
from .views import market_prices

urlpatterns = [
    path("market-prices/", market_prices),
]
