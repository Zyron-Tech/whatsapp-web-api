# WhatsApp Web API

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Production-ready WhatsApp Web API built with Node.js, Express, and whatsapp-web.js. Send and receive messages, manage chats, handle media, and more.

## ✨ Features

- 🚀 **Production Ready** - Built for scale with proper error handling
- 📱 **Full WhatsApp Integration** - Send/receive messages, manage chats
- 📁 **Media Support** - Images, videos, audio, documents
- 👥 **Group Management** - Create, manage, and leave groups
- 🔒 **Security First** - Rate limiting, Helmet.js, CORS configured
- 📊 **Health Monitoring** - Built-in health checks and statistics
- ⚡ **Real-time Updates** - Server-Sent Events for live notifications
- 📝 **Comprehensive API** - 30+ endpoints with full documentation
- 🧪 **Test Coverage** - Complete test suite included
- 🐳 **Docker Ready** - Dockerfile and docker-compose included

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Usage Examples](#usage-examples)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/whatsapp-web-api.git
cd whatsapp-web-api

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start the server
npm start
```

Open `http://localhost:3000` and scan the QR code with your WhatsApp mobile app.

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- WhatsApp account

### Install Dependencies

```bash
npm install
```

### Required Packages

```json
{
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
```

## ⚙️ Configuration

### Environment Variables

Create `.env` file in the root directory:

```env
# Server
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

### Default Configuration

| Setting | Default Value | Description |
|---------|---------------|-------------|
| PORT | 3000 | Server port |
| NODE_ENV | development | Environment mode |
| MAX_FILE_SIZE | 16MB | Maximum file upload size |
| RATE_LIMIT_WINDOW | 60000ms | Rate limit time window |
| RATE_LIMIT_MAX | 30 | Max requests per window |

## 📖 API Documentation

### Base URL

```
http://localhost:3000
```

### Authentication

1. Start the server
2. Open browser to `http://localhost:3000`
3. Scan QR code with WhatsApp mobile app
4. Session persists automatically

### Key Endpoints

#### Send Message
```bash
POST /api/send
Content-Type: application/json

{
  "number": "2348012345678",
  "message": "Hello from API!"
}
```

#### Get Chats
```bash
GET /api/chats
```

#### Send Media
```bash
POST /api/send-media
Content-Type: multipart/form-data

file: [file]
number: 2348012345678
caption: "Check this out!"
```

#### Get Messages
```bash
GET /api/messages/:chatId?limit=50
```

### Complete API Reference

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete endpoint list with examples.

## 💡 Usage Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Send message
const sendMessage = async () => {
  const response = await axios.post('http://localhost:3000/api/send', {
    number: '2348012345678',
    message: 'Hello from Node.js!'
  });
  console.log(response.data);
};

// Get chats
const getChats = async () => {
  const response = await axios.get('http://localhost:3000/api/chats');
  console.log(response.data);
};
```

### Python

```python
import requests

# Send message
response = requests.post('http://localhost:3000/api/send', json={
    'number': '2348012345678',
    'message': 'Hello from Python!'
})
print(response.json())

# Get chats
response = requests.get('http://localhost:3000/api/chats')
print(response.json())
```

### cURL

```bash
# Send message
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{"number":"2348012345678","message":"Hello!"}'

# Get chats
curl http://localhost:3000/api/chats

# Send media
curl -X POST http://localhost:3000/api/send-media \
  -F "file=@image.jpg" \
  -F "number=2348012345678" \
  -F "caption=Check this out!"
```

### Real-time Events (SSE)

```javascript
const eventSource = new EventSource('http://localhost:3000/api/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'qr':
      console.log('QR Code received');
      break;
    case 'ready':
      console.log('Client ready!', data.data);
      break;
    case 'new_message':
      console.log('New message:', data.data);
      break;
  }
};
```

## 🚢 Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name whatsapp-api

# Configure auto-start
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### Using Docker

```bash
# Build image
docker build -t whatsapp-api .

# Run container
docker run -d -p 3000:3000 --name whatsapp-api whatsapp-api

# Or use docker-compose
docker-compose up -d
```

### Using Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm run test:watch
```

### Test Categories

- ✅ Unit Tests - Individual function testing
- ✅ Integration Tests - API endpoint testing
- ✅ Validation Tests - Input validation
- ✅ Security Tests - Rate limiting, headers
- ✅ Performance Tests - Response time checks

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test authentication status
curl http://localhost:3000/api/status

# Test send message (requires active session)
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{"number":"YOUR_NUMBER","message":"Test"}'
```

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "whatsapp": {
    "isReady": true,
    "connections": 5
  },
  "stats": {
    "messagesSent": 150,
    "messagesReceived": 230,
    "errors": 2
  },
  "memory": {
    "heapUsed": "85 MB",
    "heapTotal": "120 MB"
  }
}
```

### Statistics

```bash
curl http://localhost:3000/api/stats
```

## 🔒 Security

### Features

- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ Rate limiting (configurable)
- ✅ Input validation and sanitization
- ✅ File type and size restrictions
- ✅ Error message sanitization

### Best Practices

1. Use HTTPS in production
2. Set specific CORS origins
3. Implement authentication (not included by default)
4. Regular security updates
5. Monitor logs for suspicious activity
6. Use environment variables for secrets

## 🛠️ Troubleshooting

### Common Issues

**1. Port already in use**
```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 <PID>
```

**2. QR code not appearing**
```bash
# Check server logs
pm2 logs whatsapp-api
# Restart client
curl -X POST http://localhost:3000/api/restart
```

**3. Session expired**
```bash
# Clear session data
rm -rf ./wwebjs_auth
# Restart server
npm start
```

**4. Messages not sending**
- Verify phone number format: `2348012345678`
- Check if number exists on WhatsApp
- Ensure client is ready: `GET /api/status`

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more solutions.

## 📚 Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Changelog](./CHANGELOG.md) - Version history

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API client
- [Express.js](https://expressjs.com/) - Web framework
- [Puppeteer](https://pptr.dev/) - Headless Chrome automation

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/whatsapp-web-api/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/whatsapp-web-api/discussions)
- **Email**: your-email@example.com

## ⭐ Star History

If you find this project useful, please consider giving it a star!

---

By [Peace Mathew](https://github.com/yourusername)