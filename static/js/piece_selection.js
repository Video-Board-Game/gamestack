// static/js/piece_selection.js

class PieceSelectionManager {
    constructor(gameInterface) {
        this.gameInterface = gameInterface;
        this.selectedPiece = null;
        this.targetPosition = null;
        this.selectionActive = false;
        this.pieceOverlay = document.getElementById('piece-overlay');
        this.cameraFeed = document.getElementById('camera-feed');
        this.selectedPieceInfo = document.getElementById('selected-piece-info');
        this.confirmMoveBtn = document.getElementById('confirm-move');
        this.cancelMoveBtn = document.getElementById('cancel-move');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Set up click event on the overlay
        if (this.pieceOverlay) {
            this.pieceOverlay.addEventListener('click', (e) => this.handleOverlayClick(e));
        }
        
        // Button controls
        if (this.confirmMoveBtn) {
            this.confirmMoveBtn.addEventListener('click', () => this.confirmMove());
        }
        
        if (this.cancelMoveBtn) {
            this.cancelMoveBtn.addEventListener('click', () => this.cancelSelection());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelSelection();
            } else if (e.key === 'Enter' && this.selectedPiece && this.targetPosition) {
                this.confirmMove();
            }
        });
    }
    
    handleOverlayClick(e) {
        // Get click coordinates relative to the overlay
        const rect = this.pieceOverlay.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Convert to normalized coordinates (0-100)
        const normalizedX = Math.round((clickX / rect.width) * 100);
        const normalizedY = Math.round((clickY / rect.height) * 100);
        
        if (!this.selectedPiece) {
            // First click - select a piece
            this.selectPieceAt(normalizedX, normalizedY);
        } else {
            // Second click - set target position
            this.setTargetPosition(normalizedX, normalizedY);
        }
    }
    
    selectPieceAt(x, y) {
        this.gameInterface.showStatus('Detecting piece...', 'info');
        
        // Call the API to detect a piece at the clicked location
        fetch(`/api/game/${this.gameInterface.sessionId}/detect_piece/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.gameInterface.getCsrfToken()
            },
            body: JSON.stringify({ x, y })
        })
        .then(response => response.json())
        .then(data => {
            if (data.type === 'piece_detected') {
                this.selectedPiece = data.piece;
                this.updateSelectedPieceInfo();
                this.highlightSelectedPiece();
                this.gameInterface.showStatus(`Selected: ${data.piece.type}`, 'success');
                this.selectionActive = true;
                this.cancelMoveBtn.disabled = false;
            } else {
                this.gameInterface.showStatus('No piece detected at that location', 'warning');
            }
        })
        .catch(error => {
            console.error('Error detecting piece:', error);
            this.gameInterface.showStatus('Error detecting piece', 'danger');
        });
    }
    
    setTargetPosition(x, y) {
        this.targetPosition = { x, y };
        this.gameInterface.showStatus(`Target position set: (${x}, ${y})`, 'success');
        this.showTargetIndicator(x, y);
        this.confirmMoveBtn.disabled = false;
    }
    
    highlightSelectedPiece() {
        // Add visual highlighting to the selected piece
        const existingHighlights = document.querySelectorAll('.selected-piece-highlight');
        existingHighlights.forEach(el => el.remove());
        
        if (this.selectedPiece) {
            const highlight = document.createElement('div');
            highlight.classList.add('selected-piece-highlight');
            highlight.style.position = 'absolute';
            highlight.style.left = `${this.selectedPiece.position.x}%`;
            highlight.style.top = `${this.selectedPiece.position.y}%`;
            highlight.style.width = '30px';
            highlight.style.height = '30px';
            highlight.style.borderRadius = '50%';
            highlight.style.border = '2px solid #007bff';
            highlight.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
            highlight.style.transform = 'translate(-50%, -50%)';
            highlight.style.pointerEvents = 'none';
            highlight.style.zIndex = '100';
            highlight.style.animation = 'pulse-highlight 1.5s infinite';
            
            this.pieceOverlay.appendChild(highlight);
        }
    }
    
    showTargetIndicator(x, y) {
        // Remove any existing target indicators
        const existingIndicators = document.querySelectorAll('.target-indicator');
        existingIndicators.forEach(el => el.remove());
        
        // Create and add the new target indicator
        const indicator = document.createElement('div');
        indicator.classList.add('target-indicator');
        indicator.style.position = 'absolute';
        indicator.style.left = `${x}%`;
        indicator.style.top = `${y}%`;
        indicator.style.width = '20px';
        indicator.style.height = '20px';
        indicator.style.borderRadius = '50%';
        indicator.style.border = '2px solid #28a745';
        indicator.style.backgroundColor = 'rgba(40, 167, 69, 0.3)';
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.pointerEvents = 'none';
        indicator.style.zIndex = '99';
        
        // Add connecting line between piece and target
        if (this.selectedPiece) {
            const line = document.createElement('div');
            line.classList.add('move-line');
            
            // Calculate line position and length
            const pieceX = this.selectedPiece.position.x;
            const pieceY = this.selectedPiece.position.y;
            const length = Math.sqrt(Math.pow(x - pieceX, 2) + Math.pow(y - pieceY, 2));
            const angle = Math.atan2(y - pieceY, x - pieceX) * 180 / Math.PI;
            
            line.style.position = 'absolute';
            line.style.left = `${pieceX}%`;
            line.style.top = `${pieceY}%`;
            line.style.width = `${length}%`;
            line.style.height = '2px';
            line.style.backgroundColor = 'rgba(40, 167, 69, 0.7)';
            line.style.transformOrigin = '0 0';
            line.style.transform = `rotate(${angle}deg)`;
            line.style.pointerEvents = 'none';
            line.style.zIndex = '98';
            
            this.pieceOverlay.appendChild(line);
        }
        
        this.pieceOverlay.appendChild(indicator);
    }
    
    updateSelectedPieceInfo() {
        if (!this.selectedPieceInfo) return;
        
        if (this.selectedPiece) {
            // Display information about the selected piece
            let pieceTypeDisplay = this.selectedPiece.type.charAt(0).toUpperCase() + this.selectedPiece.type.slice(1);
            let pieceColorDisplay = this.selectedPiece.color.charAt(0).toUpperCase() + this.selectedPiece.color.slice(1);
            
            this.selectedPieceInfo.innerHTML = `
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">Selected Piece</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="piece-preview me-3" style="background-color: ${this.getPieceColor(this.selectedPiece.color)}; width: 30px; height: 30px; border-radius: 50%;"></div>
                            <div>
                                <h6 class="mb-0">${pieceTypeDisplay}</h6>
                                <small class="text-muted">${pieceColorDisplay}</small>
                            </div>
                        </div>
                        <p class="mb-0"><small>Position: (${Math.round(this.selectedPiece.position.x)}, ${Math.round(this.selectedPiece.position.y)})</small></p>
                    </div>
                </div>
                <p class="mt-3 mb-0 text-muted">Click on the board to set a destination.</p>
            `;
        } else {
            this.selectedPieceInfo.innerHTML = `
                <p class="text-center text-muted">Click on a game piece to select it.</p>
            `;
        }
    }
    
    getPieceColor(colorName) {
        // Map color names to CSS colors
        const colorMap = {
            'white': '#f8f9fa',
            'black': '#212529',
            'red': '#dc3545',
            'blue': '#007bff',
            'green': '#28a745',
            'yellow': '#ffc107',
            'purple': '#6f42c1',
            'orange': '#fd7e14',
            'brown': '#8B4513'
        };
        
        return colorMap[colorName.toLowerCase()] || '#6c757d';
    }
    
    confirmMove() {
        if (!this.selectedPiece || !this.targetPosition) return;
        
        this.gameInterface.showStatus('Sending move command to robot...', 'info');
        this.confirmMoveBtn.disabled = true;
        this.cancelMoveBtn.disabled = true;
        
        // Send the move command to the robot
        fetch(`/api/game/${this.gameInterface.sessionId}/move_piece/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.gameInterface.getCsrfToken()
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
                this.gameInterface.showStatus('Move completed successfully', 'success');
                this.addMoveToHistory(this.selectedPiece, this.targetPosition);
                this.resetSelection();
                
                // Refresh the game state to show the updated positions
                this.gameInterface.loadGameState();
            } else {
                this.gameInterface.showStatus('Failed to move piece: ' + (data.error || 'Unknown error'), 'danger');
                this.confirmMoveBtn.disabled = false;
                this.cancelMoveBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error moving piece:', error);
            this.gameInterface.showStatus('Error sending move command', 'danger');
            this.confirmMoveBtn.disabled = false;
            this.cancelMoveBtn.disabled = false;
        });
    }
    
    addMoveToHistory(piece, targetPosition) {
        // Add the move to the game history display
        const historyList = document.getElementById('game-history-list');
        if (!historyList) return;
        
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        listItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-semibold">${piece.type}</span> 
                    moved to (${Math.round(targetPosition.x)}, ${Math.round(targetPosition.y)})
                </div>
                <small class="text-muted">${timeString}</small>
            </div>
        `;
        
        // Insert at the beginning of the list
        if (historyList.firstChild) {
            historyList.insertBefore(listItem, historyList.firstChild);
        } else {
            historyList.appendChild(listItem);
        }
    }
    
    cancelSelection() {
        this.resetSelection();
        this.gameInterface.showStatus('Selection canceled', 'info');
    }
    
    resetSelection() {
        this.selectedPiece = null;
        this.targetPosition = null;
        this.selectionActive = false;
        this.confirmMoveBtn.disabled = true;
        this.cancelMoveBtn.disabled = true;
        this.updateSelectedPieceInfo();
        
        // Clear visual indicators
        const highlights = document.querySelectorAll('.selected-piece-highlight, .target-indicator, .move-line');
        highlights.forEach(el => el.remove());
    }
}

// CSS to be added to your styles.css file
/*
@keyframes pulse-highlight {
    0% {
        transform: translate(-50%, -50%) scale(1);
        box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7);
    }
    70% {
        transform: translate(-50%, -50%) scale(1.1);
        box-shadow: 0 0 0 10px rgba(0, 123, 255, 0);
    }
    100% {
        transform: translate(-50%, -50%) scale(1);
        box-shadow: 0 0 0 0 rgba(0, 123, 255, 0);
    }
}
*/