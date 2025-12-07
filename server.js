const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const app = express();

// ==================== CONFIGURATION ====================
const CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 16 * 1024 * 1024, // 16MB
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 30,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  MAX_MESSAGE_LENGTH: 4096,
  MAX_MESSAGES_PER_FETCH: 100,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};

// ==================== MIDDLEWARE ====================
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for our frontend
}));
app.use(cors({ origin: CONFIG.CORS_ORIGIN }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ==================== RATE LIMITING ====================
const apiLimiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW,
  max: CONFIG.RATE_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW,
  max: 10, // Stricter for sensitive operations
  message: { error: 'Too many requests, please try again later.' }
});

// Apply to all /api routes
app.use('/api/', apiLimiter);

// ==================== FILE UPLOAD CONFIGURATION ====================
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: CONFIG.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats'];
    if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: images, videos, audio, PDF, documents'));
    }
  }
});

// ==================== STATE MANAGEMENT ====================
let client;
let qrCodeData = null;
let isReady = false;
let clientInfo = null;
let isInitializing = false;

// Connection pool for SSE
const connectedClients = new Set();

// Statistics
const stats = {
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0,
  startTime: Date.now()
};

// ==================== SSE HEARTBEAT ====================
setInterval(() => {
  const deadClients = new Set();
  connectedClients.forEach(client => {
    try {
      client.write(': heartbeat\n\n');
    } catch (error) {
      deadClients.add(client);
    }
  });
  deadClients.forEach(client => connectedClients.delete(client));
}, CONFIG.HEARTBEAT_INTERVAL);

// ==================== BROADCAST FUNCTION ====================
function broadcastToClients(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const deadClients = new Set();
  
  connectedClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      console.error('Error broadcasting to client:', error.message);
      deadClients.add(client);
    }
  });
  
  deadClients.forEach(client => connectedClients.delete(client));
}

// ==================== WHATSAPP CLIENT INITIALIZATION ====================
function initializeClient() {
  if (isInitializing) {
    console.log('⏳ Client initialization already in progress...');
    return;
  }

  isInitializing = true;

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    }
  });

  // QR Code Event
  client.on('qr', async (qr) => {
    console.log('📱 QR Code received - scan with your phone');
    try {
      qrCodeData = await qrcode.toDataURL(qr);
      isReady = false;
      broadcastToClients({ type: 'qr', data: qrCodeData });
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
      stats.errors++;
    }
  });

  // Authenticated Event
  client.on('authenticated', () => {
    console.log('✅ Client authenticated');
    qrCodeData = null;
  });

  // Ready Event
  client.on('ready', async () => {
    console.log('🚀 Client is ready!');
    isReady = true;
    isInitializing = false;
    qrCodeData = null;
    
    try {
      const info = client.info;
      clientInfo = {
        pushname: info.pushname,
        wid: info.wid.user,
        platform: info.platform
      };
      
      broadcastToClients({ type: 'ready', data: clientInfo });
    } catch (error) {
      console.error('❌ Error getting client info:', error);
    }
  });

  // Disconnected Event
  client.on('disconnected', (reason) => {
    console.log('❌ Client disconnected:', reason);
    isReady = false;
    isInitializing = false;
    qrCodeData = null;
    clientInfo = null;
    broadcastToClients({ type: 'disconnected', data: { reason } });
  });

  // Incoming Message Event
  client.on('message', async (message) => {
    stats.messagesReceived++;
    
    try {
      const chat = await message.getChat();
      let contactName = 'Unknown';
      
      try {
        const contact = await message.getContact();
        contactName = contact.pushname || contact.number || 'Unknown';
      } catch (e) {
        contactName = chat.name || chat.id.user || 'Unknown';
      }
      
      broadcastToClients({
        type: 'new_message',
        data: {
          chatId: chat.id._serialized,
          message: {
            id: message.id._serialized,
            body: message.body,
            timestamp: message.timestamp,
            fromMe: message.fromMe,
            hasMedia: message.hasMedia,
            type: message.type,
            ack: message.ack
          },
          chat: {
            id: chat.id._serialized,
            name: chat.name || contactName,
            isGroup: chat.isGroup,
            unreadCount: chat.unreadCount
          }
        }
      });
    } catch (error) {
      console.error('❌ Error handling message:', error.message);
      stats.errors++;
    }
  });

  // Message Acknowledgement Event
  client.on('message_ack', (message, ack) => {
    broadcastToClients({
      type: 'message_ack',
      data: {
        messageId: message.id._serialized,
        ack: ack
      }
    });
  });

  // Authentication Failure Event
  client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failure:', msg);
    isReady = false;
    isInitializing = false;
    stats.errors++;
    broadcastToClients({ type: 'auth_failure', data: { message: msg } });
  });

  // Initialize client
  client.initialize().catch(error => {
    console.error('❌ Failed to initialize client:', error);
    isInitializing = false;
    stats.errors++;
  });
}

