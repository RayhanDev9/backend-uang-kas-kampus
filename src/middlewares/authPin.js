const { timingSafeEqual } = require("node:crypto");

function authPin(req, res, next) {
  const configuredPin = process.env.ADMIN_PIN;
  if (!configuredPin) {
    return res.status(500).json({
      success: false,
      message: "Konfigurasi ADMIN_PIN belum diatur",
    });
  }

  const providedPin = req.get("x-admin-pin");
  if (
    typeof providedPin !== "string" ||
    Buffer.byteLength(providedPin) !== Buffer.byteLength(configuredPin) ||
    !timingSafeEqual(Buffer.from(providedPin), Buffer.from(configuredPin))
  ) {
    return res.status(401).json({
      success: false,
      message: "PIN admin tidak valid",
    });
  }

  return next();
}

module.exports = authPin;
