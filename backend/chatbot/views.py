from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .mongodb import chat_logs

@api_view(['GET'])
def mongo_test(request):
    chat_logs.insert_one({
        "test":"MongoDB connection successul"
    })
    return Response({"statis" : "MongoDB Connected successfully"})

# Create your views here.
