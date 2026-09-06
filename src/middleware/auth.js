const { auth } = require('../firebaseAdmin');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const idToken = header.substring(7).trim();

    if (!idToken) {
      return res.status(401).json({
        error: 'Authentication token missing'
      });
    }

    const decodedToken = await auth.verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null
    };

    next();
  } catch (error) {
    console.error('Authentication verification failed');

    return res.status(401).json({
      error: 'Invalid authentication token'
    });
  }
}

module.exports = {
  requireAuth
};
