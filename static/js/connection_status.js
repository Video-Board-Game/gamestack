// static/js/connection_status.js
document.addEventListener('DOMContentLoaded', function() {
    const connectionIndicator = document.getElementById('connection-status');
    
    if (connectionIndicator) {
        // Without WebSockets, just show a "connected" status
        connectionIndicator.classList.remove('offline');
        connectionIndicator.classList.add('online');
        
        // Check server health periodically
        setInterval(function() {
            fetch('/', { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        connectionIndicator.classList.remove('offline');
                        connectionIndicator.classList.add('online');
                    } else {
                        connectionIndicator.classList.remove('online');
                        connectionIndicator.classList.add('offline');
                    }
                })
                .catch(() => {
                    connectionIndicator.classList.remove('online');
                    connectionIndicator.classList.add('offline');
                });
        }, 30000); // Check every 30 seconds
    }
});