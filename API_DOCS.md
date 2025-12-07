# WhatsApp Web API - Complete Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Test Cases](#test-cases)
8. [Deployment Guide](#deployment-guide)

---

## Overview

Production-ready WhatsApp Web API built with Node.js, Express, and whatsapp-web.js.

### Features
- ✅ Real-time messaging via Server-Sent Events
- ✅ Rate limiting and security headers
- ✅ File upload support (images, videos, audio, documents)
- ✅ Group management
- ✅ Chat operations (archive, pin, mute, delete)
- ✅ Contact management
- ✅ Health monitoring
- ✅ Graceful shutdown
- ✅ Comprehensive error handling

### Tech Stack
- Node.js 18+
- Express.js
- whatsapp-web.js
- Helmet (Security)
- Express Rate Limit
- Multer (File uploads)
- Compression
- CORS

---

## Configuration

### Environment Variables

Create a `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Security
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=30

# File Upload
MAX_FILE_SIZE=16777216
```

### Required Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "whatsapp-web.js": "^1.23.0",
    "qrcode": "^1.5.3",
    "multer": "^1.4.5-lts.1",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "dotenv": "^16.3.1"
  }
}
```

### Installation

```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode
npm run dev
```

---

## Authentication

The API uses WhatsApp Web's QR code authentication.

### Authentication Flow

1. **Start Server** → Client initializes
2. **Generate QR** → Scan with WhatsApp mobile app
3. **Authenticate** → Session persists in `./wwebjs_auth`
4. **Ready** → API endpoints become available

### Check Authentication Status

```bash
curl http://localhost:3000/api/status
```

**Response:**
```json
{
  "isReady": true,
  "isInitializing": false,
  "hasQR": false,
  "clientInfo": {
    "pushname": "Your Name",
    "wid": "1234567890",
    "platform": "android"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## API Endpoints

### System Endpoints

#### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "whatsapp": {
    "isReady": true,
    "isInitializing": false,
    "hasQR": false,
    "connections": 5
  },
  "stats": {
    "messagesSent": 150,
    "messagesReceived": 230,
    "errors": 2,
    "uptime": 3600000
  },
  "memory": {
    "heapUsed": "85 MB",
    "heapTotal": "120 MB",
    "rss": "150 MB"
  }
}
```

#### 2. Server-Sent Events
```http
GET /api/events
```

**Event Types:**
- `qr` - QR code for scanning
- `ready` - Client authenticated
- `initializing` - Client starting
- `new_message` - Incoming message
- `message_ack` - Message status update
- `disconnected` - Client disconnected
- `auth_failure` - Authentication failed

**JavaScript Example:**
```javascript
const eventSource = new EventSource('/api/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type);
};
```

#### 3. Get Status
```http
GET /api/status
```

#### 4. Get QR Code
```http
GET /api/qr
```

**Response:**
```json
{
  "qr": "data:image/png;base64,...",
  "status": "qr_ready"
}
```

#### 5. Get Statistics
```http
GET /api/stats
```

---

### Chat Endpoints

#### 1. Get All Chats
```http
GET /api/chats
```

**Response:**
```json
[
  {
    "id": "1234567890@c.us",
    "name": "John Doe",
    "lastMessage": {
      "body": "Hello!",
      "timestamp": 1705315800,
      "fromMe": false
    },
    "timestamp": 1705315800,
    "unreadCount": 3,
    "isGroup": false,
    "isMuted": false,
    "archived": false,
    "pinned": true,
    "profilePicUrl": "https://..."
  }
]
```

#### 2. Get Chat by ID
```http
GET /api/chat/:chatId
```

**Example:**
```bash
curl http://localhost:3000/api/chat/1234567890@c.us
```

#### 3. Get Messages from Chat
```http
GET /api/messages/:chatId?limit=50
```

**Parameters:**
- `limit` (optional) - Number of messages (max 100, default 50)

**Example:**
```bash
curl "http://localhost:3000/api/messages/1234567890@c.us?limit=20"
```

**Response:**
```json
[
  {
    "id": "msg_id_123",
    "body": "Hello, how are you?",
    "timestamp": 1705315800,
    "fromMe": true,
    "hasMedia": false,
    "type": "chat",
    "ack": 2,
    "author": "1234567890@c.us",
    "isForwarded": false,
    "hasQuotedMsg": false,
    "from": "1234567890@c.us",
    "to": "9876543210@c.us"
  }
]
```

#### 4. Mark Chat as Read
```http
POST /api/chat/:chatId/read
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/chat/1234567890@c.us/read
```

#### 5. Archive Chat
```http
POST /api/chat/:chatId/archive
```

#### 6. Unarchive Chat
```http
POST /api/chat/:chatId/unarchive
```

#### 7. Delete Chat
```http
DELETE /api/chat/:chatId
```

#### 8. Pin Chat
```http
POST /api/chat/:chatId/pin
```

#### 9. Unpin Chat
```http
POST /api/chat/:chatId/unpin
```

#### 10. Mute Chat
```http
POST /api/chat/:chatId/mute
```

**Body:**
```json
{
  "duration": 3600
}
```
- `duration` (optional) - Mute duration in seconds, `null` for forever

#### 11. Unmute Chat
```http
POST /api/chat/:chatId/unmute
```

---

### Messaging Endpoints

#### 1. Send Text Message
```http
POST /api/send
```

**Body:**
```json
{
  "number": "2348012345678",
  "message": "Hello from API!"
}
```

**Validation:**
- Number must be 10+ digits
- Message max 4096 characters
- Number must exist on WhatsApp

**Response:**
```json
{
  "success": true,
  "messageId": "msg_id_123",
  "timestamp": 1705315800,
  "to": "2348012345678@c.us"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "number": "2348012345678",
    "message": "Hello!"
  }'
