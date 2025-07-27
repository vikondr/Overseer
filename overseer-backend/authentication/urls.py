from django.urls import path, include
from . import views

urlpatterns = [
    path('test/', views.AuthView.as_view(), name='auth_test'),
]