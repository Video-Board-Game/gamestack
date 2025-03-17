# game_interface/views.py
from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import TemplateView, ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
import json
import uuid
from datetime import datetime



from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.shortcuts import render, redirect
from django.contrib import messages
from django.views.generic import FormView, View
from django.urls import reverse_lazy

from .models import GameSession, GamePiece, GameMove, RobotCommand

#User Authentication 
class LoginView(FormView):
    template_name = 'registration/login.html'
    form_class = AuthenticationForm
    success_url = reverse_lazy('home')
    
    def form_valid(self, form):
        username = form.cleaned_data.get('username')
        password = form.cleaned_data.get('password')
        user = authenticate(username=username, password=password)
        if user is not None:
            login(self.request, user)
            messages.success(self.request, f"Welcome back, {username}!")
            
            # Redirect to next parameter if present
            next_url = self.request.GET.get('next')
            if next_url:
                return redirect(next_url)
        
        return super().form_valid(form)
    
    def form_invalid(self, form):
        messages.error(self.request, "Invalid username or password.")
        return super().form_invalid(form)

class LogoutView(View):
    def get(self, request):
        logout(request)
        messages.info(request, "You have successfully logged out.")
        return redirect('home')

class RegisterView(FormView):
    template_name = 'registration/register.html'
    form_class = UserCreationForm
    success_url = reverse_lazy('login')
    
    def form_valid(self, form):
        form.save()
        username = form.cleaned_data.get('username')
        messages.success(self.request, f"Account created for {username}. You can now log in.")
        return super().form_valid(form)




# Home view
class HomeView(TemplateView):
    template_name = 'game_interface/home.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.user.is_authenticated:
            context['active_sessions'] = GameSession.objects.filter(
                user=self.request.user,
                status__in=['setup', 'active', 'paused']
            ).order_by('-updated_at')[:5]
        return context

# Games list view
class GamesView(ListView):
    template_name = 'game_interface/games.html'
    context_object_name = 'available_games'
    
    def get_queryset(self):
        # Return list of available game types
        return [
            {
                'id': 'chess',
                'name': 'Chess',
                'description': 'Classic two-player strategy game',
                'image': 'games/chess.jpg'
            },
            {
                'id': 'catan',
                'name': 'Settlers of Catan',
                'description': 'Strategic resource management and trading game',
                'image': 'games/catan.jpg'
            },
            {
                'id': 'dnd',
                'name': 'Dungeons & Dragons',
                'description': 'Tabletop role-playing game',
                'image': 'games/dnd.jpg'
            }
        ]

# Tutorial view
class TutorialView(TemplateView):
    template_name = 'game_interface/tutorial.html'

# Game board view
class GameBoardView(LoginRequiredMixin, DetailView):
    model = GameSession
    template_name = 'game_interface/game_board.html'
    context_object_name = 'game_session'
    
    def get_object(self):
        # Get the session by UUID
        return get_object_or_404(
            GameSession,
            id=self.kwargs.get('session_id'),
            user=self.request.user
        )
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Get the current state of the game
        game_state = self.object.get_latest_state()
        
        context['game_state'] = json.dumps(game_state)
        context['game_type'] = self.object.game_type
        context['camera_feed_url'] = self.get_camera_feed_url()
        return context
    
    def get_camera_feed_url(self):
        """Get the URL for the camera feed"""
        # In a real implementation, this might come from a configuration,
        # or be dynamically generated based on the robot's camera
        return '/api/camera/feed/'  # This would be handled by a view that streams the camera feed

# API Endpoints

