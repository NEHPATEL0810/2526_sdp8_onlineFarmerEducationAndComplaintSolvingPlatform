from django.urls import path
from .views import market_prices,agri_schemes,get_all_crops,create_doubt, my_doubts, reply_doubt,user_profile,scheme_details,crop_details

urlpatterns = [
    path("market-prices/", market_prices),
    path("agri-schemes/", agri_schemes),
    path("crops/",get_all_crops),
    path("doubts/create/", create_doubt),
    path("doubts/my/", my_doubts),
    path("doubts/reply/<int:pk>/", reply_doubt),
    path("profile/",user_profile),
    path("agri-schemes/<int:scheme_id>/", scheme_details),
    path("crops/scrape/<str:crop_name>/", crop_details),
]