```

#### 2. Send Media
```http
POST /api/send-media
```

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` - Media file (required)
- `number` - Phone number (required)
- `caption` - Caption text (optional)

**Limits:**
- Max file size: 16MB
- Supported types: images, videos, audio, PDF, documents

**Example:**
```bash
curl -X POST http://localhost:3000/api/send-media \
  -F "file=@/path/to/image.jpg" \
  -F "number=2348012345678" \
  -F "caption=Check this out!"
```

#### 3. Send Typing Indicator
```http
POST /api/chat/:chatId/typing
```

#### 4. Stop Typing Indicator
```http
POST /api/chat/:chatId/stop-typing
```

---

### Contact Endpoints

#### 1. Get Contact Info
```http
GET /api/contact/:number
```

**Example:**
```bash
curl http://localhost:3000/api/contact/2348012345678
```

**Response:**
```json
{
  "id": "2348012345678@c.us",
  "name": "John Doe",
  "number": "2348012345678",
  "isMyContact": true,
  "isBlocked": false,
  "profilePicUrl": "https://..."
}
```

#### 2. Get All Contacts
```http
GET /api/contacts?all=false
```

**Parameters:**
- `all` (optional) - Include non-saved contacts (`true`/`false`, default: `false`)

#### 3. Check if Number is on WhatsApp
```http
POST /api/check-number
```

**Body:**
```json
{
  "number": "2348012345678"
}
```

**Response:**
```json
{
  "exists": true,
  "number": "2348012345678",
  "id": "2348012345678@c.us"
}
```

---

### Group Endpoints

#### 1. Get Group Info
```http
GET /api/group/:groupId
```

**Response:**
```json
{
  "id": "120363XXXXXX@g.us",
  "name": "My Group",
  "description": "Group description",
  "participants": [
    {
      "id": "1234567890@c.us",
      "isAdmin": true,
      "isSuperAdmin": false
    }
  ],
  "owner": "1234567890@c.us",
  "createdAt": 1705315800
}
```

#### 2. Create Group
```http
POST /api/group/create
```

**Body:**
```json
{
  "name": "My New Group",
  "participants": [
    "1234567890@c.us",
    "9876543210@c.us"
  ]
}
```

#### 3. Add Participant
```http
POST /api/group/:groupId/add
```

**Body:**
```json
{
  "participants": ["1234567890@c.us"]
}
```

#### 4. Remove Participant
```http
POST /api/group/:groupId/remove
```

**Body:**
```json
{
  "participants": ["1234567890@c.us"]
}
```

#### 5. Leave Group
```http
POST /api/group/:groupId/leave
```

---

### Search Endpoints

#### 1. Search Messages
```http
GET /api/search?query=hello&chatId=1234567890@c.us&limit=20
```

**Parameters:**
- `query` (required) - Search term
- `chatId` (optional) - Limit to specific chat
- `limit` (optional) - Max results (default: 20)

