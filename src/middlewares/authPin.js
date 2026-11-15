const { extractTokenOrPin, isValidTokenOrPin } = require("../controllers/authController");

function authPin(req, res, next) {
  const configuredPin = process.env.ADMIN_PIN;
  if (!configuredPin) {
    return res.status(500).json({
      success: false,
      message: "Konfigurasi ADMIN_PIN belum diatur",
    });
  }

  const provided = extractTokenOrPin(req);
  if (!provided || !isValidTokenOrPin(provided, configuredPin)) {
    return res.status(401).json({
      success: false,
      message: "PIN admin tidak valid",
    });
  }

  return next();
}

module.exports = authPin;
