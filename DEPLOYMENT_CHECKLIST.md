# Production Deployment Checklist

## 📋 Pre-Deployment

### Code Preparation
- [ ] All tests passing (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console.logs in production code (except logging)
- [ ] Environment variables documented
- [ ] Dependencies updated (`npm outdated`)
- [ ] Security audit passed (`npm audit`)
- [ ] Code reviewed and approved
- [ ] Documentation updated

### Configuration
- [ ] `.env` file created from `.env.example`
- [ ] Production environment variables set
- [ ] `NODE_ENV=production` configured
- [ ] CORS origin set to specific domain (not `*`)
- [ ] Rate limits configured appropriately
- [ ] File upload limits set
- [ ] Port configured (default 3000)

### Security
- [ ] SSL certificate obtained
- [ ] Helmet.js configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] File type restrictions in place
- [ ] Error messages don't leak sensitive info
- [ ] No secrets in source code

## 🖥️ Server Setup

### System Requirements
- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] Sufficient RAM (min 512MB, recommended 2GB+)
- [ ] Sufficient disk space (min 5GB)
- [ ] Firewall configured
- [ ] SSH access configured

### Dependencies Installation
```bash
# System packages
- [ ] Git installed
- [ ] Build tools installed (gcc, make)
- [ ] Chromium dependencies installed

# For Ubuntu/Debian:
sudo apt-get update
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 \
  libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 \
  libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
  libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 \
  libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
  libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates \
  fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

### Project Setup
```bash
- [ ] Repository cloned
- [ ] Dependencies installed (`npm ci --only=production`)
- [ ] Directories created (uploads, wwebjs_auth)
- [ ] Permissions set correctly
- [ ] `.env` file in place
```

## 🚀 Deployment Method

### Option 1: PM2 (Recommended)
```bash
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] Application started (`pm2 start server.js --name whatsapp-api`)
- [ ] Startup script configured (`pm2 startup && pm2 save`)
- [ ] Environment variables loaded
- [ ] Auto-restart on crash configured
- [ ] Memory limit set (`--max-memory-restart 500M`)
- [ ] Logs configured (`pm2 install pm2-logrotate`)
```

### Option 2: Docker
```bash
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Image built (`docker build -t whatsapp-api .`)
- [ ] Container running (`docker-compose up -d`)
- [ ] Volumes mapped correctly
- [ ] Health check working
- [ ] Logs accessible (`docker logs -f whatsapp-api`)
```

### Option 3: Systemd
```bash
- [ ] Service file created (`/etc/systemd/system/whatsapp-api.service`)
- [ ] Service enabled (`systemctl enable whatsapp-api`)
- [ ] Service started (`systemctl start whatsapp-api`)
- [ ] Service status checked (`systemctl status whatsapp-api`)
- [ ] Auto-restart configured
```

## 🌐 Web Server Configuration

### Nginx Setup
- [ ] Nginx installed
- [ ] SSL certificate installed
- [ ] Virtual host configured
- [ ] Proxy settings configured
- [ ] SSE endpoint configured (no buffering)
- [ ] File upload size limits set
- [ ] Security headers configured
- [ ] Gzip compression enabled
- [ ] Configuration tested (`nginx -t`)
- [ ] Nginx restarted

Example Nginx config location:
```
/etc/nginx/sites-available/whatsapp-api
```

### Apache Setup (Alternative)
- [ ] Apache installed
- [ ] mod_proxy enabled
- [ ] mod_proxy_http enabled
- [ ] mod_ssl enabled
- [ ] Virtual host configured
- [ ] SSL configured
- [ ] Configuration tested
- [ ] Apache restarted

## 🔒 Security Hardening

### Firewall
```bash
- [ ] UFW/iptables configured
- [ ] Port 22 (SSH) allowed
- [ ] Port 80 (HTTP) allowed
- [ ] Port 443 (HTTPS) allowed
- [ ] Port 3000 (Node) blocked from external (if using reverse proxy)
- [ ] Unnecessary ports closed
```

### SSL/TLS
- [ ] SSL certificate installed (Let's Encrypt or commercial)
- [ ] Certificate auto-renewal configured
- [ ] HTTPS redirect configured
- [ ] TLS 1.2+ enforced
- [ ] Strong cipher suites configured
- [ ] HSTS header enabled

### Application Security
- [ ] No default credentials in use
- [ ] Rate limiting configured
- [ ] CORS restricted to known origins
- [ ] Helmet.js configured
- [ ] Input validation on all endpoints
- [ ] File type restrictions enforced
- [ ] XSS protection enabled
- [ ] CSRF protection (if applicable)

## 📊 Monitoring Setup

### Health Checks
```bash
- [ ] Health endpoint accessible (`/health`)
- [ ] Status endpoint working (`/api/status`)
- [ ] Automated health checks configured
- [ ] Alert thresholds set
```

### Logging
```bash
- [ ] Application logs captured
- [ ] Log rotation configured
- [ ] Error logs monitored
- [ ] Access logs enabled
- [ ] Log retention policy set (e.g., 30 days)
```

### Monitoring Tools
- [ ] Server monitoring (CPU, RAM, Disk)
- [ ] Application monitoring (APM tool)
- [ ] Uptime monitoring (e.g., UptimeRobot)
- [ ] Error tracking (e.g., Sentry)
- [ ] Performance monitoring
- [ ] Alert notifications configured

## 💾 Backup Strategy

### Data Backup
```bash
- [ ] Session data backup configured (`./wwebjs_auth`)
- [ ] Backup schedule set (daily recommended)
- [ ] Backup retention policy defined
- [ ] Off-site backup configured
- [ ] Backup restoration tested
```

### Backup Script Example:
```bash
#!/bin/bash
BACKUP_DIR="/backups/whatsapp"
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf $BACKUP_DIR/whatsapp-backup-$DATE.tar.gz ./wwebjs_auth
find $BACKUP_DIR -mtime +30 -delete  # Keep 30 days
```

- [ ] Backup script created
- [ ] Cron job configured
- [ ] Backup verification working
- [ ] Restore procedure documented

## 🧪 Post-Deployment Testing

### Functional Tests
```bash
- [ ] Application accessible
- [ ] QR code generation working
- [ ] WhatsApp authentication successful
- [ ] Message sending working
- [ ] Message receiving working
- [ ] Media upload working
- [ ] Chat operations working
- [ ] Group operations working
- [ ] Contact operations working
```

### Performance Tests
```bash
- [ ] Response times acceptable (<100ms for health check)
- [ ] Concurrent requests handled
- [ ] Memory usage stable
- [ ] CPU usage reasonable
- [ ] No memory leaks detected
- [ ] SSE connections stable
```

### Security Tests
```bash
- [ ] HTTPS working
- [ ] Rate limiting active
- [ ] CORS working as expected
- [ ] File upload restrictions enforced
- [ ] Security headers present
- [ ] No sensitive data in responses
```

### Load Test Example:
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/health

# Or using wrk
wrk -t4 -c100 -d30s http://localhost:3000/health
```

