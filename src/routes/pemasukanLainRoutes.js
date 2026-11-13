const express = require("express");
const {
  createPemasukanLain,
  deletePemasukanLain,
  getPemasukanLain,
} = require("../controllers/pemasukanLainController");
const authPin = require("../middlewares/authPin");

const router = express.Router();

router.get("/", getPemasukanLain);
router.post("/", authPin, createPemasukanLain);
router.delete("/:id", authPin, deletePemasukanLain);

module.exports = router;
