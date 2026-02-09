from django.urls import path
from .views import market_prices,agri_schemes,get_all_crops,create_doubt, my_doubts, reply_doubt,user_profile

urlpatterns = [
    path("market-prices/", market_prices),
    path("agri-schemes/", agri_schemes),
    path("crops/",get_all_crops),
    path("doubts/create/", create_doubt),
    path("doubts/my/", my_doubts),
    path("doubts/reply/<int:pk>/", reply_doubt),
    path("profile/",user_profile),
]
