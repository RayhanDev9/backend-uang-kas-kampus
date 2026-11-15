const express = require("express");
const { login, verify } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.get("/verify", verify);

module.exports = router;