// ==================== MIDDLEWARE ====================
const requireReady = (req, res, next) => {
  if (!isReady) {
    return res.status(503).json({ 
      error: 'WhatsApp client not ready',
      message: 'Please wait for QR code scan or client initialization'
    });
  }
  next();
};

const validatePhoneNumber = (req, res, next) => {
  const { number } = req.body;
  if (!number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  
  const cleanNumber = number.replace(/[^0-9]/g, '');
  if (cleanNumber.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }
  
  req.cleanNumber = cleanNumber;
  next();
};

const validateMessage = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Valid message text is required' });
  }
  
  if (message.length > CONFIG.MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ 
      error: `Message too long (max ${CONFIG.MAX_MESSAGE_LENGTH} characters)` 
    });
  }
  
  next();
};

// ==================== API ROUTES ====================

// Health Check
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    environment: CONFIG.NODE_ENV,
    whatsapp: {
      isReady,
      isInitializing,
      hasQR: !!qrCodeData,
      connections: connectedClients.size
    },
    stats: {
      ...stats,
      uptime: Date.now() - stats.startTime
    },
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
    }
  });
});

// Server-Sent Events
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  connectedClients.add(res);
  
  // Send initial state
  if (qrCodeData) {
    res.write(`data: ${JSON.stringify({ type: 'qr', data: qrCodeData })}\n\n`);
  } else if (isReady) {
    res.write(`data: ${JSON.stringify({ type: 'ready', data: clientInfo })}\n\n`);
  } else if (isInitializing) {
    res.write(`data: ${JSON.stringify({ type: 'initializing' })}\n\n`);
  }
  
  req.on('close', () => {
    connectedClients.delete(res);
  });
});

// Get Status
app.get('/api/status', (req, res) => {
  res.json({
    isReady,
    isInitializing,
    hasQR: !!qrCodeData,
    clientInfo: isReady ? clientInfo : null,
    timestamp: new Date().toISOString()
  });
});

// Get QR Code
app.get('/api/qr', (req, res) => {
  if (qrCodeData) {
    res.json({ 
      qr: qrCodeData, 
      status: 'qr_ready' 
    });
  } else if (isReady) {
    res.json({ 
      status: 'authenticated', 
      clientInfo 
    });
  } else if (isInitializing) {
    res.json({ 
      status: 'initializing' 
    });
  } else {
    res.json({ 
      status: 'disconnected' 
    });
  }
});

