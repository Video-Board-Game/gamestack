class GameInterface {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.selectedPiece = null;
        this.targetPosition = null;
        this.websocket = null;
        this.initializeWebSocket();
        this.setupEventListeners();
    }

    initializeWebSocket() {
        const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        this.websocket = new WebSocket(
            `${wsScheme}://${window.location.host}/ws/game/${this.sessionId}/`
        );
        
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
    }

    setupEventListeners() {
        const overlay = document.getElementById('piece-overlay');
        overlay.addEventListener('click', (e) => {
            const rect = overlay.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (!this.selectedPiece) {
                this.selectPieceAt(x, y);
            } else {
                this.setTargetPosition(x, y);
            }
        });

        document.getElementById('confirm-move').addEventListener('click', () => {
            this.confirmMove();
        });

        document.getElementById('cancel-move').addEventListener('click', () => {
            this.cancelMove();
        });
    }

    selectPieceAt(x, y) {
        // Send selection to backend for piece detection
        this.websocket.send(JSON.stringify({
            command: 'detect_piece',
            x: x,
            y: y
        }));
    }

    setTargetPosition(x, y) {
        this.targetPosition = { x, y };
        document.getElementById('confirm-move').disabled = false;
    }

    confirmMove() {
        if (this.selectedPiece && this.targetPosition) {
            this.websocket.send(JSON.stringify({
                command: 'move_piece',
                piece_id: this.selectedPiece.id,
                target_x: this.targetPosition.x,
                target_y: this.targetPosition.y
            }));
        }
    }

    cancelMove() {
        this.selectedPiece = null;
        this.targetPosition = null;
        document.getElementById('confirm-move').disabled = true;
        document.getElementById('cancel-move').disabled = true;
        document.getElementById('selected-piece-info').innerHTML = '';
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'piece_detected':
                this.selectedPiece = data.piece;
                document.getElementById('selected-piece-info').innerHTML = 
                    `Selected: ${data.piece.type}`;
                document.getElementById('cancel-move').disabled = false;
                break;
            
            case 'move_response':
                if (data.success) {
                    this.showStatus('Move completed successfully', 'success');
                    this.cancelMove();
                } else {
                    this.showStatus('Move failed. Please try again.', 'error');
                }
                break;
        }
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('status-messages');
        statusDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    }
}