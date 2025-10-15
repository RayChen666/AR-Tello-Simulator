// src/droneTest.js - Entry point for drone test page
import Server from '../server/client.js';

// Initialize the server with the WebSocket port
const server = new Server(22346);

// Expose server to the window object for global access
window.server = server;

// Initialize drone-specific functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('Drone test interface initialized via webpack');
  
  // Expose drone methods on window for use in the DroneTest.html script
  window.droneAPI = {
    connect: server.connectDrone.bind(server),
    sendCommand: server.sendDroneCommand.bind(server),
    getStatus: server.getDroneStatus.bind(server)
  };
  
  // Add a status indicator to show webpack is working
  const container = document.querySelector('.container');
  if (container) {
    const statusElement = document.createElement('div');
    statusElement.style.padding = '10px';
    statusElement.style.marginTop = '20px';
    statusElement.style.backgroundColor = '#e6f7ff';
    statusElement.style.borderRadius = '5px';
    statusElement.innerHTML = '<strong>Webpack:</strong> Drone interface loaded via webpack bundle';
    container.appendChild(statusElement);
  }
  
  // Check if emergency controls are visible
  const emergencyBtn = document.getElementById('emergency-btn');
  if (!emergencyBtn) {
    console.warn('Emergency controls not found in the DOM. Make sure to update DroneTest.html.');
  }
});