const express = require("express");
const {
  createKas,
  deleteKas,
  getKas,
  updateKas,
} = require("../controllers/kasController");
const authPin = require("../middlewares/authPin");
const excelRoutes = require("./excelRoutes");

const router = express.Router();

// Route template, export, dan import file excel/csv
router.use("/", excelRoutes);

// Route CRUD kas
router.get("/", getKas);
router.post("/", authPin, createKas);
router.put("/:id", authPin, updateKas);
router.delete("/:id", authPin, deleteKas);

module.exports = router;