---

### Session Endpoints

#### 1. Logout
```http
POST /api/logout
```

**Response:**
```json
{
  "success": true
}
```

#### 2. Restart Client
```http
POST /api/restart
```

**Response:**
```json
{
  "success": true,
  "message": "Client restarting..."
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "message": "Detailed error (development only)",
  "details": "Additional context"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input/validation failed |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | WhatsApp client not ready |

### Common Errors

#### 1. Client Not Ready
```json
{
  "error": "WhatsApp client not ready",
  "message": "Please wait for QR code scan or client initialization"
}
```

**Solution:** Check `/api/status` and wait for `isReady: true`

#### 2. Number Not Found
```json
{
  "error": "Number not found on WhatsApp"
}
```

**Solution:** Verify number format and WhatsApp registration

#### 3. Rate Limit Exceeded
```json
{
  "error": "Too many requests, please try again later."
}
```

**Solution:** Wait and retry after the rate limit window

#### 4. File Too Large
```json
{
  "error": "File too large (max 16MB)"
}
```

**Solution:** Compress or split the file

---

## Rate Limiting

### Default Limits

| Endpoint Type | Window | Max Requests |
|--------------|--------|--------------|
| All API routes | 1 minute | 30 |
| Send/Media/Group | 1 minute | 10 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1705315860
```

### Customize Limits

Edit `.env`:
```env
RATE_LIMIT_WINDOW=60000  # 1 minute in ms
RATE_LIMIT_MAX=30        # Max requests
```

---

## Test Cases

### 1. Authentication Test

```bash
# Check initial status
curl http://localhost:3000/api/status

# Expected: isReady: false, hasQR: true

# Get QR code
curl http://localhost:3000/api/qr

# After scanning
curl http://localhost:3000/api/status
# Expected: isReady: true
```

### 2. Send Message Test

```bash
# Send text message
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "number": "YOUR_TEST_NUMBER",
    "message": "Test message from API"
  }'

# Expected: {"success": true, "messageId": "...", ...}
```

### 3. Get Chats Test

```bash
curl http://localhost:3000/api/chats

# Expected: Array of chat objects
```

### 4. Get Messages Test

```bash
# Replace with actual chat ID
curl "http://localhost:3000/api/messages/1234567890@c.us?limit=10"

# Expected: Array of message objects
```

### 5. Send Media Test

```bash
curl -X POST http://localhost:3000/api/send-media \
  -F "file=@test.jpg" \
  -F "number=YOUR_TEST_NUMBER" \
  -F "caption=Test image"

# Expected: {"success": true, "messageId": "..."}
```

### 6. Group Operations Test

```bash
# Create group
curl -X POST http://localhost:3000/api/group/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "participants": ["1234567890@c.us"]
  }'

# Get group info
curl http://localhost:3000/api/group/GROUP_ID

# Leave group
curl -X POST http://localhost:3000/api/group/GROUP_ID/leave
```

### 7. Chat Management Test

```bash
CHAT_ID="1234567890@c.us"

# Archive
curl -X POST http://localhost:3000/api/chat/$CHAT_ID/archive

# Pin
curl -X POST http://localhost:3000/api/chat/$CHAT_ID/pin

# Mute for 1 hour
curl -X POST http://localhost:3000/api/chat/$CHAT_ID/mute \
  -H "Content-Type: application/json" \
  -d '{"duration": 3600}'

# Mark as read
curl -X POST http://localhost:3000/api/chat/$CHAT_ID/read
```

### 8. Contact Test

```bash
# Check if number exists
curl -X POST http://localhost:3000/api/check-number \
  -H "Content-Type: application/json" \
  -d '{"number": "2348012345678"}'

# Get contact info
curl http://localhost:3000/api/contact/2348012345678

# Get all contacts
curl http://localhost:3000/api/contacts
```

### 9. Search Test

```bash
curl "http://localhost:3000/api/search?query=hello&limit=10"
```

### 10. Health Check Test

```bash
curl http://localhost:3000/health

# Check memory usage, uptime, stats
```

### 11. Rate Limit Test

```bash
# Send 35 requests quickly (exceeds limit of 30)
for i in {1..35}; do
  curl http://localhost:3000/api/status
done

# Expected: After 30, {"error": "Too many requests..."}
```

