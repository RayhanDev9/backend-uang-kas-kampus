const express = require("express");
const {
  activateSemester,
  createSemester,
  getActiveSemester,
  getSemesters,
} = require("../controllers/semesterController");
const authPin = require("../middlewares/authPin");

const router = express.Router();

router.get("/", getSemesters);
router.get("/active", getActiveSemester);
router.post("/", authPin, createSemester);
router.put("/:id/activate", authPin, activateSemester);

module.exports = router;
