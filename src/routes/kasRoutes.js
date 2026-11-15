const express = require("express");
const {
  createKas,
  deleteKas,
  getKas,
  getKasMatrix,
  updateKas,
  updatePertemuan,
} = require("../controllers/kasController");
const authPin = require("../middlewares/authPin");
const excelRoutes = require("./excelRoutes");

const router = express.Router();

// Route template, export, dan import file excel/csv
router.use("/", excelRoutes);

// Route matriks mingguan (ditempatkan sebelum :id agar tidak tertabrak)
router.get("/matrix", getKasMatrix);

// Route update absensi pertemuan mingguan oleh bendahara
router.put("/:id/pertemuan", authPin, updatePertemuan);

// Route CRUD kas
router.get("/", getKas);
router.post("/", authPin, createKas);
router.put("/:id", authPin, updateKas);
router.delete("/:id", authPin, deleteKas);

module.exports = router;
