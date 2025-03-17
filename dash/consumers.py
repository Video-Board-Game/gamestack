import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .robot_interface import RobotController

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.robot_controller = RobotController()
        await self.accept()

    async def receive(self, text_data):
        data = json.loads(text_data)
        command = data.get('command')
        
        if command == 'move_piece':
            piece_id = data.get('piece_id')
            target_x = data.get('target_x')
            target_y = data.get('target_y')
            
            # Send command to robot
            success = await self.robot_controller.move_piece(piece_id, target_x, target_y)
            
            # Send response back to client
            await self.send(json.dumps({
                'type': 'move_response',
                'success': success,
                'piece_id': piece_id
            }))