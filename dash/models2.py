from django.db import models

# Create your models here.
from django.db import models

class GameSession(models.Model):
    session_id = models.UUIDField(primary_key=True)
    game_type = models.CharField(max_length=50)  # e.g., "chess", "catan"
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

class GamePiece(models.Model):
    piece_id = models.AutoField(primary_key=True)
    game_session = models.ForeignKey(GameSession, on_delete=models.CASCADE)
    piece_type = models.CharField(max_length=50)
    position_x = models.FloatField()
    position_y = models.FloatField()
    orientation = models.FloatField(default=0.0)