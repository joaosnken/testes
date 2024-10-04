const WebSocket = require('ws');

// Defina a função sendWebSocketData no lado do servidor
function sendWebSocketData(ws, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.error('Erro ao enviar dados pelo WebSocket: WebSocket não está aberto.');
    }
}

module.exports = {
   sendWebSocketData
};
  
  