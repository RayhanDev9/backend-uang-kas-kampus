require("dotenv").config();

const cors = require("cors");
const express = require("express");
const connectDatabase = require("../src/config/db");
const semesterRoutes = require("../src/routes/semesterRoutes");
const kasRoutes = require("../src/routes/kasRoutes");
const pemasukanLainRoutes = require("../src/routes/pemasukanLainRoutes");
const pengeluaranRoutes = require("../src/routes/pengeluaranRoutes");
const historyRoutes = require("../src/routes/historyRoutes");
const excelRoutes = require("../src/routes/excelRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    return next();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    return res.status(503).json({
      success: false,
      message: "Database tidak tersedia",
    });
  }
});

// Mount Routes
app.use("/api/semesters", semesterRoutes);
app.use("/api/pemasukan-lain", pemasukanLainRoutes);
app.use("/api/pengeluaran", pengeluaranRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/kas", kasRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "Ukuran file melebihi batas maksimal 5MB",
    });
  }

  if (error.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Body request harus berupa JSON yang valid",
    });
  }

  console.error("Unhandled API error:", error);
  return res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server",
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Kas API listening on port ${port}`);
  });
}

module.exports = app;
