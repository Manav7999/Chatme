import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'chatme_dev_secret_key_2024';
const DB_PATH = path.join(__dirname, 'database.json');

// --- File-based database helpers ---
const readDB = () => {
  try {
    if (!existsSync(DB_PATH)) return { users: [], messages: [] };
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
  } catch { return { users: [], messages: [] }; }
};
const writeDB = (data) => {
  try { writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); } catch (e) { console.error('DB write error:', e); }
};

const app = express();
const server = createServer(app);
app.use(express.json({ limit: '10mb' }));

// Serve static assets from Vite's dist folder
app.use(express.static(path.join(__dirname, 'dist')));


// API: list available channels with live member counts
app.get('/api/channels', (req, res) => {
  const list = [];
  channels.forEach((ch, id) => {
    list.push({ id, name: ch.name, description: ch.description, memberCount: ch.subscribers.size });
  });
  res.json(list);
});

// AUTH: Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, avatarUrl } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const db = readDB();
    const exists = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) return res.status(409).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const userAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

    const newUser = { id: userId, username, password: hashedPassword, avatarUrl: userAvatar, createdAt: new Date().toISOString() };
    db.users.push(newUser);
    writeDB(db);

    const token = jwt.sign({ id: userId, username, avatarUrl: userAvatar }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, name: username, avatarUrl: userAvatar } });
    console.log(`New user registered: ${username} (${userId})`);
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// AUTH: Login existing user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const db = readDB();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ id: user.id, username: user.username, avatarUrl: user.avatarUrl }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.username, avatarUrl: user.avatarUrl } });
    console.log(`User logged in: ${user.username}`);
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// AUTH: Verify token (for auto-login on app load)
app.get('/api/auth/verify', (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: { id: decoded.id, name: decoded.username, avatarUrl: decoded.avatarUrl } });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});


