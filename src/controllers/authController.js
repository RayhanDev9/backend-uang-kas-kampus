const { timingSafeEqual, createHmac } = require("node:crypto");

function generateAuthToken(pin) {
  return createHmac("sha256", pin)
    .update("kaskita_bendahara_auth_v1")
    .digest("hex");
}

function isValidTokenOrPin(provided, configuredPin) {
  if (typeof provided !== "string" || !provided.trim() || !configuredPin) {
    return false;
  }

  const cleanProvided = provided.trim();

  // 1. Cek langsung kecocokan dengan plain PIN
  if (Buffer.byteLength(cleanProvided) === Buffer.byteLength(configuredPin)) {
    if (timingSafeEqual(Buffer.from(cleanProvided), Buffer.from(configuredPin))) {
      return true;
    }
  }

  // 2. Cek kecocokan dengan HMAC Auth Token
  const expectedToken = generateAuthToken(configuredPin);
  if (Buffer.byteLength(cleanProvided) === Buffer.byteLength(expectedToken)) {
    if (timingSafeEqual(Buffer.from(cleanProvided), Buffer.from(expectedToken))) {
      return true;
    }
  }

  return false;
}

function extractTokenOrPin(req) {
  const authHeader = req.get("authorization");
  if (typeof authHeader === "string" && authHeader.trim().length > 0) {
    const parts = authHeader.trim().split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1];
    }
    return authHeader.trim();
  }

  const pinHeader = req.get("x-admin-pin");
  if (typeof pinHeader === "string" && pinHeader.trim().length > 0) {
    return pinHeader.trim();
  }

  return null;
}

async function login(req, res, next) {
  try {
    const configuredPin = process.env.ADMIN_PIN;
    if (!configuredPin) {
      return res.status(500).json({
        success: false,
        message: "Konfigurasi ADMIN_PIN belum diatur di server",
      });
    }

    const { pin } = req.body || {};
    if (typeof pin !== "string" || pin.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "PIN bendahara wajib diisi",
      });
    }

    const cleanPin = pin.trim();
    if (
      Buffer.byteLength(cleanPin) !== Buffer.byteLength(configuredPin) ||
      !timingSafeEqual(Buffer.from(cleanPin), Buffer.from(configuredPin))
    ) {
      return res.status(401).json({
        success: false,
        message: "PIN bendahara salah",
      });
    }

    const token = generateAuthToken(configuredPin);

    return res.json({
      success: true,
      message: "Login bendahara berhasil",
      token,
      role: "bendahara",
    });
  } catch (error) {
    return next(error);
  }
}

async function verify(req, res, next) {
  try {
    const configuredPin = process.env.ADMIN_PIN;
    if (!configuredPin) {
      return res.status(500).json({
        success: false,
        message: "Konfigurasi ADMIN_PIN belum diatur di server",
      });
    }

    const provided = extractTokenOrPin(req);
    if (!provided) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: "Token atau PIN tidak ditemukan",
      });
    }

    if (!isValidTokenOrPin(provided, configuredPin)) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: "Sesi bendahara tidak valid atau sudah kedaluwarsa",
      });
    }

    return res.json({
      success: true,
      valid: true,
      role: "bendahara",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  extractTokenOrPin,
  generateAuthToken,
  isValidTokenOrPin,
  login,
  verify,
};
