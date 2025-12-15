from django.shortcuts import render
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from .serializers import RegisterSerializer
from django.contrib.auth.models import User

@api_view(["POST"])
def register_user(request):
    serializer=RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response(
            {"message":"User Registred successfully"},
            status=status.HTTP_201_CREATED
        )
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )
# Create your views here.
def home(request):
    return render(request,"home.html")

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    email=request.data.get("email")

    if not email:
        return Response(
            {"error":"Email is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    try:
        user=User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {"error":"No user registred with this email"},
            status=status.HTTP_404_NOT_FOUND
        )
    uid=urlsafe_base64_encode(force_bytes(user.pk))
    token=default_token_generator.make_token(user)

    reset_link=f"http:/localhost:5173/reset-password/{uid}/{token}"

    send_mail(
        subject="Password reset - FarmEasy",
        message=f"Click the link to reset your password:\n{reset_link}",
        from_email=None,
        recipient_list=[email]
    )
    return Response(
        {"message":"Password reset link sent to you email"},
        status=status.HTTP_200_OK
    )
