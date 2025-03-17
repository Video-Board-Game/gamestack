# Board Game Robot Teleoperation Interface

A Django-based web application that provides a teleoperation interface for remotely controlling a robotic arm to play physical board games.

## Project Overview

This is the web interface for the "Board Game Robot" capstone project (RBE 594). The system enables users to remotely play physical board games by directing a robotic arm to move game pieces through an intuitive point-and-click interface.

## Key Features

- **Game Selection**: Support for Chess, Settlers of Catan, and Dungeons & Dragons
- **Interactive Interface**: Point-and-click controls for selecting and moving pieces
- **Visual Feedback**: Highlighting of selected pieces and target locations with connecting lines
- **Camera Controls**: Directional buttons to adjust the robot's camera view
- **Game Session Management**: Start, reset, and end game sessions
- **Move History**: Chronological log of all piece movements
- **User Authentication**: Secure login and account management

## Technical Implementation

### Frontend
- **Bootstrap 5**: Responsive layout with clean, modern UI components
- **JavaScript**: Client-side logic for game piece selection and movement
- **Dynamic Visuals**: Real-time feedback for piece selection and placement

### Backend
- **Django**: Web framework handling requests, templates, and database operations
- **SQLite Database**: Storage for game sessions, pieces, and moves
- **REST API Endpoints**: Interface between UI and robot control systems

## Project Structure
- **Final**: Our final structure will look like this at the end
```
Gameon/
├── manage.py
├── README.md
├── requirements.txt
├── Gameon/         # Project settings directory
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── dash/                       # Main app directory
│   ├── __init__.py
│   ├── admin.py                # Admin site configuration
│   ├── apps.py
│   ├── models.py               # Database models
│   ├── views.py                # View controllers and API endpoints
│   ├── urls.py                 # URL routing configuration
│   └── tests.py
├── static/                     # Static assets
│   ├── css/
│   │   ├── styles.css          # General styling
│   │   └── game_pieces.css     # Game piece styling
│   ├── js/
│   │   ├── game_interface.js   # Game board interaction
│   │   └── connection_status.js # Connection monitoring
│   └── images/
│       ├── chess.jpg
│       ├── catan.jpg
│       └── dnd.jpg
└── templates/
    ├── game_interface/
    │   ├── base.html           # Base template with navigation
    │   ├── home.html           # Dashboard with active sessions
    │   ├── games.html          # Game selection interface
    │   ├── tutorial.html       # How-to guide
    │   └── game_board.html     # Main game interface
    └── registration/
        ├── login.html          # Login page
        ├── register.html       # Registration page
        ├── password_reset_form.html
        └── password_reset_complete.html
```

## Database Models

Our application uses several models to track game state:

```python
# Key models in models.py
class GameSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_sessions')
    game_type = models.CharField(max_length=50, choices=GAME_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=SESSION_STATUS_CHOICES, default='setup')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class GamePiece(models.Model):
    id = models.AutoField(primary_key=True)
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='game_pieces')
    piece_type = models.CharField(max_length=50)
    piece_color = models.CharField(max_length=50, default='white')
    position_x = models.FloatField()
    position_y = models.FloatField()
    position_z = models.FloatField(default=0)
    rotation = models.FloatField(default=0)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

class GameMove(models.Model):
    id = models.AutoField(primary_key=True)
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='game_moves')
    piece = models.ForeignKey(GamePiece, on_delete=models.CASCADE, related_name='moves')
    from_x = models.FloatField()
    from_y = models.FloatField()
    to_x = models.FloatField()
    to_y = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
```

## API Endpoints

The application exposes RESTful endpoints for game interaction:

```
GET  /api/game/<session_id>/state/       # Get current game state
POST /api/game/<session_id>/detect_piece/ # Detect piece at coordinates
POST /api/game/<session_id>/move_piece/  # Command robot to move piece
POST /api/game/<session_id>/reset/       # Reset game to initial state
POST /api/camera/control/                # Control camera position
POST /api/session/start/                 # Start new game session
POST /api/session/end/                   # End current session
```

## Game Interface Usage

1. **Select a Piece**:
   - Click on a game piece on the board
   - The piece will be highlighted with a blue pulsing indicator
   - Information about the piece will appear in the sidebar

2. **Choose a Destination**:
   - Click anywhere on the board to set a target location
   - A green target indicator will appear
   - A line will connect the piece to the target

3. **Execute the Move**:
   - Click "Confirm Move" to send the command to the robot
   - The robot will physically move the piece
   - The game state will update to reflect the new position

## Setup Instructions

1. Clone the repository
2. Install required packages:
   ```
   pip install -r requirements.txt
   ```
3. Run migrations:
   ```
   python manage.py makemigrations dash
   python manage.py migrate
   ```
4. Create a superuser:
   ```
   python manage.py createsuperuser
   ```
5. Start the development server:
   ```
   python manage.py runserver
   ```
6. Access the application at http://localhost:8000

## Project Team
- Peter Abosede
- Mark Caleca
- Isaac Lau 
- Samuel Markwick


## Acknowledgments

Worcester Polytechnic Institute - Robotics Engineering Department
