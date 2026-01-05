import re
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile

class RegisterSerializer(serializers.ModelSerializer):
    password=serializers.CharField(write_only=True)
    mobile_number=serializers.CharField(write_only=True)
    class Meta:
        model= User
        fields=["username","email","password","mobile_number"]

    def validate_mobile_number(self,value):
        if not re.match(r"^[6-9]\d{9}$",value):
            raise serializers.ValidationError(
                "Enter a valid 10-digit mobile number"
            )
        if Profile.objects.filter(mobile_number=value).exists():
            raise serializers.ValidationError("Mobile Number already registered")
        return value

    def validate_email(self,value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already register")
        return value
        
    def create(self,validated_data):
        mobile=validated_data.pop("mobile_number")

        user=User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        Profile.objects.create(
            user=user,
            mobile_number=mobile,
            role="FARMER"
        )
        return user