from rest_framework import serializers
from .models import Scheme,Crop,Doubt

class SchemeSerializer(serializers.ModelSerializer):
    class Meta:
        model=Scheme
        fields="__all__"

class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model=Crop
        fields="__all__"

class DoubtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doubt
        fields = "__all__"
        read_only_fields = ["farmer", "reply", "status"]