// API: get DM history between two users
app.get('/api/messages/:userId/:peerId', (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(auth.slice(7), JWT_SECRET); // validate token
    const { userId, peerId } = req.params;
    const db = readDB();
    const history = (db.messages || []).filter(m =>
      (m.sender === userId && m.recipient === peerId) ||
      (m.sender === peerId && m.recipient === userId)
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(history);
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// API: delete all DM history between two users
app.delete('/api/messages/:userId/:peerId', (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(auth.slice(7), JWT_SECRET); // validate token
    const { userId, peerId } = req.params;
    const db = readDB();
    db.messages = (db.messages || []).filter(m =>
      !((m.sender === userId && m.recipient === peerId) ||
        (m.sender === peerId && m.recipient === userId))
    );
    writeDB(db);
    res.json({ success: true });
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Fallback all routes to index.html for React Router compatibility
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 5001;

// Active connections map: socket -> clientInfo
const clients = new Map();

// Channels map: channelId -> Set of sockets subscribed
const DEFAULT_CHANNELS = [
  { id: 'general', name: '#general', description: 'Company-wide announcements and updates' },
  { id: 'design', name: '#design', description: 'UI/UX branding and high-contrast design' },
  { id: 'engineering', name: '#engineering', description: 'Vite, React, WebRTC and code discussions' },
  { id: 'random', name: '#random', description: 'Off-topic fun and casual conversation' }
];
const channels = new Map();
DEFAULT_CHANNELS.forEach(ch => channels.set(ch.id, { ...ch, subscribers: new Set() }));

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
    isOnline: true,
    publicKey: info.publicKey || null   // Include E2EE public key
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
            avatarUrl: data.user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.name}`,
            publicKey: data.user.publicKey || null   // E2EE public key
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
            waveform: data.waveform,
            encrypted: !!data.encrypted,
            iv: data.iv || null,
            ciphertext: data.ciphertext || null
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

          // Persist message to database
          try {
            const db = readDB();
            if (!db.messages) db.messages = [];
            db.messages.push({
              id: msgPayload.id,
              sender: senderInfo.id,
              recipient: data.to,
              text: data.text,
              time: msgPayload.time,
              msgType: data.msgType || 'text',
              mediaUrl: data.mediaUrl || null,
              size: data.size || null,
              createdAt: new Date().toISOString(),
              encrypted: !!data.encrypted,
              iv: data.iv || null,
              ciphertext: data.ciphertext || null
            });
            // Keep last 2000 messages to avoid unbounded growth
            if (db.messages.length > 2000) db.messages = db.messages.slice(-2000);
            writeDB(db);
          } catch (e) { console.error('Message persist error:', e); }

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

        case 'channel_message': {
          // Send message to all subscribers of a channel
          const chanSender = clients.get(ws);
          if (!chanSender) break;
          const channel = channels.get(data.channel);
          if (!channel) break;

          const chanPayload = JSON.stringify({
            type: 'channel_message',
            id: `servermsg_${Date.now()}`,
            channel: data.channel,
            channelName: channel.name,
            sender: chanSender.id,
            senderName: chanSender.name,
            senderAvatar: chanSender.avatarUrl,
            text: data.text,
            time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            msgType: data.msgType || 'text',
            mediaUrl: data.mediaUrl || null,
            size: data.size || null
          });
          channel.subscribers.forEach(subSocket => {
            if (subSocket.readyState === subSocket.OPEN) subSocket.send(chanPayload);
          });
          console.log(`Channel [${channel.name}] message from ${chanSender.name}`);
          break;
        }

        case 'join_channel': {
          const joiner = clients.get(ws);
          if (!joiner) break;
          const joinCh = channels.get(data.channel);
          if (!joinCh) break;
          joinCh.subscribers.add(ws);
          // Confirm join to the joining client
          ws.send(JSON.stringify({
            type: 'channel_joined',
            channel: data.channel,
            channelName: joinCh.name,
            memberCount: joinCh.subscribers.size
          }));
          // Broadcast updated member count to all subscribers
          const rosterPayload = JSON.stringify({
            type: 'channel_roster',
            channel: data.channel,
            memberCount: joinCh.subscribers.size
          });
          joinCh.subscribers.forEach(s => { if (s.readyState === s.OPEN) s.send(rosterPayload); });
          console.log(`${joiner.name} joined channel ${joinCh.name} (${joinCh.subscribers.size} members)`);
          break;
        }

        case 'leave_channel': {
          const leaver = clients.get(ws);
          if (!leaver) break;
          const leaveCh = channels.get(data.channel);
          if (!leaveCh) break;
          leaveCh.subscribers.delete(ws);
          ws.send(JSON.stringify({ type: 'channel_left', channel: data.channel }));
          const leaveRosterPayload = JSON.stringify({
            type: 'channel_roster',
            channel: data.channel,
            memberCount: leaveCh.subscribers.size
          });
          leaveCh.subscribers.forEach(s => { if (s.readyState === s.OPEN) s.send(leaveRosterPayload); });
          console.log(`${leaver.name} left channel ${leaveCh.name}`);
          break;
        }

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

        case 'delete_message': {
          const deleteSender = clients.get(ws);
          if (!deleteSender) break;
          try {
            const db = readDB();
            db.messages = (db.messages || []).filter(m => m.id !== data.messageId);
            writeDB(db);
          } catch (e) {
            console.error('Message delete error:', e);
          }

          if (data.peerId) {
            for (const [clientSocket, info] of clients.entries()) {
              if (info.id === data.peerId && clientSocket.readyState === clientSocket.OPEN) {
                clientSocket.send(JSON.stringify({
                  type: 'message_deleted',
                  messageId: data.messageId,
                  senderId: deleteSender.id
                }));
                break;
              }
            }
          }
          break;
        }

        case 'delete_channel_message': {
          const chanDeleteSender = clients.get(ws);
          if (!chanDeleteSender) break;
          const channel = channels.get(data.channelId);
          if (!channel) break;

          const deletePayload = JSON.stringify({
            type: 'channel_message_deleted',
            messageId: data.messageId,
            channelId: data.channelId
          });

          channel.subscribers.forEach(subSocket => {
            if (subSocket.readyState === subSocket.OPEN) {
              subSocket.send(deletePayload);
            }
          });
          break;
        }

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
      // Remove from all channel subscriptions
      channels.forEach(ch => ch.subscribers.delete(ws));
      broadcastRoster();

    } else {
      console.log('Unregistered connection closed.');
    }
  });
});

server.listen(PORT, () => {
  console.log(`ChatMe Real-Time backend listening on ws://localhost:${PORT}`);
});
