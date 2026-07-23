import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const outputDir = path.resolve("output/pdf");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(
  outputDir,
  "Penawaran-dr-Budi-Santoso-2026-07-23.pdf",
);

const doc = new jsPDF({ unit: "mm", format: "a4" });
const pageWidth = doc.internal.pageSize.getWidth();
const margin = 14;
const money = (value) => `Rp${Math.round(value).toLocaleString("id-ID")}`;

doc.setFont("helvetica", "bold");
doc.setTextColor(15, 74, 70);
doc.setFontSize(16);
doc.text("PENAWARAN HARGA", margin, 19);
doc.setFont("helvetica", "normal");
doc.setTextColor(51, 65, 85);
doc.setFontSize(8.5);
doc.text("Nomor: MQ-2026-0021", pageWidth - margin, 16, { align: "right" });
doc.text("Tanggal: 23 Juli 2026", pageWidth - margin, 21, { align: "right" });
doc.setDrawColor(15, 118, 110);
doc.line(margin, 25, pageWidth - margin, 25);

doc.setFontSize(9);
doc.setTextColor(30, 41, 59);
doc.text("Kepada Yth.", margin, 32);
doc.setFont("helvetica", "bold");
doc.text("dr. Budi Santoso", margin, 37);
doc.setFont("helvetica", "normal");
doc.text("Klinik Sehat Sentosa", margin, 42);
doc.text("CP: Siska - 0812 3456 7890", margin, 47);
doc.text(
  "Dengan hormat, berikut kami sampaikan penawaran harga produk untuk menjadi bahan pertimbangan.",
  margin,
  56,
);

const names = [
  "Amoxicillin 500 mg",
  "Omeprazole 20 mg",
  "Paracetamol Sirup",
  "Diclofenac Gel 1%",
  "Cetirizine 10 mg",
  "Amlodipine 10 mg",
  "Metformin 500 mg",
  "Salbutamol 2 mg",
];

const rows = Array.from({ length: 24 }, (_, index) => {
  const hna = 18750 + index * 3150;
  const withTax = hna * 1.11;
  const discount = index % 3 === 0 ? 7.5 : 5;
  const finalPrice = withTax * (1 - discount / 100);
  const quantity = (index % 4) + 1;
  return [
    index + 1,
    names[index % names.length],
    index % 2 === 0
      ? "Tiap tablet mengandung zat aktif dengan uraian komposisi panjang untuk menguji pembungkusan teks pada tabel."
      : "Komposisi sesuai informasi produk.",
    index % 3 === 0 ? "Box - 10 strip x 10 tablet" : "Botol - 60 mL",
    quantity,
    money(hna),
    money(withTax),
    `${discount}%`,
    money(finalPrice),
    money(finalPrice * quantity),
  ];
});

autoTable(doc, {
  startY: 63,
  margin: { left: margin, right: margin, bottom: 17 },
    tableWidth: 161,
    rowPageBreak: "avoid",
  head: [
    [
      "No.",
      "Nama Produk",
      "Komposisi",
      "Kemasan",
      "Qty",
      "HNA",
      "HNA + PPN",
      "Diskon",
      "Harga Final",
      "Subtotal",
    ],
  ],
  body: rows,
  styles: {
    font: "helvetica",
    fontSize: 6.2,
    cellPadding: 1.4,
    overflow: "linebreak",
    valign: "top",
    textColor: [30, 41, 59],
    lineColor: [226, 232, 240],
    lineWidth: 0.1,
  },
  headStyles: {
    fillColor: [15, 74, 70],
    textColor: [255, 255, 255],
    fontStyle: "bold",
    halign: "center",
  },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  columnStyles: {
    0: { cellWidth: 7, halign: "center" },
    1: { cellWidth: 20 },
    2: { cellWidth: 25 },
    3: { cellWidth: 16 },
    4: { cellWidth: 8, halign: "center" },
    5: { cellWidth: 17, halign: "right" },
    6: { cellWidth: 19, halign: "right" },
    7: { cellWidth: 10, halign: "center" },
    8: { cellWidth: 19, halign: "right" },
    9: { cellWidth: 20, halign: "right" },
  },
  didDrawPage: () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Halaman ${doc.getNumberOfPages()}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" },
    );
  },
});

let y = doc.lastAutoTable.finalY + 7;
if (y > 250) {
  doc.addPage();
  y = 18;
}
doc.setFillColor(240, 253, 250);
doc.roundedRect(pageWidth - margin - 68, y, 68, 12, 1.5, 1.5, "F");
doc.setFont("helvetica", "bold");
doc.setTextColor(15, 74, 70);
doc.setFontSize(9);
doc.text("TOTAL PENAWARAN", pageWidth - margin - 64, y + 5);
doc.text("Rp 8.724.350", pageWidth - margin - 4, y + 5, { align: "right" });
y += 20;

const notes = [
  ["Catatan", "Harga sudah termasuk PPN 11%."],
  [
    "Ketentuan pembayaran",
    "Pembayaran dilakukan paling lambat 30 hari kalender setelah barang diterima dalam kondisi baik.",
  ],
  [
    "Informasi pengiriman",
    "Pengiriman dilakukan dalam 2-3 hari kerja dan disesuaikan dengan ketersediaan stok.",
  ],
  ["Masa berlaku", "Penawaran berlaku sampai 31 Agustus 2026."],
];

for (const [label, value] of notes) {
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.text(`${label}:`, margin, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const lines = doc.splitTextToSize(value, pageWidth - margin * 2);
  doc.text(lines, margin, y);
  y += lines.length * 4 + 3;
}

doc.setTextColor(30, 41, 59);
doc.text(
  "Demikian penawaran ini kami sampaikan. Terima kasih atas perhatian dan kerja sama yang baik.",
  margin,
  y + 4,
);

fs.writeFileSync(outputPath, Buffer.from(doc.output("arraybuffer")));
console.log(outputPath);




