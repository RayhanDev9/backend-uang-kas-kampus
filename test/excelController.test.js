const test = require("node:test");
const assert = require("node:assert/strict");
const xlsx = require("xlsx");
const ExcelJS = require("exceljs");
const {
  downloadTemplate,
} = require("../src/controllers/excelController");

function createMockResponse() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    data: null,
    setHeader(key, value) {
      headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(buf) {
      this.data = buf;
      return this;
    },
    json(body) {
      this.data = body;
      return this;
    },
  };
}

test("downloadTemplate creates a valid excel file with sample row", async () => {
  const req = {};
  const res = createMockResponse();

  await downloadTemplate(req, res, (err) => {
    assert.fail(err);
  });

  assert.equal(
    res.headers["Content-Type"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  assert.equal(
    res.headers["Content-Disposition"],
    'attachment; filename="Template-Kas.xlsx"'
  );
  assert.ok(Buffer.isBuffer(res.data));

  // Parse generated buffer using xlsx to verify content
  const workbook = xlsx.read(res.data, { type: "buffer" });
  assert.ok(workbook.SheetNames.includes("Template Kas"));

  const sheet = workbook.Sheets["Template Kas"];
  const rows = xlsx.utils.sheet_to_json(sheet);
  assert.equal(rows.length, 1);
  assert.equal(String(rows[0]["NIM"]), "2401020035");
  assert.equal(rows[0]["Nama Mahasiswa"], "Budi Santoso");
  assert.equal(rows[0]["Periode"], "Minggu 1");
  assert.equal(Number(rows[0]["Nominal"]), 10000);
  assert.equal(rows[0]["Status"], "Lunas");
});

test("can parse and read Excel buffer using xlsx correctly", () => {
  // Create an Excel buffer using xlsx
  const sampleData = [
    {
      NIM: "23101140001",
      "Nama Mahasiswa": "Ahmad",
      Periode: "Minggu 1",
      Nominal: 10000,
      Status: "Lunas",
    },
    {
      NIM: "23101140002",
      "Nama Mahasiswa": "Siti",
      Periode: "Minggu 1",
      Nominal: 10000,
      Status: "Belum Lunas",
    },
  ];

  const ws = xlsx.utils.json_to_sheet(sampleData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

  const parsedWb = xlsx.read(buffer, { type: "buffer" });
  const parsedRows = xlsx.utils.sheet_to_json(parsedWb.Sheets["Sheet1"]);

  assert.equal(parsedRows.length, 2);
  assert.equal(parsedRows[0].NIM, "23101140001");
  assert.equal(parsedRows[1].Status, "Belum Lunas");
});
