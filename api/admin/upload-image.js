const { verifyAdmin } = require('../middleware/auth');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;

function forbiddenAdminResponse(req, res) {
  const payload = { error: 'Forbidden: admin only' };
  if (process.env.NODE_ENV !== 'production' && req.authErrorCode) {
    payload.reason = req.authErrorCode;
  }
  return res.status(403).json(payload);
}

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ secure: true });
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminUser = await verifyAdmin(req);
  if (!adminUser) {
    return forbiddenAdminResponse(req, res);
  }

  const { imageBase64, fileName, folder } = req.body;

  if (!imageBase64 || !fileName) {
    return res.status(400).json({ error: 'imageBase64 and fileName are required' });
  }

  try {
    if (process.env.CLOUDINARY_URL) {
      const uploadResult = await cloudinary.uploader.upload(`data:image/jpeg;base64,${imageBase64}`, {
        public_id: folder ? `${folder}/${fileName}` : fileName,
        overwrite: true,
        resource_type: 'image'
      });
      return res.status(200).json({ imageUrl: uploadResult.secure_url });
    }

    if (!admin.apps.length) {
      const firebaseConfig = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!firebaseConfig) {
        throw new Error('Neither Cloudinary nor Firebase config available for upload');
      }
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(firebaseConfig)),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return res.status(500).json({ error: 'FIREBASE_STORAGE_BUCKET is required for Firebase uploads' });
    }

    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(folder ? `${folder}/${fileName}` : fileName);
    const buffer = Buffer.from(imageBase64, 'base64');

    await file.save(buffer, {
      metadata: { contentType: 'image/jpeg' },
      public: true,
      validation: 'md5'
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(file.name)}`;
    return res.status(200).json({ imageUrl: publicUrl });
  } catch (error) {
    console.error('admin/upload-image API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