// Get All Chats
app.get('/api/chats', requireReady, async (req, res) => {
  try {
    const chats = await client.getChats();
    
    const chatPromises = chats.map(async (chat) => {
      try {
        let contactName = 'Unknown';
        let profilePicUrl = null;
        
        try {
          const contact = await chat.getContact();
          contactName = contact.pushname || contact.number || contact.name || 'Unknown';
        } catch (contactError) {
          contactName = chat.name || chat.id.user || 'Unknown';
        }
        
        try {
          profilePicUrl = await chat.getProfilePicUrl();
        } catch (e) {
          // Profile pic not available
        }
        
        return {
          id: chat.id._serialized,
          name: chat.name || contactName,
          lastMessage: chat.lastMessage ? {
            body: chat.lastMessage.body,
            timestamp: chat.lastMessage.timestamp,
            fromMe: chat.lastMessage.fromMe
          } : null,
          timestamp: chat.timestamp || Date.now(),
          unreadCount: chat.unreadCount || 0,
          isGroup: chat.isGroup,
          isMuted: chat.isMuted,
          archived: chat.archived,
          pinned: chat.pinned,
          profilePicUrl
        };
      } catch (error) {
        console.error('Error processing chat:', error.message);
        return {
          id: chat.id._serialized,
          name: chat.name || chat.id.user || 'Unknown',
          lastMessage: chat.lastMessage ? {
            body: chat.lastMessage.body,
            timestamp: chat.lastMessage.timestamp,
            fromMe: chat.lastMessage.fromMe
          } : null,
          timestamp: chat.timestamp || Date.now(),
          unreadCount: chat.unreadCount || 0,
          isGroup: chat.isGroup,
          isMuted: false,
          archived: false,
          pinned: false,
          profilePicUrl: null
        };
      }
    });
    
    const results = await Promise.allSettled(chatPromises);
    const chatList = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`✅ Loaded ${chatList.length} chats successfully`);
    res.json(chatList);
  } catch (error) {
    console.error('❌ Error fetching chats:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get Chat by ID
app.get('/api/chat/:chatId', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    
    let contactName = 'Unknown';
    let profilePicUrl = null;
    
    try {
      const contact = await chat.getContact();
      contactName = contact.pushname || contact.number || 'Unknown';
    } catch (e) {
      contactName = chat.name || chat.id.user || 'Unknown';
    }
    
    try {
      profilePicUrl = await chat.getProfilePicUrl();
    } catch (e) {
      // Profile pic not available
    }
    
    res.json({
      id: chat.id._serialized,
      name: chat.name || contactName,
      isGroup: chat.isGroup,
      unreadCount: chat.unreadCount,
      timestamp: chat.timestamp,
      archived: chat.archived,
      pinned: chat.pinned,
      profilePicUrl,
      participants: chat.isGroup ? chat.participants : null
    });
  } catch (error) {
    console.error('❌ Error fetching chat:', error);
    stats.errors++;
    res.status(404).json({ error: 'Chat not found' });
  }
});

// Get Messages from Chat
app.get('/api/messages/:chatId', requireReady, async (req, res) => {
  try {
    const limit = Math.min(
      parseInt(req.query.limit) || 50, 
      CONFIG.MAX_MESSAGES_PER_FETCH
    );
    
    const chat = await client.getChatById(req.params.chatId);
    const messages = await chat.fetchMessages({ limit });
    
    const messageList = messages.map((msg) => ({
      id: msg.id._serialized,
      body: msg.body,
      timestamp: msg.timestamp,
      fromMe: msg.fromMe,
      hasMedia: msg.hasMedia,
      type: msg.type,
      ack: msg.ack,
      author: msg.author,
      isForwarded: msg.isForwarded,
      hasQuotedMsg: msg.hasQuotedMsg,
      from: msg.from,
      to: msg.to
    }));
    
    res.json(messageList);
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send Text Message
app.post('/api/send', strictLimiter, requireReady, validatePhoneNumber, validateMessage, async (req, res) => {
  try {
    const chatId = `${req.cleanNumber}@c.us`;
    const { message } = req.body;
    
    console.log(`📤 Sending message to: ${chatId}`);
    
    const numberId = await client.getNumberId(chatId);
    if (!numberId) {
      return res.status(404).json({ error: 'Number not found on WhatsApp' });
    }
    
    const sentMessage = await client.sendMessage(numberId._serialized, message);
    stats.messagesSent++;
    
    console.log(`✅ Message sent successfully (ID: ${sentMessage.id._serialized})`);
    
    res.json({
      success: true,
      messageId: sentMessage.id._serialized,
      timestamp: sentMessage.timestamp,
      to: numberId._serialized
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

// Send Media
app.post('/api/send-media', strictLimiter, requireReady, upload.single('file'), validatePhoneNumber, async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'File is required' });
  }

  try {
    const chatId = `${req.cleanNumber}@c.us`;
    const { caption } = req.body;
    
    const numberId = await client.getNumberId(chatId);
    if (!numberId) {
      await fs.unlink(file.path);
      return res.status(404).json({ error: 'Number not found on WhatsApp' });
    }
    
    const media = MessageMedia.fromFilePath(file.path);
    const sentMessage = await client.sendMessage(numberId._serialized, media, {
      caption: caption || ''
    });
    
    stats.messagesSent++;
    await fs.unlink(file.path);
    
    console.log(`✅ Media sent successfully (ID: ${sentMessage.id._serialized})`);
    
    res.json({
      success: true,
      messageId: sentMessage.id._serialized,
      timestamp: sentMessage.timestamp,
      to: numberId._serialized
    });
  } catch (error) {
    if (file) {
      await fs.unlink(file.path).catch(() => {});
    }
    console.error('❌ Error sending media:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to send media', details: error.message });
  }
});

// Get Contact Info
app.get('/api/contact/:number', requireReady, async (req, res) => {
  try {
    const contactId = req.params.number.includes('@c.us')
      ? req.params.number
      : `${req.params.number}@c.us`;
    
    const contact = await client.getContactById(contactId);
    let profilePicUrl = null;
    
    try {
      profilePicUrl = await contact.getProfilePicUrl();
    } catch (e) {
      // Profile pic not available
    }
    
    res.json({
      id: contact.id._serialized,
      name: contact.name || contact.pushname,
      number: contact.number,
      isMyContact: contact.isMyContact || false,
      isBlocked: contact.isBlocked,
      profilePicUrl
    });
  } catch (error) {
    console.error('❌ Error fetching contact:', error);
    stats.errors++;
    res.status(404).json({ error: 'Contact not found' });
  }
});

// Get All Contacts
app.get('/api/contacts', requireReady, async (req, res) => {
  try {
    const contacts = await client.getContacts();
    const contactList = contacts
      .filter(c => c.isMyContact || req.query.all === 'true')
      .map(c => ({
        id: c.id._serialized,
        name: c.name || c.pushname,
        number: c.number,
        isBlocked: c.isBlocked,
        isMyContact: c.isMyContact || false
      }));
    
    res.json(contactList);
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Check if Number is on WhatsApp
app.post('/api/check-number', requireReady, validatePhoneNumber, async (req, res) => {
  try {
    const chatId = `${req.cleanNumber}@c.us`;
    const numberId = await client.getNumberId(chatId);
    
    res.json({
      exists: !!numberId,
      number: req.cleanNumber,
      id: numberId ? numberId._serialized : null
    });
  } catch (error) {
    console.error('❌ Error checking number:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to check number' });
  }
});

// Mark Chat as Read
app.post('/api/chat/:chatId/read', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    await chat.sendSeen();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error marking as read:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Archive Chat
app.post('/api/chat/:chatId/archive', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    await chat.archive();
    res.json({ success: true, archived: true });
  } catch (error) {
    console.error('❌ Error archiving chat:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to archive chat' });
  }
});

// Unarchive Chat
app.post('/api/chat/:chatId/unarchive', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    await chat.unarchive();
    res.json({ success: true, archived: false });
  } catch (error) {
    console.error('❌ Error unarchiving chat:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to unarchive chat' });
  }
});

// Delete Chat
app.delete('/api/chat/:chatId', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    await chat.delete();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting chat:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Pin Chat
app.post('/api/chat/:chatId/pin', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    await chat.pin();
    res.json({ success: true, pinned: true });
  } catch (error) {
    console.error('❌ Error pinning chat:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to pin chat' });
  }
});

