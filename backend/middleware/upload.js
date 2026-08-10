const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload klasörü: backend/uploads (absolute path)
const uploadDir = path.join(__dirname, '..', 'uploads');

// Klasör yoksa oluştur
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

module.exports = upload;
