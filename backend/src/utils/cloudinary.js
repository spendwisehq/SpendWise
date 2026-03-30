// backend/src/utils/cloudinary.js

const cloudinary = require('cloudinary').v2;
const { env } = require('../config/env');

// Configure
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {object} options - Upload options
 * @returns {object} - { url, publicId }
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder:         options.folder    || 'spendwise/receipts',
      resource_type:  options.type      || 'image',
      public_id:      options.publicId  || undefined,
      transformation: options.transform || [
        { quality: 'auto', fetch_format: 'auto' },
      ],
      ...options.extra,
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
          format:   result.format,
          width:    result.width,
          height:   result.height,
          bytes:    result.bytes,
        });
      }
    );

    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };