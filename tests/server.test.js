const request = require('supertest');
const app = require('../server');

describe('WhatsApp Web API Tests', () => {
  
  // ==================== SYSTEM ENDPOINTS ====================
  describe('System Endpoints', () => {
    
    test('GET /health - should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);
      
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('whatsapp');
      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('memory');
    });

    test('GET /api/status - should return WhatsApp status', async () => {
      const res = await request(app)
        .get('/api/status')
        .expect(200);
      
      expect(res.body).toHaveProperty('isReady');
      expect(res.body).toHaveProperty('isInitializing');
      expect(res.body).toHaveProperty('hasQR');
      expect(res.body).toHaveProperty('timestamp');
    });

    test('GET /api/qr - should return QR code status', async () => {
      const res = await request(app)
        .get('/api/qr')
        .expect(200);
      
      expect(res.body).toHaveProperty('status');
    });

    test('GET /api/stats - should return statistics', async () => {
      const res = await request(app)
        .get('/api/stats')
        .expect(200);
      
      expect(res.body).toHaveProperty('messagesSent');
      expect(res.body).toHaveProperty('messagesReceived');
      expect(res.body).toHaveProperty('errors');
      expect(res.body).toHaveProperty('uptime');
    });

    test('GET /nonexistent - should return 404', async () => {
      const res = await request(app)
        .get('/nonexistent')
        .expect(404);
      
      expect(res.body).toHaveProperty('error', 'Endpoint not found');
    });
  });

  // ==================== AUTHENTICATION ====================
  describe('Authentication Requirements', () => {
    
    test('GET /api/chats - should return 503 if client not ready', async () => {
      const res = await request(app)
        .get('/api/chats')
        .expect(503);
      
      expect(res.body).toHaveProperty('error');
    });

    test('POST /api/send - should return 503 if client not ready', async () => {
      const res = await request(app)
        .post('/api/send')
        .send({ number: '1234567890', message: 'test' })
        .expect(503);
      
      expect(res.body).toHaveProperty('error');
    });
  });

  // ==================== VALIDATION ====================
  describe('Input Validation', () => {
    
    test('POST /api/send - should validate phone number', async () => {
      const res = await request(app)
        .post('/api/send')
        .send({ number: '123', message: 'test' })
        .expect(400);
      
      expect(res.body.error).toMatch(/phone number/i);
    });

    test('POST /api/send - should require phone number', async () => {
      const res = await request(app)
        .post('/api/send')
        .send({ message: 'test' })
        .expect(400);
      
      expect(res.body.error).toMatch(/required/i);
    });

    test('POST /api/send - should require message', async () => {
      const res = await request(app)
        .post('/api/send')
        .send({ number: '1234567890' })
        .expect(400);
      
      expect(res.body.error).toMatch(/message/i);
    });

    test('POST /api/send - should validate message length', async () => {
      const longMessage = 'a'.repeat(5000);
      const res = await request(app)
        .post('/api/send')
        .send({ number: '1234567890', message: longMessage })
        .expect(400);
      
      expect(res.body.error).toMatch(/too long/i);
    });

    test('POST /api/send - should validate message type', async () => {
      const res = await request(app)
        .post('/api/send')
        .send({ number: '1234567890', message: 123 })
        .expect(400);
      
      expect(res.body.error).toMatch(/message/i);
    });
  });

  // ==================== RATE LIMITING ====================
  describe('Rate Limiting', () => {
    
    test('Should enforce rate limits on /api/status', async () => {
      const requests = Array(35).fill().map(() => 
        request(app).get('/api/status')
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  // ==================== CONTACT ENDPOINTS ====================
  describe('Contact Endpoints', () => {
    
    test('POST /api/check-number - should validate input', async () => {
      const res = await request(app)
        .post('/api/check-number')
        .send({})
        .expect(400);
      
      expect(res.body).toHaveProperty('error');
    });

    test('POST /api/check-number - should validate phone format', async () => {
      const res = await request(app)
        .post('/api/check-number')
        .send({ number: '12' })
        .expect(400);
      
      expect(res.body.error).toMatch(/phone number/i);
    });
  });

  // ==================== GROUP ENDPOINTS ====================
  describe('Group Endpoints', () => {
    
    test('POST /api/group/create - should validate name', async () => {
      const res = await request(app)
        .post('/api/group/create')
        .send({ participants: [] })
        .expect(400);
      
      expect(res.body.error).toMatch(/name/i);
    });

    test('POST /api/group/create - should validate participants', async () => {
      const res = await request(app)
        .post('/api/group/create')
        .send({ name: 'Test Group' })
        .expect(400);
      
      expect(res.body.error).toMatch(/participants/i);
    });

    test('POST /api/group/create - should require at least one participant', async () => {
      const res = await request(app)
        .post('/api/group/create')
        .send({ name: 'Test Group', participants: [] })
        .expect(400);
      
      expect(res.body.error).toMatch(/participant/i);
    });

    test('POST /api/group/:groupId/add - should validate participants array', async () => {
      const res = await request(app)
        .post('/api/group/test123/add')
        .send({})
        .expect(400);
      
      expect(res.body.error).toMatch(/participants/i);
    });

    test('POST /api/group/:groupId/remove - should validate participants array', async () => {
      const res = await request(app)
        .post('/api/group/test123/remove')
        .send({})
        .expect(400);
      
      expect(res.body.error).toMatch(/participants/i);
    });
  });

  // ==================== FILE UPLOAD ====================
  describe('File Upload Endpoints', () => {
    
    test('POST /api/send-media - should require file', async () => {
      const res = await request(app)
        .post('/api/send-media')
        .field('number', '1234567890')
        .expect(400);
      
      expect(res.body.error).toMatch(/file/i);
    });

    test('POST /api/send-media - should require number', async () => {
      const res = await request(app)
        .post('/api/send-media')
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(400);
      
      expect(res.body.error).toMatch(/number/i);
    });
  });

  // ==================== SEARCH ====================
  describe('Search Endpoint', () => {
    
    test('GET /api/search - should require query parameter', async () => {
      const res = await request(app)
        .get('/api/search')
        .expect(400);
      
      expect(res.body.error).toMatch(/query/i);
    });
  });

  // ==================== SECURITY HEADERS ====================
  describe('Security Headers', () => {
    
    test('Should include security headers', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);
      
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers).toHaveProperty('x-frame-options');
    });
  });

  // ==================== CORS ====================
  describe('CORS Configuration', () => {
    
    test('Should allow configured origins', async () => {
      const res = await request(app)
        .get('/api/status')
        .set('Origin', 'http://localhost:3000')
        .expect(200);
      
      expect(res.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  // ==================== ERROR HANDLING ====================
  describe('Error Handling', () => {
    
    test('Should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/api/send')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    test('Should return proper error format', async () => {
      const res = await request(app)
        .post('/api/send')
        .send({})
        .expect(400);
      
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });
  });

  // ==================== COMPRESSION ====================
  describe('Compression', () => {
    
    test('Should compress large responses', async () => {
      const res = await request(app)
        .get('/health')
        .set('Accept-Encoding', 'gzip')
        .expect(200);
      
      // Check if response can be compressed
      expect(res.headers['content-encoding']).toBeDefined();
    });
  });
});

// ==================== INTEGRATION TESTS ====================
describe('Integration Tests (Requires Active WhatsApp Connection)', () => {
  
  // These tests require the WhatsApp client to be authenticated
  // Skip these in CI/CD, run manually
  
  describe.skip('Chat Operations', () => {
    
    test('Should get all chats', async () => {
      const res = await request(app)
        .get('/api/chats')
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Should get specific chat', async () => {
      const chatsRes = await request(app).get('/api/chats');
      if (chatsRes.body.length > 0) {
        const chatId = chatsRes.body[0].id;
        
        const res = await request(app)
          .get(`/api/chat/${chatId}`)
          .expect(200);
        
        expect(res.body).toHaveProperty('id', chatId);
      }
    });
  });

  describe.skip('Message Operations', () => {
    
    const TEST_NUMBER = process.env.TEST_PHONE_NUMBER || '1234567890';
    
    test('Should send text message', async () => {
      const res = await request(app)
        .post('/api/send')
        .send({
          number: TEST_NUMBER,
          message: 'Test message from API'
        })
        .expect(200);
      
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('messageId');
    });

    test('Should check if number exists', async () => {
      const res = await request(app)
        .post('/api/check-number')
        .send({ number: TEST_NUMBER })
        .expect(200);
      
      expect(res.body).toHaveProperty('exists');
      expect(res.body).toHaveProperty('number');
    });
  });

  describe.skip('Contact Operations', () => {
    
    test('Should get all contacts', async () => {
      const res = await request(app)
        .get('/api/contacts')
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

// ==================== PERFORMANCE TESTS ====================
describe('Performance Tests', () => {
  
  test('Health check should respond quickly', async () => {
    const start = Date.now();
    await request(app).get('/health').expect(200);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100); // Should respond within 100ms
  });

  test('Status check should respond quickly', async () => {
    const start = Date.now();
    await request(app).get('/api/status').expect(200);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50); // Should respond within 50ms
  });
});

// ==================== LOAD TESTS ====================
describe('Load Tests', () => {
  
  test('Should handle concurrent requests', async () => {
    const requests = Array(10).fill().map(() => 
      request(app).get('/health')
    );
    
    const responses = await Promise.all(requests);
    const successful = responses.filter(r => r.status === 200);
    
    expect(successful.length).toBe(10);
  });
});