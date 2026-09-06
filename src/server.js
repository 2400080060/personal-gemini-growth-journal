const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet({
contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "https://apis.google.com",
          "https://www.gstatic.com"
        ],

        frameSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://*.firebaseapp.com"
        ],

        connectSrc: [
          "'self'",
          "https://*.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://*.firebaseapp.com"
        ],

        imgSrc: [
          "'self'",
          "data:",
          "https:"
        ],

        objectSrc: ["'none'"]
      }
    }
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'personal-gemini-growth-journal'
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.status(200).json({
    uid: req.user.uid,
    email: req.user.email
  });
});

app.use(express.static('public'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