- [ ] Load tests passed
- [ ] Stress tests passed
- [ ] Memory under load checked

## 📞 WhatsApp Integration

### Authentication
```bash
- [ ] QR code generated successfully
- [ ] QR code scanned and authenticated
- [ ] Session persisted correctly
- [ ] Re-authentication not required after restart
- [ ] Phone linked successfully
```

### Functionality
```bash
- [ ] Test message sent successfully
- [ ] Test message received
- [ ] Media sending works
- [ ] Chat list loads
- [ ] Messages load from chat
- [ ] Typing indicators work
- [ ] Read receipts work
```

## 🔄 Continuous Deployment

### CI/CD Pipeline
- [ ] Git repository connected
- [ ] Build pipeline configured
- [ ] Test pipeline configured
- [ ] Deployment pipeline configured
- [ ] Rollback procedure defined
- [ ] Deployment notifications set up

### Version Control
- [ ] Git repository initialized
- [ ] `.gitignore` configured
- [ ] Sensitive files excluded
- [ ] Branches strategy defined (main, develop, feature)
- [ ] Tagging strategy defined (semantic versioning)

## 📝 Documentation

### Technical Documentation
- [ ] README.md complete
- [ ] API documentation available
- [ ] Deployment guide written
- [ ] Troubleshooting guide available
- [ ] Architecture documented
- [ ] Environment variables documented

### Operational Documentation
- [ ] Runbook created
- [ ] Incident response plan
- [ ] Backup/restore procedures
- [ ] Scaling procedures
- [ ] Monitoring procedures
- [ ] Contact information updated

## 👥 Team Handoff

### Knowledge Transfer
- [ ] Team trained on system
- [ ] Access credentials shared securely
- [ ] On-call rotation defined
- [ ] Escalation procedures defined
- [ ] Documentation review completed

### Access Management
```bash
- [ ] SSH keys distributed
- [ ] Server access granted
- [ ] Monitoring access granted
- [ ] Repository access granted
- [ ] Credentials management system in place
```

## ✅ Go-Live Checklist

### Final Verification
```bash
- [ ] All tests passing
- [ ] All monitoring active
- [ ] All backups working
- [ ] SSL certificate valid
- [ ] DNS records correct
- [ ] Load balancing working (if applicable)
- [ ] Logging working
- [ ] Alerts configured
```

### Communication
- [ ] Stakeholders notified
- [ ] Users notified (if applicable)
- [ ] Support team briefed
- [ ] Emergency contacts available

### Post-Launch
- [ ] System monitored for first 24 hours
- [ ] No critical errors detected
- [ ] Performance acceptable
- [ ] User feedback collected
- [ ] Issues documented

## 🚨 Rollback Plan

### Preparation
- [ ] Previous version preserved
- [ ] Rollback procedure documented
- [ ] Rollback tested in staging
- [ ] Database rollback plan (if applicable)

### Rollback Steps
```bash
1. [ ] Stop current application
2. [ ] Restore previous version
3. [ ] Restore session data if needed
4. [ ] Verify rollback success
5. [ ] Notify stakeholders
6. [ ] Document reasons
```

## 📋 Daily Operations Checklist

### Daily Tasks
- [ ] Check application logs
- [ ] Verify health endpoint
- [ ] Check error rates
- [ ] Verify backup completion
- [ ] Monitor resource usage
- [ ] Check security alerts

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Check for dependency updates
- [ ] Review security advisories
- [ ] Test backup restoration
- [ ] Review capacity planning

### Monthly Tasks
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Disaster recovery drill
- [ ] Documentation update
- [ ] Cost optimization review

## 🎯 Success Criteria

Application is considered successfully deployed when:

- [ ] Uptime > 99.9%
- [ ] Average response time < 200ms
- [ ] Error rate < 0.1%
- [ ] No critical security vulnerabilities
- [ ] All monitoring and alerts working
- [ ] Backup and restore tested
- [ ] Documentation complete
- [ ] Team trained and confident

---

## 📞 Emergency Contacts

**Primary Contact:**
- Name:
- Phone:
- Email:

**Backup Contact:**
- Name:
- Phone:
- Email:

**Vendor Support:**
- Hosting Provider:
- SSL Provider:
- Monitoring Service:

---

## 📝 Sign-Off

Deployment completed by: ________________

Date: ________________

Approved by: ________________

Date: ________________

---

**Next Review Date:** ________________