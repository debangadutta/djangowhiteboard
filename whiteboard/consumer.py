from .models import Board, BoardObject

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class BoardConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope["url_route"]["kwargs"]["board_id"]
        await self.accept()
        await self.send_initial_data()
    
    async def send_initial_data(self):
        payload = await self.get_board_data()
        return await self.send_json({"type":"INITIAL_DATA", "data":payload})

    @database_sync_to_async
    def get_board_data(self):
        board = Board.objects.get(pk=self.board_id)
        payload = board.to_json()
        return payload

    @database_sync_to_async
    def add_object(self, object_data):
        obj = BoardObject.from_json(self.board_id, object_data)
        obj.save()

    async def receive_json(self, content, **kwargs ):
        message_type = content.get("type")
        if message_type == "ADD_OBJECT":
            object_data = content["data"]["Object"]
            await self.add_object(object_data)