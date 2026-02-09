from rest_framework import serializers
from .models import Scheme,Crop

class SchemeSerializer(serializers.ModelSerializer):
    class Meta:
        model=Scheme
        fields="__all__"

class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model=Crop
        fields="__all__"