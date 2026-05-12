const admin = require('firebase-admin');
const { verifyAdmin } = require('../middleware/auth');

function forbiddenAdminResponse(req, res) {
  const payload = { error: 'Forbidden: admin only' };
  if (process.env.NODE_ENV !== 'production' && req.authErrorCode) {
    payload.reason = req.authErrorCode;
  }
  return res.status(403).json(payload);
}

function sanitizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizeDisplayName(value) {
  return String(value || '').trim();
}

module.exports = async function (req, res) {
  try {
    const adminUser = await verifyAdmin(req);
    if (!adminUser) {
      return forbiddenAdminResponse(req, res);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const email = sanitizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const displayName = sanitizeDisplayName(req.body?.displayName || 'Mesero');

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    const createdUser = await admin.auth().createUser({
      email,
      password,
      displayName,
      disabled: false,
    });

    await admin.firestore().collection('users').doc(createdUser.uid).set({
      uid: createdUser.uid,
      email,
      displayName,
      role: 'mesero',
      createdAt: new Date().toISOString(),
      createdBy: adminUser.uid,
    }, { merge: true });

    return res.status(201).json({
      uid: createdUser.uid,
      email,
      displayName,
      role: 'mesero',
    });
  } catch (error) {
    console.error('admin/users API error:', error);

    if (error?.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'El correo ya existe' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};