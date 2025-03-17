# game_interface/views.py
from django.views.generic import TemplateView, ListView, RedirectView
from django.contrib.auth.views import LoginView, LogoutView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.urls import reverse_lazy
from .models import GameSession, GamePiece
import uuid


from django.http import JsonResponse
from .firebase import add_user, get_user

def create_user(request):
    """Django view to add a user"""
    response = add_user("user1", "John Doe", "john@example.com")
    return JsonResponse({"message": response})

def fetch_user(request):
    """Django view to fetch a user"""
    user_data = get_user("user1")
    return JsonResponse({"user": user_data if user_data else "User not found"})



class HomeView(TemplateView):
    template_name = 'game_interface/home.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.user.is_authenticated:
            context['active_sessions'] = GameSession.objects.filter(
                is_active=True
            ).order_by('-created_at')[:5]
        return context

class GamesView(ListView):
    template_name = 'game_interface/games.html'
    context_object_name = 'available_games'
    
    def get_queryset(self):
        return [
            {
                'name': 'Chess',
                'description': 'Classic two-player strategy game',
                'image': 'games/chess.jpg',
                'players': '2'
            },
            {
                'name': 'Settlers of Catan',
                'description': 'Resource management and trading game',
                'image': 'games/catan.jpg',
                'players': '3-4'
            },
            {
                'name': 'Dungeons & Dragons',
                'description': 'Tabletop role-playing game',
                'image': 'games/dnd.jpg',
                'players': '2-6'
            }
        ]

class TutorialView(TemplateView):
    template_name = 'game_interface/tutorial.html'

class CustomLoginView(LoginView):
    template_name = 'game_interface/login.html'
    success_url = reverse_lazy('home')

class CustomLogoutView(LogoutView):
    next_page = reverse_lazy('home')

# Session management views
def start_session(request):
    if request.method == 'POST' and request.user.is_authenticated:
        session = GameSession.objects.create(
            session_id=uuid.uuid4(),
            game_type=request.POST.get('game_type', 'chess'),
            is_active=True
        )
        return JsonResponse({
            'success': True,
            'redirect_url': reverse_lazy('game_board', kwargs={'session_id': session.session_id})
        })
    return JsonResponse({'success': False}, status=400)

def end_session(request):
    if request.method == 'POST' and request.user.is_authenticated:
        session_id = request.POST.get('session_id')
        try:
            session = GameSession.objects.get(session_id=session_id, is_active=True)
            session.is_active = False
            session.save()
            return JsonResponse({'success': True})
        except GameSession.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Session not found'}, status=404)
    return JsonResponse({'success': False}, status=400)

# Game board view (from previous code)
class GameBoardView(LoginRequiredMixin, TemplateView):
    template_name = 'game_interface/game_board.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        session_id = self.kwargs.get('session_id')
        context['game_session'] = GameSession.objects.get(session_id=session_id)
        context['game_pieces'] = GamePiece.objects.filter(game_session_id=session_id)
        return context