"""
URL configuration for farmeasy project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path,include
from farm_app.views import home
from django.contrib.auth import views as auth_views

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
urlpatterns = [
    # path("",home,name="home"),
    path("admin/", admin.site.urls),
    path("api/",include("chatbot.urls")),
    path("api/",include("farm_app.urls")),

    path("api/auth/login/",TokenObtainPairView.as_view()),
    path("api/auth/refresh/", TokenRefreshView.as_view()),

    path("api/auth/password-reset/",auth_views.PasswordResetView.as_view(),name="password_reset"),
    path("api/auth/password-reset/done/",auth_views.PasswordResetDoneView.as_view(),name="password_reset_done"),
    path("api/auth/reset/<uidb64>/<token>/",auth_views.PasswordResetConfirmView.as_view(),name="password_reset_confirm"),
    path("api/auth/reset/done/",auth_views.PasswordResetCompleteView.as_view(),name="password_reset_complete"),

    path("",include("api.urls")),
]
