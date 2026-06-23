import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Serve static assets from Vite's dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback all routes to index.html for React Router compatibility
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 5001;

// Active connections map: socket -> clientInfo
const clients = new Map();

// Helper to broadcast data to all connected clients
const broadcast = (data) => {
  const payload = JSON.stringify(data);
  for (const [ws] of clients.entries()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
};

// Helper to update and broadcast the roster of online users
const broadcastRoster = () => {
  const onlineUsers = Array.from(clients.values()).map(info => ({
    id: info.id,
    name: info.name,
    avatarUrl: info.avatarUrl,
    isOnline: true
  }));
  broadcast({ type: 'roster_update', users: onlineUsers });
};

wss.on('connection', (ws) => {
  console.log('New client connection initiated.');

  ws.on('message', (messageText) => {
    try {
      const data = JSON.parse(messageText);

      switch (data.type) {
        case 'register':
          // A client registers their identity (username, avatar, custom client-side id)
          const clientInfo = {
            id: data.user.id || `real_${data.user.name.toLowerCase().replace(/\s+/g, '_')}`,
            name: data.user.name,
            avatarUrl: data.user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.name}`
          };
          clients.set(ws, clientInfo);
          console.log(`Registered user: ${clientInfo.name} (${clientInfo.id})`);
          
          // Send confirmation back to registering client
          ws.send(JSON.stringify({ 
            type: 'register_ok', 
            user: clientInfo 
          }));
          
          // Broadcast updated roster of real online users
          broadcastRoster();
          break;

        case 'direct_message':
          // Route a message to a specific online user
          const senderInfo = clients.get(ws);
          if (!senderInfo) break;

          const msgPayload = {
            type: 'direct_message',
            id: `servermsg_${Date.now()}`,
            sender: senderInfo.id,
            senderName: senderInfo.name,
            senderAvatar: senderInfo.avatarUrl,
            recipient: data.to,
            text: data.text,
            time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            msgType: data.msgType || 'text',
            mediaUrl: data.mediaUrl,
            size: data.size,
            duration: data.duration,
            waveform: data.waveform
          };

          // Find recipient's socket connection
          let routed = false;
          for (const [clientSocket, info] of clients.entries()) {
            if (info.id === data.to && clientSocket.readyState === clientSocket.OPEN) {
              clientSocket.send(JSON.stringify(msgPayload));
              routed = true;
              break;
            }
          }
          
          // Acknowledge send state back to sender
          ws.send(JSON.stringify({
            type: 'message_ack',
            msgId: data.clientMsgId,
            status: routed ? 'delivered' : 'sent'
          }));
          
          console.log(`Direct message from ${senderInfo.name} to ${data.to} (Status: ${routed ? 'routed' : 'buffered/offline'})`);
          break;

        case 'message_read':
          // data.by = reader's userId, data.from = original sender whose messages were read
          const readSender = clients.get(ws);
          if (!readSender) break;
          // Notify the original sender that their messages have been read
          for (const [clientSocket, info] of clients.entries()) {
            if (info.id === data.from && clientSocket.readyState === clientSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: 'messages_read',
                by: readSender.id    // who read the messages
              }));
              break;
            }
          }
          console.log(`Read receipt: ${readSender.name} read messages from ${data.from}`);
          break;

        case 'channel_message':
          // Broadcast a message to a channel (like #general-announcements)
          const chanSender = clients.get(ws);
          if (!chanSender) break;

          broadcast({
            type: 'channel_message',
            id: `servermsg_${Date.now()}`,
            channel: data.channel,
            sender: chanSender.id,
            senderName: chanSender.name,
            senderAvatar: chanSender.avatarUrl,
            text: data.text,
            time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          
          console.log(`Channel broadcast from ${chanSender.name} to ${data.channel}`);
          break;

        case 'typing':
          // Send typing state to the target user
          const typingSender = clients.get(ws);
          if (!typingSender) break;

          for (const [clientSocket, info] of clients.entries()) {
            if (info.id === data.to && clientSocket.readyState === clientSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: 'typing_state',
                sender: typingSender.id,
                isTyping: data.isTyping
              }));
              break;
            }
          }
          break;

        case 'handshake':
          const handSender = clients.get(ws);
          if (!handSender) break;

          for (const [clientSocket, info] of clients.entries()) {
            if (info.id === data.to && clientSocket.readyState === clientSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: 'handshake',
                user: {
                  id: handSender.id,
                  name: handSender.name,
                  avatarUrl: handSender.avatarUrl
                }
              }));
              break;
            }
          }
          console.log(`Handshake routed from ${handSender.name} to ${data.to}`);
          break;

        case 'call_invite':
          const inviteSender = clients.get(ws);
          if (!inviteSender) break;
          for (const [clientSocket, info] of clients.entries()) {
            if (info.id === data.to && clientSocket.readyState === clientSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: 'call_invite',
                from: inviteSender.id,
                name: inviteSender.name,
                avatarUrl: inviteSender.avatarUrl,
                callType: data.callType,
                offer: data.offer
              }));
              break;
            }
          }
          console.log(`Call invite from ${inviteSender.name} to ${data.to} (${data.callType})`);
          break;

        case 'call_accept':
          const acceptSender = clients.get(ws);
          if (!acceptSender) break;
          for (const [clientSocket, info] of clients.entries()) {
            if (info.id === data.to && clientSocket.readyState === clientSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: 'call_accept',
                from: acceptSender.id,
                answer: data.answer
              }));
              break;
            }
          }
          console.log(`Call accepted by ${acceptSender.name} for ${data.to}`);
          break;

        case 'call_decline':
          const declineSender = clients.get(ws);
          if (!declineSender) break;
          for (const [clientSocket, info] of clients.entries()) {
            if (info.id === data.to && clientSocket.readyState === clientSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: 'call_decline',
                from: declineSender.id
              }));
              break;
            }
          }
          console.log(`Call declined by ${declineSender.name} for ${data.to}`);
          break;

        case 'call_end':
          const endSender = clients.get(ws);
          if (!endSender) break;
          for (const [clientSocket, info] of clients.entries()) {
            if (info.id === data.to && clientSocket.readyState === clientSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: 'call_end',
                from: endSender.id
              }));
              break;
            }
          }
          console.log(`Call ended by ${endSender.name} with ${data.to}`);
          break;

        case 'call_ice_candidate':
          const iceSender = clients.get(ws);
          if (!iceSender) break;
          for (const [clientSocket, info] of clients.entries()) {
            if (info.id === data.to && clientSocket.readyState === clientSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: 'call_ice_candidate',
                from: iceSender.id,
                candidate: data.candidate
              }));
              break;
            }
          }
          break;

        default:
          console.warn('Unknown message type received:', data.type);
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if (info) {
      console.log(`Connection closed for user: ${info.name}`);
      clients.delete(ws);
      broadcastRoster();
    } else {
      console.log('Unregistered connection closed.');
    }
  });
});

server.listen(PORT, () => {
  console.log(`ChatMe Real-Time backend listening on ws://localhost:${PORT}`);
});
