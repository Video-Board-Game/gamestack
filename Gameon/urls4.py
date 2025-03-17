"""
URL configuration for Gameon project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
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
from django.urls import path
from dash import views

from django.urls import path
from dash import views

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
    path('games/', views.GamesView.as_view(), name='games'),
    path('tutorial/', views.TutorialView.as_view(), name='tutorial'),
    path('login/', views.CustomLoginView.as_view(), name='login'),
    path('logout/', views.CustomLogoutView.as_view(), name='logout'),
    path('game/<uuid:session_id>/', views.GameBoardView.as_view(), name='game_board'),
    path('api/session/start/', views.start_session, name='start_session'),
    path('api/session/end/', views.end_session, name='end_session'),
]