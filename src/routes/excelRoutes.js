const express = require("express");
const {
  downloadTemplate,
  exportKas,
  importKas,
} = require("../controllers/excelController");
const authPin = require("../middlewares/authPin");
const upload = require("../middlewares/upload");

const router = express.Router();

router.get("/template", downloadTemplate);
router.get("/export", exportKas);
router.post("/import", authPin, upload.single("file"), importKas);

module.exports = router;
