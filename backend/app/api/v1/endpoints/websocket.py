"""
WebSocket hub — real-time broadcast to all connected clients.
"""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])

# Connected clients
_connections: list[WebSocket] = []


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    _connections.append(websocket)
    try:
        while True:
            # Keep connection alive, listen for pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        _connections.remove(websocket)


def broadcast(message: dict):
    """
    Send a message to all connected WebSocket clients.
    Safe to call from sync context (FastAPI endpoints).
    """
    for ws in _connections[:]:  # copy list to avoid mutation during iteration
        try:
            asyncio.create_task(ws.send_json(message))
        except Exception:
            try:
                _connections.remove(ws)
            except ValueError:
                pass
