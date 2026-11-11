const express = require("express");
const {
  createKas,
  deleteKas,
  getKas,
  updateKas,
} = require("../controllers/kasController");
const authPin = require("../middlewares/authPin");

const router = express.Router();

router.get("/", getKas);
router.post("/", authPin, createKas);
router.put("/:id", authPin, updateKas);
router.delete("/:id", authPin, deleteKas);

module.exports = router;