@login_required
@require_http_methods(["POST"])
def start_session(request):
    """Start a new game session"""
    try:
        data = json.loads(request.body)
        game_type = data.get('game_type', 'chess')
        
        # Create new session
        session = GameSession.objects.create(
            user=request.user,
            game_type=game_type,
            status='setup'
        )
        
        # Create initial game pieces based on game type
        GamePiece.create_initial_pieces(session, game_type)
        
        # Update session status
        session.status = 'active'
        session.save()
        
        return JsonResponse({
            'success': True,
            'session_id': str(session.id),
            'redirect_url': session.get_absolute_url()
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
@login_required
@require_http_methods(["POST"])
def end_session(request):
    """End a game session"""
    try:
        # Try to get data from JSON first
        try:
            data = json.loads(request.body)
            session_id = data.get('session_id')
        except json.JSONDecodeError:
            # If JSON fails, try getting from POST data
            session_id = request.POST.get('session_id')
        
        if not session_id:
            return JsonResponse({
                'success': False,
                'error': 'No session ID provided'
            }, status=400)
            
        session = get_object_or_404(
            GameSession,
            id=session_id,
            user=request.user
        )
        
        session.status = 'completed'
        session.save()
        
        # Check if the client wants JSON or HTML response
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({'success': True})
        else:
            # Redirect to home page
            return redirect('home')
    except Exception as e:
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
        else:
            messages.error(request, f"Error ending session: {str(e)}")
            return redirect('home')
@login_required
def get_game_state(request, session_id):
    """Get the current state of the game"""
    try:
        session = get_object_or_404(
            GameSession,
            id=session_id,
            user=request.user
        )
        
        game_state = session.get_latest_state()
        return JsonResponse(game_state)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@login_required
@require_http_methods(["POST"])
def detect_piece(request, session_id):
    """Detect a piece at the given coordinates"""
    try:
        session = get_object_or_404(
            GameSession,
            id=session_id,
            user=request.user
        )
        
        data = json.loads(request.body)
        x = data.get('x')
        y = data.get('y')
        
        # Get pieces near the clicked location
        # For simplicity, we'll use a simple distance calculation
        # In a real implementation, this would send a command to the robot
        # to use computer vision to detect the piece
        
        # Find the closest piece (within a certain threshold)
        threshold = 10  # 10% of the board dimension
        closest_piece = None
        min_distance = float('inf')
        
        for piece in GamePiece.objects.filter(session=session, is_active=True):
            # Calculate distance
            distance = ((piece.position_x - x) ** 2 + (piece.position_y - y) ** 2) ** 0.5
            
            if distance < threshold and distance < min_distance:
                closest_piece = piece
                min_distance = distance
        
        if closest_piece:
            # Return the detected piece
            return JsonResponse({
                'type': 'piece_detected',
                'piece': closest_piece.to_dict()
            })
        else:
            return JsonResponse({
                'type': 'no_piece',
                'message': 'No piece detected at that location'
            })
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)

@login_required
@require_http_methods(["POST"])
def move_piece(request, session_id):
    """Command the robot to move a piece"""
    try:
        session = get_object_or_404(
            GameSession,
            id=session_id,
            user=request.user
        )
        
        data = json.loads(request.body)
        piece_id = data.get('piece_id')
        target_x = data.get('target_x')
        target_y = data.get('target_y')
        
        # Get the piece
        piece = get_object_or_404(GamePiece, id=piece_id, session=session)
        
        # Create a move record
        move = GameMove.objects.create(
            session=session,
            piece=piece,
            from_x=piece.position_x,
            from_y=piece.position_y,
            to_x=target_x,
            to_y=target_y
        )
        
        # Create a robot command
        command = RobotCommand.create_move_command(
            session=session,
            piece=piece,
            target_x=target_x,
            target_y=target_y
        )
        
        # Update the piece position
        # In a real implementation, this would happen after the robot confirms the move
        piece.position_x = target_x
        piece.position_y = target_y
        piece.save()
        
        # Update command status
        command.status = 'completed'
        command.save()
        
        return JsonResponse({
            'type': 'move_response',
            'success': True,
            'piece_id': piece_id,
            'move_id': move.id
        })
    except Exception as e:
        return JsonResponse({
            'type': 'move_response',
            'success': False,
            'error': str(e)
        }, status=500)

@login_required
@require_http_methods(["POST"])
def reset_game(request, session_id):
    """Reset the game to its initial state"""
    try:
        session = get_object_or_404(
            GameSession,
            id=session_id,
            user=request.user
        )
        
        # Delete existing pieces
        GamePiece.objects.filter(session=session).delete()
        
        # Create new pieces
        GamePiece.create_initial_pieces(session, session.game_type)
        
        # Create a robot command for resetting
        RobotCommand.objects.create(
            session=session,
            command_type='reset',
            status='completed'
        )
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@login_required
@require_http_methods(["POST"])
def camera_control(request):
    """Control the camera direction"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        direction = data.get('direction')
        
        session = get_object_or_404(
            GameSession,
            id=session_id,
            user=request.user
        )
        
        # Create a camera control command
        command = RobotCommand.create_camera_command(
            session=session,
            direction=direction
        )
        
        # In a real implementation, this would send a command to the robot
        # For demo purposes, we'll simulate a successful control
        command.status = 'completed'
        command.save()
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

# URL patterns for the views
"""
urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('games/', GamesView.as_view(), name='games'),
    path('tutorial/', TutorialView.as_view(), name='tutorial'),
    path('game/<uuid:session_id>/', GameBoardView.as_view(), name='game_board'),
    
    # API endpoints
    path('api/session/start/', start_session, name='start_session'),
    path('api/session/end/', end_session, name='end_session'),
    path('api/game/<uuid:session_id>/state/', get_game_state, name='get_game_state'),
    path('api/game/<uuid:session_id>/detect_piece/', detect_piece, name='detect_piece'),
    path('api/game/<uuid:session_id>/move_piece/', move_piece, name='move_piece'),
    path('api/game/<uuid:session_id>/reset/', reset_game, name='reset_game'),
    path('api/camera/control/', camera_control, name='camera_control'),
]
"""