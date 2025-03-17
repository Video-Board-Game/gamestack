# game_interface/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Page views
    path('', views.HomeView.as_view(), name='home'),
    path('games/', views.GamesView.as_view(), name='games'),
    path('tutorial/', views.TutorialView.as_view(), name='tutorial'),
    path('game/<uuid:session_id>/', views.GameBoardView.as_view(), name='game_board'),
    
    # API endpoints
    path('api/session/start/', views.start_session, name='start_session'),
    path('api/session/end/', views.end_session, name='end_session'),
    path('api/game/<uuid:session_id>/state/', views.get_game_state, name='get_game_state'),
    path('api/game/<uuid:session_id>/detect_piece/', views.detect_piece, name='detect_piece'),
    path('api/game/<uuid:session_id>/move_piece/', views.move_piece, name='move_piece'),
    path('api/game/<uuid:session_id>/reset/', views.reset_game, name='reset_game'),
    path('api/camera/control/', views.camera_control, name='camera_control'),
]

# Add this to your project's main urls.py
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('game_interface.urls')),
    path('accounts/', include('django.contrib.auth.urls')),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
"""