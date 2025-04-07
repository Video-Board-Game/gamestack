// static/js/game_interface.js

class GameInterface {
    constructor(sessionId, gameType, initialGameState) {
        this.sessionId = sessionId;
        this.gameType = gameType;
        this.gameState = initialGameState || {};
        this.startPosition = null;
        this.targetPosition = null;
        this.robotStatus = 'idle'; // idle, moving, error
        this.moveHistory = [];
        this.selectionPhase = 'start'; // Can be 'start' or 'target'
        
        // DOM Elements
        this.cameraFeed = document.getElementById('camera-feed');
        this.pieceOverlay = document.getElementById('piece-overlay');
        this.selectionInfo = document.getElementById('selected-piece-info');
        this.confirmMoveBtn = document.getElementById('confirm-move');
        this.cancelMoveBtn = document.getElementById('cancel-move');
        this.statusMessages = document.getElementById('status-messages');
        this.gameHistoryList = document.getElementById('game-history-list');
        
        // Initialize WebSocket
        this.initializeWebSocket();
        
        // Initialize the interface
        this.setupEventListeners();
        this.loadGameState();
    }

    initializeWebSocket() {
        const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = 'mcalec.dyn.wpi.edu';
        const port = '8000';
        
        this.websocket = new WebSocket(
            `${wsScheme}://${host}:${port}/ws/game/${this.sessionId}/`
        );
        
        this.websocket.onopen = () => {
            this.showStatus('WebSocket connection established', 'success');
            // Request initial game state
            this.sendWebSocketMessage({
                command: 'get_game_state'
            });
        };
        
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.websocket.onclose = () => {
            this.showStatus('WebSocket connection closed. Reconnecting...', 'warning');
            // Attempt to reconnect after 3 seconds
            setTimeout(() => this.initializeWebSocket(), 3000);
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showStatus('WebSocket connection error', 'danger');
        };
    }
    
    sendWebSocketMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not ready, message not sent:', message);
            this.showStatus('Connection issue. Please refresh the page.', 'warning');
        }
    }
    
    handleWebSocketMessage(data) {
        console.log('Received WebSocket message:', data);
        
        switch (data.type) {
            case 'game_state':
                this.gameState = data.state;
                this.renderGameState();
                break;
                
            case 'move_response':
                if (data.success) {
                    this.showStatus('Move completed successfully', 'success');
                    this.robotStatus = 'idle';
                    // Request updated game state
                    this.sendWebSocketMessage({
                        command: 'get_game_state'
                    });
                    this.cancelMove(); // Reset selection
                    
                    // Add to move history if not already updated by game state
                    if (this.gameHistoryList && data.move) {
                        this.addMoveToHistory(data.move);
                    }
                } else {
                    this.showStatus('Move failed: ' + (data.error || 'Unknown error'), 'danger');
                    this.robotStatus = 'idle';
                    this.confirmMoveBtn.disabled = false;
                    this.cancelMoveBtn.disabled = false;
                }
                break;
                
            case 'camera_response':
                if (data.success) {
                    this.showStatus(`Camera moved ${data.direction}`, 'success');
                } else {
                    this.showStatus('Failed to move camera: ' + (data.error || 'Unknown error'), 'warning');
                }
                break;
                
            case 'reset_response':
                if (data.success) {
                    this.showStatus('Game has been reset', 'success');
                    // Request updated game state
                    this.sendWebSocketMessage({
                        command: 'get_game_state'
                    });
                    this.cancelMove();
                    
                    // Add reset to history
                    if (this.gameHistoryList) {
                        this.addResetToHistory();
                    }
                } else {
                    this.showStatus('Failed to reset game: ' + (data.error || 'Unknown error'), 'danger');
                }
                this.robotStatus = 'idle';
                break;
                
            case 'robot_status':
                this.robotStatus = data.status;
                if (data.status === 'error') {
                    this.showStatus(`Robot error: ${data.message}`, 'danger');
                } else if (data.status === 'moving') {
                    this.showStatus(`Robot status: ${data.message}`, 'info');
                }
                break;
                
            default:
                console.warn('Unknown message type:', data.type);
        }
    }

    setupEventListeners() {
        // Piece overlay click handling
        this.pieceOverlay.addEventListener('click', (e) => {
            if (this.robotStatus === 'moving') {
                this.showStatus('Robot is currently moving. Please wait.', 'warning');
                return;
            }
            
            const rect = this.pieceOverlay.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Normalize coordinates to 0-100 range for cleaner data
            const normalizedX = Math.round((x / rect.width) * 100);
            const normalizedY = Math.round((y / rect.height) * 100);
            
            if (this.selectionPhase === 'start') {
                this.setStartPosition(normalizedX, normalizedY);
                this.selectionPhase = 'target';
            } else {
                this.setTargetPosition(normalizedX, normalizedY);
            }
        });

        // Button event listeners
        this.confirmMoveBtn.addEventListener('click', () => {
            this.confirmMove();
        });

        this.cancelMoveBtn.addEventListener('click', () => {
            this.cancelMove();
        });
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelMove();
            } else if (e.key === 'Enter' && !this.confirmMoveBtn.disabled) {
                this.confirmMove();
            }
        });
        
        // Camera control buttons
        const cameraControls = document.querySelectorAll('.camera-control');
        cameraControls.forEach(button => {
            button.addEventListener('click', (e) => {
                const direction = button.dataset.direction;
                this.controlCamera(direction);
            });
        });

        // Reset game button
        const resetGameBtn = document.getElementById('reset-game');
        if (resetGameBtn) {
            resetGameBtn.addEventListener('click', () => {
                this.resetGame();
            });
        }
        
        // End session button
        const endSessionBtn = document.getElementById('end-session');
        if (endSessionBtn) {
            endSessionBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to end this game session?')) {
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = '/api/session/end/';
                    
                    const csrfInput = document.createElement('input');
                    csrfInput.type = 'hidden';
                    csrfInput.name = 'csrfmiddlewaretoken';
                    csrfInput.value = this.getCsrfToken();
                    
                    const sessionInput = document.createElement('input');
                    sessionInput.type = 'hidden';
                    sessionInput.name = 'session_id';
                    sessionInput.value = this.sessionId;
                    
                    form.appendChild(csrfInput);
                    form.appendChild(sessionInput);
                    document.body.appendChild(form);
                    form.submit();
                }
            });
        }
    }

    loadGameState() {
        // Request game state via WebSocket
        this.sendWebSocketMessage({
            command: 'get_game_state'
        });
    }

    renderGameState() {
        // Clear existing piece highlights
        const existingHighlights = document.querySelectorAll('.piece-highlight');
        existingHighlights.forEach(el => el.remove());
        
        // Render pieces on the overlay
        if (this.gameState.pieces && this.gameState.pieces.length > 0) {
            this.gameState.pieces.forEach(piece => {
                if (piece.is_active) {
                    this.renderPiece(piece);
                }
            });
        }
        
        // Update game history if available
        if (this.gameState.moves && this.gameHistoryList) {
            this.updateGameHistory(this.gameState.moves);
        }
    }
    
    renderPiece(piece) {
        // In a production system, this would render pieces on the overlay
        // For this demo, we'll create simple visual indicators for pieces
        // In a real implementation with a camera feed, you would likely not
        // need to render the pieces, as they would be visible in the camera feed
        
        // Check if piece highlight already exists
        const existingHighlight = document.getElementById(`piece-${piece.id}`);
        if (existingHighlight) {
            // Update position
            existingHighlight.style.left = `${piece.position.x}%`;
            existingHighlight.style.top = `${piece.position.y}%`;
        } else {
            // Create new highlight
            const highlight = document.createElement('div');
            highlight.id = `piece-${piece.id}`;
            highlight.className = 'piece-highlight';
            highlight.style.left = `${piece.position.x}%`;
            highlight.style.top = `${piece.position.y}%`;
            highlight.style.width = '15px';
            highlight.style.height = '15px';
            highlight.style.position = 'absolute';
            highlight.style.borderRadius = '50%';
            highlight.style.transform = 'translate(-50%, -50%)';
            
            // Use different colors based on piece color
            if (piece.color === 'white') {
                highlight.style.border = '2px solid white';
                highlight.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            } else if (piece.color === 'black') {
                highlight.style.border = '2px solid black';
                highlight.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            } else {
                // Use piece color directly
                highlight.style.border = `2px solid ${piece.color}`;
                highlight.style.backgroundColor = `rgba(${this.colorToRgba(piece.color)}, 0.5)`;
            }
            
            // Add tooltip with piece info
            highlight.title = `${piece.type} (${piece.color})`;
            
            this.pieceOverlay.appendChild(highlight);
        }
    }
    
    colorToRgba(color) {
        // Simple color mapping to RGBA
        const colorMap = {
            'red': '255, 0, 0',
            'blue': '0, 0, 255',
            'green': '0, 128, 0',
            'yellow': '255, 255, 0',
            'brown': '165, 42, 42',
            'gray': '128, 128, 128'
        };
        
        return colorMap[color.toLowerCase()] || '128, 128, 128';
    }
    
    updateGameHistory(moves) {
        if (!this.gameHistoryList) return;
        
        // Sort moves by timestamp
        const sortedMoves = [...moves].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        // Clear existing history
        this.gameHistoryList.innerHTML = '';
        
        // Add moves to history
        sortedMoves.forEach(move => {
            const item = document.createElement('li');
            item.className = 'list-group-item';
            
            const time = new Date(move.timestamp);
            const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        Moved from (${Math.round(move.from.x)}, ${Math.round(move.from.y)}) 
                        to (${Math.round(move.to.x)}, ${Math.round(move.to.y)})
                    </div>
                    <span class="timestamp">${timeString}</span>
                </div>
            `;
            
            this.gameHistoryList.appendChild(item);
        });
    }
    
    addMoveToHistory(move) {
        if (!this.gameHistoryList) return;
        
        const time = new Date();
        const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const item = document.createElement('li');
        item.className = 'list-group-item';
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    Moved from (${Math.round(move.from.x)}, ${Math.round(move.from.y)}) 
                    to (${Math.round(move.to.x)}, ${Math.round(move.to.y)})
                </div>
                <span class="timestamp">${timeString}</span>
            </div>
        `;
        
        if (this.gameHistoryList.firstChild) {
            this.gameHistoryList.insertBefore(item, this.gameHistoryList.firstChild);
        } else {
            this.gameHistoryList.appendChild(item);
        }
    }
    
    addResetToHistory() {
        if (!this.gameHistoryList) return;
        
        const time = new Date();
        const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const item = document.createElement('li');
        item.className = 'list-group-item';
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>Game reset to starting position</div>
                <span class="timestamp">${timeString}</span>
            </div>
        `;
        
        if (this.gameHistoryList.firstChild) {
            this.gameHistoryList.insertBefore(item, this.gameHistoryList.firstChild);
        } else {
            this.gameHistoryList.appendChild(item);
        }
    }

    setStartPosition(x, y) {
        this.startPosition = { x, y };
        this.showStatus(`Start position set (${x}, ${y})`, 'success');
        this.updateSelectionInfo();
        
        // Add visual indicator for the start location
        this.showPositionIndicator(x, y, 'start-indicator', 'blue');
    }
    
    setTargetPosition(x, y) {
        this.targetPosition = { x, y };
        this.showStatus(`Target position set (${x}, ${y})`, 'success');
        this.confirmMoveBtn.disabled = false;
        this.updateSelectionInfo();
        
        // Add visual indicator for the target location
        this.showPositionIndicator(x, y, 'target-indicator', 'green');
    }

    showPositionIndicator(x, y, id, color) {
        // Clear any existing indicator
        const existingIndicator = document.getElementById(id);
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create and position the indicator
        const indicator = document.createElement('div');
        indicator.id = id;
        indicator.className = 'position-absolute';
        indicator.style.width = '20px';
        indicator.style.height = '20px';
        
        // Set colors based on type
        if (color === 'blue') {
            indicator.style.backgroundColor = 'rgba(0, 0, 255, 0.5)';
            indicator.style.border = '2px solid blue';
        } else {
            indicator.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
            indicator.style.border = '2px solid green';
        }
        
        indicator.style.borderRadius = '50%';
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.left = `${x}%`;
        indicator.style.top = `${y}%`;
        indicator.style.pointerEvents = 'none'; // Don't interfere with clicks
        indicator.style.zIndex = '20';
        
        // Add to the overlay
        this.pieceOverlay.appendChild(indicator);
    }

    updateSelectionInfo() {
        let infoHTML = '<div class="card mb-2"><div class="card-body"><h5 class="card-title">Selected Positions</h5>';
        
        if (this.startPosition) {
            infoHTML += `<p><strong>Start:</strong> (${this.startPosition.x}, ${this.startPosition.y})</p>`;
        }
        
        if (this.targetPosition) {
            infoHTML += `<p><strong>Target:</strong> (${this.targetPosition.x}, ${this.targetPosition.y})</p>`;
        }
        
        if (!this.startPosition && !this.targetPosition) {
            infoHTML += '<p class="text-muted">Click to select start position</p>';
        } else if (this.startPosition && !this.targetPosition) {
            infoHTML += '<p class="text-muted">Now click to select target position</p>';
        }
        
        infoHTML += '</div></div>';
        this.selectionInfo.innerHTML = infoHTML;
        
        // Enable/disable buttons based on selections
        this.cancelMoveBtn.disabled = !(this.startPosition || this.targetPosition);
        this.confirmMoveBtn.disabled = !(this.startPosition && this.targetPosition);
    }

    confirmMove() {
        if (this.startPosition && this.targetPosition) {
            this.showStatus('Sending move command to robot...', 'info');
            this.robotStatus = 'moving';
            this.confirmMoveBtn.disabled = true;
            this.cancelMoveBtn.disabled = true;
            
            // Send both start and target positions
            this.sendWebSocketMessage({
                command: 'move_piece',
                start_x: this.startPosition.x,
                start_y: this.startPosition.y,
                goal_x: this.targetPosition.x,
                goal_y: this.targetPosition.y
            });
        }
    }

    cancelMove() {
        // Clear any position indicators
        const startIndicator = document.getElementById('start-indicator');
        if (startIndicator) {
            startIndicator.remove();
        }
        
        const targetIndicator = document.getElementById('target-indicator');
        if (targetIndicator) {
            targetIndicator.remove();
        }
        
        this.startPosition = null;
        this.targetPosition = null;
        this.selectionPhase = 'start';
        this.updateSelectionInfo();
        this.showStatus('Selection cleared', 'info');
    }
    
    controlCamera(direction) {
        this.showStatus(`Moving camera ${direction}...`, 'info');
        
        // Use WebSocket instead of fetch
        this.sendWebSocketMessage({
            command: 'control_camera',
            direction: direction
        });
    }

    resetGame() {
        if (!confirm('Are you sure you want to reset the game? This will return all pieces to their starting positions.')) {
            return;
        }
        
        this.showStatus('Resetting game...', 'info');
        this.robotStatus = 'moving';
        
        // Use WebSocket instead of fetch
        this.sendWebSocketMessage({
            command: 'reset_game'
        });
    }

    showStatus(message, type) {
        const alertClass = `alert alert-${type} alert-dismissible fade show`;
        this.statusMessages.innerHTML = `
            <div class="${alertClass}" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        // Auto-clear success and info messages after 5 seconds
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                const alert = this.statusMessages.querySelector('.alert');
                if (alert) {
                    // Use Bootstrap's alert dismiss if available
                    if (typeof bootstrap !== 'undefined') {
                        const bsAlert = new bootstrap.Alert(alert);
                        bsAlert.close();
                    } else {
                        // Fallback
                        alert.remove();
                    }
                }
            }, 5000);
        }
    }

    getCsrfToken() {
        // Get CSRF token from cookie or from the hidden input field
        const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfInput) {
            return csrfInput.value;
        }
        
        // Fallback to cookie
        return this.getCookie('csrftoken');
    }
    
    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
}

// Initialize the game interface when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const gameBoard = document.getElementById('game-board');
    
    if (gameBoard) {
        const sessionId = gameBoard.dataset.sessionId;
        const gameType = gameBoard.dataset.gameType;
        let gameState = {};
        
        try {
            gameState = JSON.parse(gameBoard.dataset.gameState || '{}');
        } catch (e) {
            console.error('Error parsing game state:', e);
        }
        
        window.gameInterface = new GameInterface(sessionId, gameType, gameState);
    }
});