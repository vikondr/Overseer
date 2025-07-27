from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# Create your views here.
class AuthView(APIView):
    def get(self, request):
        return Response({"message": "Authentication endpoint is working!"}, status=status.HTTP_200_OK)