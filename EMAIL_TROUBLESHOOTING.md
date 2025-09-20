# Email Troubleshooting Guide - PAMVENTORY

## Issue: Verification emails work locally but not in production

### Most Likely Causes:

1. **Missing Environment Variables in Production**
   - `EMAIL_USER` not set in production
   - `EMAIL_PASS` not set in production
   - `FRONTEND_URL` not set correctly

2. **SMTP Server Configuration Issues**
   - Production server can't reach `pamventory.com:465`
   - SSL/TLS certificate issues
   - Firewall blocking outbound SMTP connections

3. **Email Authentication Problems**
   - Incorrect email credentials in production
   - Email account locked/disabled
   - Two-factor authentication blocking app passwords

4. **Vercel/Production Platform Limitations**
   - Some platforms block SMTP on port 465
   - Network restrictions on email sending
   - Timeout issues in serverless functions

### Immediate Fixes to Try:

#### 1. Verify Environment Variables
```bash
# In your Vercel dashboard or production platform:
EMAIL_USER=your-email@pamventory.com
EMAIL_PASS=your-app-password
FRONTEND_URL=https://your-production-domain.com
NODE_ENV=production
```

#### 2. Test Email Configuration
Run the test script we created:
```bash
node test-email.js
```

#### 3. Alternative SMTP Configuration
If port 465 is blocked, try port 587 with STARTTLS:

```javascript
const createTransporter = () => {
  return nodemailer.createTransport({
    host: "pamventory.com",
    port: 587,                    // Use 587 instead of 465
    secure: false,                // false for 587
    requireTLS: true,             // Force TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      ciphers: 'SSLv3'
    }
  });
};
```

#### 4. Use Gmail SMTP as Backup
For immediate fix, consider using Gmail SMTP:

```javascript
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD  // Use App Password, not regular password
    }
  });
};
```

### Debugging Steps:

1. **Check Production Logs**
   - Look for the console.log messages we added
   - Check for SMTP connection errors
   - Verify environment variables are loaded

2. **Test SMTP Connection**
   - The improved code now tests connection before sending
   - Look for "SMTP connection verified successfully" in logs

3. **Check Email Server Settings**
   - Verify pamventory.com mail server is working
   - Test with a simple telnet connection:
   ```bash
   telnet pamventory.com 465
   ```

4. **Verify DNS and MX Records**
   - Ensure pamventory.com has proper MX records
   - Check if mail server is accessible from production

### Production-Specific Considerations:

1. **Vercel Functions Timeout**
   - Email sending might timeout in serverless functions
   - Consider using a queue system for email sending

2. **Rate Limiting**
   - Production might hit rate limits faster
   - Implement proper retry logic

3. **Security Groups/Firewalls**
   - Production servers might block outbound SMTP
   - Check with hosting provider

### Recommended Next Steps:

1. **Immediate**: Check and set all environment variables in production
2. **Short-term**: Try alternative SMTP port (587) or Gmail SMTP
3. **Long-term**: Consider using a dedicated email service (SendGrid, AWS SES, etc.)

### Email Service Alternatives:

If SMTP continues to fail, consider switching to:
- **SendGrid**: Easy integration, reliable delivery
- **AWS SES**: Cost-effective, good for high volume
- **Mailgun**: Developer-friendly API
- **Postmark**: Great deliverability rates

These services are more reliable than custom SMTP in production environments.

