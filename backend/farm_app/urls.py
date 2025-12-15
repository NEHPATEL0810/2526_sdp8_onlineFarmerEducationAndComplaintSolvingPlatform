from django.urls import path
from .views import register_user,forgot_password

urlpatterns=[
    path("auth/register/",register_user),
    path("auth/forgot-password/",forgot_password)
]