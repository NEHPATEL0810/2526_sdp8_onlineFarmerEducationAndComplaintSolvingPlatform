from django.urls import path
from . import views

urlpatterns = [
    path("chat/", views.farmer_chat, name="farmer_chat"),
]
