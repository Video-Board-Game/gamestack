// static/js/game_interface.js

class GameInterface {
    constructor(sessionId, gameType, initialGameState) {
        this.sessionId = sessionId;
        this.gameType = gameType;
        this.gameState = initialGameState || {};
        this.selectedPiece = null;
        this.targetPosition = null;
        this.robotStatus = 'idle'; // idle, moving, error
        this.moveHistory = [];
        
        // DOM Elements
        this.cameraFeed = document.getElementById('camera-feed');
        this.pieceOverlay = document.getElementById('piece-overlay');
        this.selectedPieceInfo = document.getElementById('selected-piece-info');
        this.confirmMoveBtn = document.getElementById('confirm-move');
        this.cancelMoveBtn = document.getElementById('cancel-move');
        this.statusMessages = document.getElementById('status-messages');
        this.gameHistoryList = document.getElementById('game-history-list');
        
        // Initialize the interface
        this.setupEventListeners();
        this.loadGameState();
        
        // Set up polling for game state updates (since we're not using WebSockets)
        this.startGameStatePolling();
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
            
            if (!this.selectedPiece) {
                this.selectPieceAt(normalizedX, normalizedY);
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

    startGameStatePolling() {
        // Poll for game state updates every 5 seconds
        this.gameStateInterval = setInterval(() => {
            this.loadGameState();
        }, 5000);
    }
    
    stopGameStatePolling() {
        if (this.gameStateInterval) {
            clearInterval(this.gameStateInterval);
        }
    }

    loadGameState() {
        // Load the current game state from the server
        fetch(`/api/game/${this.sessionId}/state/`)
            .then(response => response.json())
            .then(data => {
                this.gameState = data;
                this.renderGameState();
            })
            .catch(error => {
                console.error('Error loading game state:', error);
                this.showStatus('Failed to load game state', 'danger');
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
                        Moved ${move.piece_type} from (${Math.round(move.from.x)}, ${Math.round(move.from.y)}) 
                        to (${Math.round(move.to.x)}, ${Math.round(move.to.y)})
                    </div>
                    <span class="timestamp">${timeString}</span>
                </div>
            `;
            
            this.gameHistoryList.appendChild(item);
        });
    }

    selectPieceAt(x, y) {
        this.showStatus('Detecting piece...', 'info');
        this.robotStatus = 'detecting';
        
        fetch(`/api/game/${this.sessionId}/detect_piece/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken()
            },
            body: JSON.stringify({ x, y })
        })
        .then(response => response.json())
        .then(data => {
            if (data.type === 'piece_detected') {
                this.selectedPiece = data.piece;
                this.updateSelectedPieceInfo();
                this.highlightSelectedPiece();
                this.showStatus(`Selected: ${data.piece.type}`, 'success');
                this.robotStatus = 'idle';
            } else {
                this.showStatus('No piece detected at that location', 'warning');
                this.robotStatus = 'idle';
            }
        })
        .catch(error => {
            console.error('Error detecting piece:', error);
            this.showStatus('Error detecting piece', 'danger');
            this.robotStatus = 'idle';
        });
    }
    
    highlightSelectedPiece() {
        // Remove any existing selection highlights
        const existingSelection = document.querySelector('.selected-piece');
        if (existingSelection) {
            existingSelection.classList.remove('selected-piece');
        }
        
        // Add selection highlight to the selected piece
        if (this.selectedPiece) {
            const pieceEl = document.getElementById(`piece-${this.selectedPiece.id}`);
            if (pieceEl) {
                pieceEl.classList.add('selected-piece');
                // Make the highlight pulse
                pieceEl.style.animation = 'pulse-blue 2s infinite';
            }
        }
    }

    updateSelectedPieceInfo() {
        if (this.selectedPiece) {
            let pieceInfo = `
                <div class="card mb-2">
                    <div class="card-body">
                        <h5 class="card-title">Selected Piece</h5>
                        <p class="card-text">
                            <strong>Type:</strong> ${this.selectedPiece.type.charAt(0).toUpperCase() + this.selectedPiece.type.slice(1)}<br>
                            <strong>Color:</strong> ${this.selectedPiece.color.charAt(0).toUpperCase() + this.selectedPiece.color.slice(1)}
                        </p>
                    </div>
                </div>
            `;
            this.selectedPieceInfo.innerHTML = pieceInfo;
            this.cancelMoveBtn.disabled = false;
        } else {
            this.selectedPieceInfo.innerHTML = '<p class="text-muted">Click on a piece to select it</p>';
            this.cancelMoveBtn.disabled = true;
            this.confirmMoveBtn.disabled = true;
        }
    }

    setTargetPosition(x, y) {
        this.targetPosition = { x, y };
        this.showStatus(`Target location set (${x}, ${y})`, 'success');
        this.confirmMoveBtn.disabled = false;
        
        // Add visual indicator for the target location
        this.showTargetIndicator(x, y);
    }

    showTargetIndicator(x, y) {
        // Clear any existing indicators
        const existingIndicator = document.getElementById('target-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create and position the indicator
        const indicator = document.createElement('div');
        indicator.id = 'target-indicator';
        indicator.className = 'position-absolute';
        indicator.style.width = '20px';
        indicator.style.height = '20px';
        indicator.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
        indicator.style.border = '2px solid green';
        indicator.style.borderRadius = '50%';
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.left = `${x}%`;
        indicator.style.top = `${y}%`;
        indicator.style.pointerEvents = 'none'; // Don't interfere with clicks
        indicator.style.zIndex = '20';
        
        // Add to the overlay
        this.pieceOverlay.appendChild(indicator);
    }

    confirmMove() {
        if (this.selectedPiece && this.targetPosition) {
            this.showStatus('Sending move command to robot...', 'info');
            this.robotStatus = 'moving';
            this.confirmMoveBtn.disabled = true;
            this.cancelMoveBtn.disabled = true;
            
            fetch(`/api/game/${this.sessionId}/move_piece/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    piece_id: this.selectedPiece.id,
                    target_x: this.targetPosition.x,
                    target_y: this.targetPosition.y
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.type === 'move_response' && data.success) {
                    this.showStatus('Move completed successfully', 'success');
                    this.robotStatus = 'idle';
                    this.loadGameState(); // Refresh game state
                    this.cancelMove(); // Reset selection
                    
                    // Add to move history
                    if (this.gameHistoryList && data.move_id) {
                        const time = new Date();
                        const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        const item = document.createElement('li');
                        item.className = 'list-group-item';
                        item.innerHTML = `
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    Moved ${this.selectedPiece.type} to (${Math.round(this.targetPosition.x)}, ${Math.round(this.targetPosition.y)})
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
                } else {
                    this.showStatus('Move failed: ' + (data.error || 'Unknown error'), 'danger');
                    this.robotStatus = 'idle';
                    this.confirmMoveBtn.disabled = false;
                    this.cancelMoveBtn.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error moving piece:', error);
                this.showStatus('Error sending move command', 'danger');
                this.robotStatus = 'idle';
                this.confirmMoveBtn.disabled = false;
                this.cancelMoveBtn.disabled = false;
            });
        }
    }

    cancelMove() {
        // Clear any target indicators
        const indicator = document.getElementById('target-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        // Remove selection highlight
        const selectedPieceEl = document.querySelector('.selected-piece');
        if (selectedPieceEl) {
            selectedPieceEl.classList.remove('selected-piece');
            selectedPieceEl.style.animation = '';
        }
        
        this.selectedPiece = null;
        this.targetPosition = null;
        this.updateSelectedPieceInfo();
        this.showStatus('Selection cleared', 'info');
    }
    
    controlCamera(direction) {
        this.showStatus(`Moving camera ${direction}...`, 'info');
        
        fetch(`/api/camera/control/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken()
            },
            body: JSON.stringify({
                session_id: this.sessionId,
                direction: direction
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showStatus(`Camera moved ${direction}`, 'success');
            } else {
                this.showStatus('Failed to move camera: ' + (data.error || 'Unknown error'), 'warning');
            }
        })
        .catch(error => {
            console.error('Error controlling camera:', error);
            this.showStatus('Error sending camera command', 'danger');
        });
    }

    resetGame() {
        if (!confirm('Are you sure you want to reset the game? This will return all pieces to their starting positions.')) {
            return;
        }
        
        this.showStatus('Resetting game...', 'info');
        this.robotStatus = 'moving';
        
        fetch(`/api/game/${this.sessionId}/reset/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showStatus('Game has been reset', 'success');
                this.loadGameState();
                this.cancelMove();
                
                // Add to history
                if (this.gameHistoryList) {
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
            } else {
                this.showStatus('Failed to reset game: ' + (data.error || 'Unknown error'), 'danger');
            }
            this.robotStatus = 'idle';
        })
        .catch(error => {
            console.error('Error resetting game:', error);
            this.showStatus('Error resetting game', 'danger');
            this.robotStatus = 'idle';
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