### 12. Error Handling Test

```bash
# Invalid phone number
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{"number": "123", "message": "test"}'
# Expected: 400 Invalid phone number

# Message too long
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d "{\"number\": \"1234567890\", \"message\": \"$(printf 'a%.0s' {1..5000})\"}"
# Expected: 400 Message too long

# Non-existent chat
curl http://localhost:3000/api/chat/invalid_id
# Expected: 404 Chat not found
```

---

## Deployment Guide

### Prerequisites
- Node.js 18+ installed
- PM2 (optional, recommended)
- Nginx (optional, for reverse proxy)
- SSL certificate (for HTTPS)

### 1. Server Setup

```bash
# Clone repository
git clone your-repo-url
cd whatsapp-web-api

# Install dependencies
npm ci --only=production

# Create environment file
cp .env.example .env
nano .env

# Create directories
mkdir -p uploads public wwebjs_auth
```

### 2. PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name whatsapp-api

# Configure startup
pm2 startup
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs whatsapp-api

# Restart
pm2 restart whatsapp-api
```

### 3. Nginx Reverse Proxy

Create `/etc/nginx/sites-available/whatsapp-api`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SSE endpoint (no buffering)
    location /api/events {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Create directories
RUN mkdir -p uploads public wwebjs_auth

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  whatsapp-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./wwebjs_auth:/app/wwebjs_auth
      - ./uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Deploy:
```bash
docker-compose up -d
docker-compose logs -f
```

### 5. Security Checklist

- [ ] Use HTTPS in production
- [ ] Set strong CORS policies
- [ ] Enable rate limiting
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Implement API authentication (not included)
- [ ] Use firewall rules
- [ ] Regular backups of session data
- [ ] Implement request logging

### 6. Monitoring

#### System Monitoring
```bash
# CPU and memory
htop

# Disk usage
df -h

# Network
netstat -tulpn | grep 3000
```

#### Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# Real-time logs
pm2 logs --lines 100

# Check health
curl http://localhost:3000/health
```

#### Log Rotation
```bash
# Install logrotate
sudo apt-get install logrotate

# Create config: /etc/logrotate.d/whatsapp-api
/home/user/.pm2/logs/whatsapp-api*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 user user
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 7. Backup Strategy

```bash
# Backup session data
tar -czf whatsapp-backup-$(date +%Y%m%d).tar.gz ./wwebjs_auth

# Backup to remote
rsync -avz ./wwebjs_auth/ user@backup-server:/backups/whatsapp/

# Automated backup (crontab)
0 2 * * * cd /path/to/app && tar -czf backup-$(date +\%Y\%m\%d).tar.gz wwebjs_auth
```

### 8. Performance Optimization

```javascript
// Add to server.js

// Enable compression
app.use(compression());

// Set proper cache headers
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Connection pooling for database (if added)
// Use Redis for session storage (if scaling)
```

### 9. Troubleshooting

Common issues and solutions:

```bash
# Port in use
sudo lsof -i :3000
sudo kill -9 PID

# Session corruption
rm -rf ./wwebjs_auth
# Rescan QR code

# Memory issues
pm2 restart whatsapp-api --max-memory-restart 500M

# Permission issues
chmod -R 755 wwebjs_auth uploads
```

---

## Production Checklist

### Before Deployment
- [ ] Environment variables configured
- [ ] Rate limits set appropriately
- [ ] CORS origin specified
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Backup strategy in place
- [ ] Monitoring setup
- [ ] Log rotation configured

### After Deployment
- [ ] Health check passing
- [ ] QR code authentication working
- [ ] Send/receive messages tested
- [ ] Rate limiting verified
- [ ] Error handling tested
- [ ] Performance acceptable
- [ ] Logs being captured
- [ ] Backups running

### Ongoing Maintenance
- [ ] Monitor logs daily
- [ ] Check health endpoint
- [ ] Review error rates
- [ ] Update dependencies monthly
- [ ] Verify backups weekly
- [ ] Test disaster recovery quarterly

---

## Support

For issues, questions, or contributions:

- GitHub Issues: [your-repo/issues]
- Documentation: [your-docs-url]
- Email: [your-email]

---

## License

[Your License]

---

## Changelog

### v1.0.0 (2024-01-15)
- Initial production release
- Complete API implementation
- Full documentation
- Test suite
- Deployment guides