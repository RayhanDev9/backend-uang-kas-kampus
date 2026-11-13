const express = require("express");
const {
  createPengeluaran,
  deletePengeluaran,
  getPengeluaran,
} = require("../controllers/pengeluaranController");
const authPin = require("../middlewares/authPin");

const router = express.Router();

router.get("/", getPengeluaran);
router.post("/", authPin, createPengeluaran);
router.delete("/:id", authPin, deletePengeluaran);

module.exports = router;
