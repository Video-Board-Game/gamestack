# game_interface/models.py
from django.db import models
from django.contrib.auth.models import User
import uuid
import json

class GameSession(models.Model):
    """Model representing a game session"""
    SESSION_STATUS_CHOICES = (
        ('setup', 'Setup'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
    )
    
    GAME_TYPE_CHOICES = (
        ('chess', 'Chess'),
        ('catan', 'Settlers of Catan'),
        ('dnd', 'Dungeons & Dragons'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_sessions')
    game_type = models.CharField(max_length=50, choices=GAME_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=SESSION_STATUS_CHOICES, default='setup')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.game_type} - {self.id}"
    
    def get_absolute_url(self):
        from django.urls import reverse
        return reverse('game_board', kwargs={'session_id': self.id})
    
    def get_game_pieces(self):
        """Get all game pieces for this session"""
        return self.game_pieces.all()
    
    def get_game_moves(self):
        """Get all moves for this session in chronological order"""
        return self.game_moves.order_by('timestamp')
    
    def get_latest_state(self):
        """Get the latest game state as a dictionary"""
        pieces = self.get_game_pieces()
        return {
            'id': str(self.id),
            'game_type': self.game_type,
            'status': self.status,
            'pieces': [piece.to_dict() for piece in pieces],
            'updated_at': self.updated_at.isoformat()
        }

class GamePiece(models.Model):
    """Model representing a game piece"""
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
    
    def __str__(self):
        return f"{self.piece_type} at ({self.position_x}, {self.position_y})"
    
    def to_dict(self):
        """Convert the piece to a dictionary for JSON serialization"""
        return {
            'id': self.id,
            'type': self.piece_type,
            'color': self.piece_color,
            'position': {
                'x': self.position_x,
                'y': self.position_y,
                'z': self.position_z
            },
            'rotation': self.rotation,
            'is_active': self.is_active,
            'metadata': self.metadata
        }
    
    @classmethod
    def create_initial_pieces(cls, session, game_type):
        """Create the initial pieces for a game based on game type"""
        if game_type == 'chess':
            # Create chess pieces
            pieces = []
            
            # Create pawns
            for i in range(8):
                # White pawns
                pieces.append(cls(
                    session=session,
                    piece_type='pawn',
                    piece_color='white',
                    position_x=i * 10 + 5,  # Positions from 5 to 75 (spaced by 10)
                    position_y=85,  # Second row from bottom
                ))
                
                # Black pawns
                pieces.append(cls(
                    session=session,
                    piece_type='pawn',
                    piece_color='black',
                    position_x=i * 10 + 5,
                    position_y=25,  # Second row from top
                ))
            
            # Create back row pieces - white
            back_row_white = [
                ('rook', 5), ('knight', 15), ('bishop', 25), ('queen', 35),
                ('king', 45), ('bishop', 55), ('knight', 65), ('rook', 75)
            ]
            
            for piece_type, x in back_row_white:
                pieces.append(cls(
                    session=session,
                    piece_type=piece_type,
                    piece_color='white',
                    position_x=x,
                    position_y=95,  # Bottom row
                ))
            
            # Create back row pieces - black
            back_row_black = [
                ('rook', 5), ('knight', 15), ('bishop', 25), ('queen', 35),
                ('king', 45), ('bishop', 55), ('knight', 65), ('rook', 75)
            ]
            
            for piece_type, x in back_row_black:
                pieces.append(cls(
                    session=session,
                    piece_type=piece_type,
                    piece_color='black',
                    position_x=x,
                    position_y=5,  # Top row
                ))
            
            # Bulk create all pieces
            cls.objects.bulk_create(pieces)
            
        elif game_type == 'catan':
            # Create basic Catan pieces (simplified)
            # For a real implementation, this would be more complex
            pieces = []
            
            # Create the hexagonal board tiles
            hex_centers = [
                (50, 30), (65, 40), (35, 40),  # Top row
                (20, 50), (50, 50), (80, 50),  # Middle row
                (35, 60), (65, 60), (50, 70)   # Bottom row
            ]
            
            tile_types = ['wood', 'brick', 'wheat', 'sheep', 'ore', 'desert', 'wood', 'brick', 'wheat']
            
            for i, (x, y) in enumerate(hex_centers):
                pieces.append(cls(
                    session=session,
                    piece_type='tile',
                    piece_color=tile_types[i],
                    position_x=x,
                    position_y=y,
                    metadata={'resource': tile_types[i]}
                ))
            
            # Create some settlements and roads as examples
            pieces.append(cls(
                session=session,
                piece_type='settlement',
                piece_color='red',
                position_x=45,
                position_y=40,
            ))
            
            pieces.append(cls(
                session=session,
                piece_type='road',
                piece_color='red',
                position_x=48,
                position_y=45,
                rotation=45,  # Angled road
            ))
            
            # Bulk create all pieces
            cls.objects.bulk_create(pieces)
            
        elif game_type == 'dnd':
            # Create basic D&D setup
            # This would be highly customizable in a real implementation
            pieces = []
            
            # Create some character tokens
            character_positions = [(20, 20), (30, 30), (40, 20), (25, 40)]
            character_types = ['fighter', 'wizard', 'rogue', 'cleric']
            
            for i, (x, y) in enumerate(character_positions):
                pieces.append(cls(
                    session=session,
                    piece_type='character',
                    piece_color='blue',
                    position_x=x,
                    position_y=y,
                    metadata={'class': character_types[i]}
                ))
            
            # Create some enemy tokens
            enemy_positions = [(70, 70), (80, 70), (75, 60)]
            enemy_types = ['goblin', 'goblin', 'hobgoblin']
            
            for i, (x, y) in enumerate(enemy_positions):
                pieces.append(cls(
                    session=session,
                    piece_type='enemy',
                    piece_color='red',
                    position_x=x,
                    position_y=y,
                    metadata={'type': enemy_types[i]}
                ))
            
            # Create some environment objects
            pieces.append(cls(
                session=session,
                piece_type='object',
                piece_color='brown',
                position_x=50,
                position_y=50,
                metadata={'type': 'table'}
            ))
            
            pieces.append(cls(
                session=session,
                piece_type='object',
                piece_color='gray',
                position_x=60,
                position_y=30,
                metadata={'type': 'pillar'}
            ))
            
            # Bulk create all pieces
            cls.objects.bulk_create(pieces)
        
        return cls.objects.filter(session=session)

class GameMove(models.Model):
    """Model representing a move in a game"""
    id = models.AutoField(primary_key=True)
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='game_moves')
    piece = models.ForeignKey(GamePiece, on_delete=models.CASCADE, related_name='moves')
    from_x = models.FloatField()
    from_y = models.FloatField()
    to_x = models.FloatField()
    to_y = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Move {self.id}: {self.piece} from ({self.from_x}, {self.from_y}) to ({self.to_x}, {self.to_y})"
    
    def to_dict(self):
        """Convert the move to a dictionary for JSON serialization"""
        return {
            'id': self.id,
            'piece_id': self.piece.id,
            'piece_type': self.piece.piece_type,
            'from': {'x': self.from_x, 'y': self.from_y},
            'to': {'x': self.to_x, 'y': self.to_y},
            'timestamp': self.timestamp.isoformat()
        }

class RobotCommand(models.Model):
    """Model representing a command sent to the robot"""
    COMMAND_TYPE_CHOICES = (
        ('move', 'Move Piece'),
        ('camera', 'Camera Control'),
        ('reset', 'Reset Game'),
        ('system', 'System Command'),
    )
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    
    id = models.AutoField(primary_key=True)
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='robot_commands')
    command_type = models.CharField(max_length=20, choices=COMMAND_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    parameters = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    error_message = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.command_type} command ({self.status})"
    
    def to_dict(self):
        """Convert the command to a dictionary for JSON serialization"""
        return {
            'id': self.id,
            'type': self.command_type,
            'status': self.status,
            'parameters': self.parameters,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'error_message': self.error_message
        }
    
    @classmethod
    def create_move_command(cls, session, piece, target_x, target_y):
        """Create a command to move a piece"""
        return cls.objects.create(
            session=session,
            command_type='move',
            parameters={
                'piece_id': piece.id,
                'from_x': piece.position_x,
                'from_y': piece.position_y,
                'to_x': target_x,
                'to_y': target_y
            }
        )
    
    @classmethod
    def create_camera_command(cls, session, direction):
        """Create a command to control the camera"""
        return cls.objects.create(
            session=session,
            command_type='camera',
            parameters={
                'direction': direction
            }
        )