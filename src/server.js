const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { requireAuth } = require('./middleware/auth');
const journalRoutes = require('./routes/journal');

const app = express();
const PORT = process.env.PORT || 8080;
app.disable('x-powered-by');
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://apis.google.com', 'https://www.gstatic.com'],
    frameSrc: ["'self'", 'https://accounts.google.com', 'https://*.firebaseapp.com'],
    connectSrc: ["'self'", 'https://*.googleapis.com', 'https://securetoken.googleapis.com', 'https://identitytoolkit.googleapis.com', 'https://*.firebaseapp.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    objectSrc: ["'none'"],
  }}
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/health', (req,res)=>res.json({status:'ok',service:'personal-gemini-growth-journal'}));
app.get('/api/me', requireAuth, (req,res)=>res.json({uid:req.user.uid,email:req.user.email}));
app.use('/api/journals', journalRoutes);
app.use(express.static('public'));
app.use((req,res)=>req.path.startsWith('/api/') ? res.status(404).json({error:'API endpoint not found'}) : res.sendFile(path.join(process.cwd(),'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`Server running on port ${PORT}`));
