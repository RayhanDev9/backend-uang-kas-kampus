const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const allowedExtensions = [".xlsx", ".xls", ".csv"];

  if (allowedExtensions.includes(ext)) {
    return cb(null, true);
  }

  const error = new Error("Format berkas harus berupa .xlsx atau .csv");
  error.code = "INVALID_FILE_TYPE";
  return cb(error, false);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Maksimal 5MB
  },
  fileFilter,
});

module.exports = upload;
