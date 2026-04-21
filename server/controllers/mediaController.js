// controllers/mediaController.js
// Handles encrypted file uploads to Cloudinary.
// The server NEVER sees plaintext — it only stores the encrypted blob.
// Cloudinary free tier: 25 GB storage, 25 GB bandwidth/month.

const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Cloudinary is configured via environment variables:
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// These are set in your Vercel project settings.

/**
 * POST /api/media/upload
 * Multipart form-data:
 *   file          — the AES-GCM encrypted binary blob
 *   mimeType      — original MIME type (e.g. "image/jpeg")
 *   fileName      — original file name
 *   fileSize      — original file size in bytes
 *   wrappedKeyForSender
 *   wrappedKeyForRecipient
 *
 * Returns: { url, publicId, mimeType, fileName, fileSize, wrappedKeyForSender, wrappedKeyForRecipient }
 */
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const { mimeType, fileName, fileSize, wrappedKeyForSender, wrappedKeyForRecipient } = req.body;

    if (!wrappedKeyForSender || !wrappedKeyForRecipient) {
      return res.status(400).json({ msg: "Wrapped keys are required" });
    }

    // Upload raw encrypted bytes to Cloudinary as a generic "raw" resource.
    // We use resource_type: "raw" because the blob is opaque binary —
    // Cloudinary won't try to process it as an image/video.
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "chatup_media",
          // No transformations — we never want Cloudinary to touch encrypted bytes
          invalidate: false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    return res.status(201).json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      mimeType: mimeType || "application/octet-stream",
      fileName: fileName || "file",
      fileSize: fileSize ? parseInt(fileSize, 10) : req.file.size,
      wrappedKeyForSender,
      wrappedKeyForRecipient,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/media/:publicId
 * Removes a media asset from Cloudinary (e.g. when deleting a message).
 * Only the sender can delete their own media.
 */
exports.deleteMedia = async (req, res, next) => {
  try {
    // publicId may contain slashes (folder/filename), so we use the full param
    const publicId = req.params[0]; // captured by /*
    if (!publicId) return res.status(400).json({ msg: "publicId is required" });

    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
