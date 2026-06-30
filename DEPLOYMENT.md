# Deployment Guide

## Table of Contents
1. [Local Development](#local-development)
2. [Docker](#docker)
3. [Heroku](#heroku)
4. [AWS](#aws)
5. [DigitalOcean](#digitalocean)
6. [Production Checklist](#production-checklist)

---

## Local Development

### Prerequisites
- Node.js v14+
- npm or yarn

### Setup
```bash
git clone <repository-url>
cd paymob-backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

---

## Docker

### Using Docker

**Build the image:**
```bash
docker build -t paymob-backend .
```

**Run the container:**
```bash
docker run -p 3000:3000 \
  -e PAYMOB_API_KEY=your_key \
  -e PAYMOB_MERCHANT_ID=your_id \
  -e PAYMOB_IFRAME_ID=your_iframe_id \
  paymob-backend
```

### Using Docker Compose

**Development:**
```bash
cp .env.example .env
# Edit .env with your credentials
docker-compose up
```

**Production:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Heroku

### Prerequisites
- Heroku CLI installed
- Heroku account

### Steps

1. **Create Heroku app:**
```bash
heroku create paymob-backend
```

2. **Set environment variables:**
```bash
heroku config:set PAYMOB_API_KEY=your_key
heroku config:set PAYMOB_MERCHANT_ID=your_id
heroku config:set PAYMOB_IFRAME_ID=your_iframe_id
heroku config:set NODE_ENV=production
```

3. **Deploy:**
```bash
git push heroku main
```

4. **Check logs:**
```bash
heroku logs --tail
```

### Create Procfile
```
web: node server.js
```

---

## AWS

### EC2 Deployment

1. **Launch EC2 instance:**
   - Ubuntu 20.04 LTS
   - t2.micro (or larger)
   - Security group: Allow ports 22, 80, 443

2. **SSH into instance:**
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

3. **Install Node.js:**
```bash
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. **Clone repository:**
```bash
git clone <repository-url>
cd paymob-backend
npm install
```

5. **Configure environment:**
```bash
cp .env.example .env
nano .env
```

6. **Install PM2 (process manager):**
```bash
sudo npm install -g pm2
pm2 start server.js --name "paymob-backend"
pm2 startup
pm2 save
```

7. **Set up Nginx reverse proxy:**
```bash
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/default
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

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

8. **Enable SSL with Let's Encrypt:**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## DigitalOcean

### Using DigitalOcean App Platform

1. **Create new app:**
   - Connect GitHub repository
   - Select this project

2. **Configure environment:**
   - Add environment variables in App Platform dashboard
   - PAYMOB_API_KEY
   - PAYMOB_MERCHANT_ID
   - PAYMOB_IFRAME_ID
   - NODE_ENV=production

3. **Deploy:**
   - DigitalOcean automatically deploys on push to main

### Using DigitalOcean Droplet

Similar to AWS EC2. Follow AWS steps with `apt-get` for package management.

---

## Production Checklist

### Security
- [ ] Use HTTPS/SSL certificates
- [ ] Enable CORS only for trusted domains
- [ ] Use environment variables for secrets
- [ ] Never commit `.env` file
- [ ] Enable firewall rules
- [ ] Keep dependencies updated
- [ ] Use strong API keys
- [ ] Implement rate limiting

### Performance
- [ ] Enable gzip compression
- [ ] Use caching headers
- [ ] Implement request logging
- [ ] Monitor memory/CPU usage
- [ ] Set up automatic backups
- [ ] Use CDN for static assets

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Enable application logging
- [ ] Monitor uptime
- [ ] Set up alerts
- [ ] Track response times
- [ ] Monitor API usage

### Deployment
- [ ] Automated CI/CD pipeline
- [ ] Database backups
- [ ] Zero-downtime deployment
- [ ] Health checks
- [ ] Rollback strategy
- [ ] Load balancing

### Code Quality
- [ ] Run linting before deployment
- [ ] Write unit tests
- [ ] Use pre-commit hooks
- [ ] Code reviews
- [ ] Documentation updated
- [ ] Version control clean

---

## Environment Variables Checklist

Required for production:
```
✓ PAYMOB_API_KEY - Your Paymob API key
✓ PAYMOB_MERCHANT_ID - Your Paymob Merchant ID
✓ PAYMOB_IFRAME_ID - Your Paymob iframe ID
✓ NODE_ENV - Set to 'production'
✓ PORT - Server port (default: 3000)
✓ FRONTEND_URL - Your frontend domain
```

---

## Monitoring and Maintenance

### Check Health
```bash
curl https://your-domain.com/health
```

### View Logs
```bash
# Heroku
heroku logs --tail

# AWS EC2 with PM2
pm2 logs

# Docker
docker logs container_name
```

### Update Dependencies
```bash
npm update
npm audit fix
```

---

## Troubleshooting

### High Memory Usage
```bash
# Restart PM2
pm2 restart all

# Check for memory leaks
pm2 save
```

### Database Connection Issues
- Verify connection string
- Check firewall rules
- Verify credentials

### Slow Response Times
- Check Paymob API status
- Monitor server resources
- Implement caching

### SSL Certificate Issues
- Renew certificate
- Check domain DNS
- Verify certificate path

---

## Backup and Recovery

### Backup Strategy
- Daily backups of configuration
- Version control for code
- Environment variables in secure vault
- Regular testing of recovery

### Disaster Recovery
1. Restore from backup
2. Verify environment variables
3. Clear caches
4. Run tests
5. Deploy updated code

---

## Additional Resources

- [Heroku Documentation](https://devcenter.heroku.com/)
- [AWS EC2 Guide](https://aws.amazon.com/ec2/)
- [DigitalOcean Docs](https://docs.digitalocean.com/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Checklist](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

## Support

For deployment issues:
1. Check server logs
2. Verify environment variables
3. Test API endpoints
4. Check Paymob API status
5. Review security settings

Need help? Contact your DevOps team or refer to platform documentation.
