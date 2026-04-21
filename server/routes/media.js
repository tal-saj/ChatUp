// routes/media.js
const router = require("express").Router();
const multer = require("multer");
const auth = require("../middleware/auth");
const { uploadMedia, deleteMedia } = require("../controllers/mediaController");

// Store file in memory buffer (max 50 MB per file)
// Free Cloudinary allows 10 MB per image, 100 MB per video — 50 MB is a safe limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

router.post("/upload", auth, upload.single("file"), uploadMedia);

// DELETE /api/media/* — publicId may contain slashes (folder/file)
router.delete("/*", auth, deleteMedia);

module.exports = router;