// Unpin Chat
app.post('/api/chat/:chatId/unpin', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    await chat.unpin();
    res.json({ success: true, pinned: false });
  } catch (error) {
    console.error('❌ Error unpinning chat:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to unpin chat' });
  }
});

// Mute Chat
app.post('/api/chat/:chatId/mute', requireReady, async (req, res) => {
  try {
    const { duration } = req.body; // Duration in seconds, null for forever
    const chat = await client.getChatById(req.params.chatId);
    
    if (duration) {
      const unmuteDate = new Date();
      unmuteDate.setSeconds(unmuteDate.getSeconds() + duration);
      await chat.mute(unmuteDate);
    } else {
      await chat.mute();
    }
    
    res.json({ success: true, muted: true });
  } catch (error) {
    console.error('❌ Error muting chat:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to mute chat' });
  }
});

// Unmute Chat
app.post('/api/chat/:chatId/unmute', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    await chat.unmute();
    res.json({ success: true, muted: false });
  } catch (error) {
    console.error('❌ Error unmuting chat:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to unmute chat' });
  }
});

// Send Typing Indicator
app.post('/api/chat/:chatId/typing', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    await chat.sendStateTyping();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error sending typing:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to send typing indicator' });
  }
});

// Stop Typing Indicator
app.post('/api/chat/:chatId/stop-typing', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    await chat.clearState();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error stopping typing:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to stop typing' });
  }
});

// Search Messages
app.get('/api/search', requireReady, async (req, res) => {
  const { query, chatId, limit = 20 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const searchResults = await client.searchMessages(query, {
      chatId,
      limit: parseInt(limit)
    });

    const results = searchResults.map(msg => ({
      id: msg.id._serialized,
      body: msg.body,
      timestamp: msg.timestamp,
      chatId: msg.id.remote,
      fromMe: msg.fromMe
    }));

    res.json(results);
  } catch (error) {
    console.error('❌ Error searching messages:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// Get Group Info
app.get('/api/group/:groupId', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.groupId);
    
    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Not a group chat' });
    }

    const participants = chat.participants.map(p => ({
      id: p.id._serialized,
      isAdmin: p.isAdmin,
      isSuperAdmin: p.isSuperAdmin
    }));

    res.json({
      id: chat.id._serialized,
      name: chat.name,
      description: chat.description || '',
      participants,
      owner: chat.owner ? chat.owner._serialized : null,
      createdAt: chat.createdAt
    });
  } catch (error) {
    console.error('❌ Error fetching group:', error);
    stats.errors++;
    res.status(404).json({ error: 'Group not found' });
  }
});

// Create Group
app.post('/api/group/create', strictLimiter, requireReady, async (req, res) => {
  const { name, participants } = req.body;

  if (!name || !participants || !Array.isArray(participants)) {
    return res.status(400).json({ 
      error: 'Name and participants array required' 
    });
  }

  if (participants.length === 0) {
    return res.status(400).json({ 
      error: 'At least one participant required' 
    });
  }

  try {
    const group = await client.createGroup(name, participants);
    res.json({
      success: true,
      groupId: group.gid._serialized
    });
  } catch (error) {
    console.error('❌ Error creating group:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Add Participant to Group
app.post('/api/group/:groupId/add', requireReady, async (req, res) => {
  const { participants } = req.body;

  if (!participants || !Array.isArray(participants)) {
    return res.status(400).json({ error: 'Participants array required' });
  }

  try {
    const chat = await client.getChatById(req.params.groupId);
    
    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Not a group chat' });
    }

    await chat.addParticipants(participants);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error adding participants:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to add participants' });
  }
});

// Remove Participant from Group
app.post('/api/group/:groupId/remove', requireReady, async (req, res) => {
  const { participants } = req.body;

  if (!participants || !Array.isArray(participants)) {
    return res.status(400).json({ error: 'Participants array required' });
  }

  try {
    const chat = await client.getChatById(req.params.groupId);
    
    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Not a group chat' });
    }

    await chat.removeParticipants(participants);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error removing participants:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to remove participants' });
  }
});

// Leave Group
app.post('/api/group/:groupId/leave', requireReady, async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.groupId);
    
    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Not a group chat' });
    }

    await chat.leave();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error leaving group:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Get Statistics
app.get('/api/stats', (req, res) => {
  res.json({
    ...stats,
    uptime: Date.now() - stats.startTime,
    activeConnections: connectedClients.size,
    isReady,
    timestamp: new Date().toISOString()
  });
});

// Logout
app.post('/api/logout', strictLimiter, requireReady, async (req, res) => {
  try {
    await client.logout();
    isReady = false;
    qrCodeData = null;
    clientInfo = null;
    console.log('✅ Client logged out successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error logging out:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Restart Client
app.post('/api/restart', strictLimiter, async (req, res) => {
  try {
    if (client) {
      await client.destroy();
    }
    isReady = false;
    isInitializing = false;
    qrCodeData = null;
    clientInfo = null;
    
    setTimeout(() => {
      initializeClient();
    }, 1000);
    
    res.json({ success: true, message: 'Client restarting...' });
  } catch (error) {
    console.error('❌ Error restarting client:', error);
    stats.errors++;
    res.status(500).json({ error: 'Failed to restart client' });
  }
});

// Serve Frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  stats.errors++;
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: `File too large (max ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)` 
      });
    }
    return res.status(400).json({ error: error.message });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: CONFIG.NODE_ENV === 'development' ? error.message : undefined
  });
});

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Close SSE connections
  connectedClients.forEach(client => {
    try {
      client.end();
    } catch (e) {}
  });
  connectedClients.clear();
  
  // Destroy WhatsApp client
  if (client) {
    try {
      await client.destroy();
      console.log('✅ WhatsApp client destroyed');
    } catch (error) {
      console.error('❌ Error destroying client:', error);
    }
  }
  
  // Clean up upload directory
  try {
    const files = await fs.readdir('uploads');
    for (const file of files) {
      await fs.unlink(path.join('uploads', file));
    }
    console.log('✅ Cleaned up upload directory');
  } catch (error) {
    // Directory might not exist
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==================== START SERVER ====================
const server = app.listen(CONFIG.PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 WhatsApp Web Server');
  console.log('='.repeat(50));
  console.log(`📡 Server running on: http://localhost:${CONFIG.PORT}`);
  console.log(`🌍 Environment: ${CONFIG.NODE_ENV}`);
  console.log(`📱 Open your browser to connect`);
  console.log('='.repeat(50));
  
  initializeClient();
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${CONFIG.PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

module.exports = app; // Export for testing