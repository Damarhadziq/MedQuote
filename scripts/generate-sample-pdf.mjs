import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const outputDir = path.resolve("output/pdf");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "Penawaran-dr-Budi-Santoso-2026-07-23.pdf");

const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 10;
const blue = [0, 34, 255];
const money = (value) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;

const products = [
  ["Amlodipine 10 mg", "Amlodipine 10 mg / tablet", "Box · 30's", 30, 31475, 30],
  ["Amlodipine 5 mg", "Amlodipine 5 mg / tablet", "Box · 30's", 30, 17850, 30],
  ["Astaxanthin Natural MPL 4 mg", "Haematococcus pluvialis extract 200 mg (Astaxanthin 4 mg) / kapsul", "Box · 18's", 18, 107075, 25],
  ["Azithromycin Dihydrate 500 mg", "Azithromycin 500 mg / kaplet", "Box · 20's", 20, 90000, 15],
  ["Azovir Cream", "Acyclovir 5% / tube", "Tube · 5 gr", null, 19600, 10],
  ["Bidicef 500 mg", "Cefadroxil 500 mg / kapsul", "Box · 60's", 60, 270375, 50],
  ["Bidicef DS", "Cefadroxil 125 mg / 5 ml", "Botol · 60 ml", null, 33990, 50],
  ["Biocort Cream 10 g", "Gentamicin 0.1%, Betamethasone 0.1% / 10 gr / tube", "Tube · 10 g", null, 33775, 10],
  ["Cefadroxil 500 mg", "Cefadroxil 500 mg / kapsul", "Box · 100's", 100, 100000, 20],
  ["Cefixime 100 mg", "Cefixime Trihydrate 100 mg / kapsul", "Box · 50's", 50, 110000, 60],
  ["Citicoline MPL 500 mg", "Citicoline 500 mg / tablet", "Box · 30's", 30, 254775, 35],
  ["Diclofenac Potassium 50 mg", "Kalium Diklofenak 50 mg / tablet", "Box · 50's", 50, 46200, 15],
  ["Domperidone 10 mg", "Domperidone 10 mg / tablet", "Box · 100's", 100, 39900, 15],
  ["Echinacea MPL 500 mg", "Echinacea purpurea herba ekstrak 500 mg / kaplet", "Box · 30's", 30, 80075, 25],
  ["Eperisone 50 mg", "Eperisone HCl 50 mg / tablet", "Box · 100's", 100, 173775, 35],
  ["Fenofibrate 200 mg", "Fenofibrate micronized 200 mg / kapsul", "Box · 40's", 40, 201200, 35],
  ["Glucosamine MPL 250 mg", "Glucosamine 250 mg / tablet", "Box · 100's", 100, 112500, 35],
  ["Glucosamine MPL 500 mg", "Glucosamine 500 mg / kaplet", "Box · 100's", 100, 178000, 35],
  ["Glucosamine MPL Plus", "Glucosamine 500 mg dan Chondroitin 250 mg / kaplet", "Box · 30's", 30, 126300, 35],
  ["Linco MPL 500 mg", "Lincomycin 500 mg / kapsul", "Box · 100's", 100, 373900, 40],
  ["Methylprednisolone 4 mg", "Methylprednisolone 4 mg / tablet", "Box · 100's", 100, 51150, 15],
  ["Mucotussan Sirup 100 ml", "0,7 gr ekstrak kering Hedera Helix Folium / 100 ml", "Botol · 100 ml", null, 44000, 10],
];

const rows = products.map(([name, composition, packaging, units, hna, discount], index) => {
  const withTax = hna * 1.11;
  const finalPrice = withTax * (1 - discount / 100);
  const quantity = (index % 3) + 1;
  return [
    index + 1,
    name,
    composition,
    packaging,
    quantity,
    money(hna),
    money(withTax),
    `${discount}%`,
    money(finalPrice),
    money(units ? withTax / units : withTax),
    money(finalPrice * quantity),
  ];
});

doc.setFont("helvetica", "bold");
doc.setTextColor(...blue);
doc.setFontSize(16);
doc.text("Penawaran harga produk", margin, 15);
doc.setDrawColor(...blue);
doc.setLineWidth(0.45);
doc.line(margin, 20, pageWidth - margin, 20);
doc.setFont("helvetica", "normal");
doc.setTextColor(23, 32, 51);
doc.setFontSize(9);
doc.text("Ditujukan kepada", margin, 28);
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("dr. Budi Santoso", margin, 34);
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(92, 105, 128);
doc.text("Dengan hormat, berikut kami sampaikan penawaran harga produk untuk menjadi bahan pertimbangan.", margin, 42);

autoTable(doc, {
  startY: 48,
  margin: { left: margin, right: margin, bottom: 14 },
  tableWidth: pageWidth - margin * 2,
  rowPageBreak: "avoid",
  showHead: "everyPage",
  head: [["No.", "Nama produk", "Komposisi", "Kemasan", "Qty", "HNA", "HNA + PPN", "Diskon", "Harga final", "Harga satuan terkecil", "Subtotal"]],
  body: rows,
  styles: { font: "helvetica", fontSize: 7.1, cellPadding: 1.7, overflow: "linebreak", valign: "middle", textColor: [23, 32, 51], lineColor: [236, 236, 236], lineWidth: 0.12, minCellHeight: 7 },
  headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle", minCellHeight: 9 },
  bodyStyles: { fillColor: [255, 255, 255] },
  alternateRowStyles: { fillColor: [246, 247, 255] },
  columnStyles: {
    0: { cellWidth: 7, halign: "center" }, 1: { cellWidth: 34 }, 2: { cellWidth: 55 },
    3: { cellWidth: 22 }, 4: { cellWidth: 9, halign: "center" }, 5: { cellWidth: 25, halign: "right" },
    6: { cellWidth: 27, halign: "right" }, 7: { cellWidth: 14, halign: "center" },
    8: { cellWidth: 27, halign: "right" }, 9: { cellWidth: 27, halign: "right" }, 10: { cellWidth: 30, halign: "right" },
  },
});

let contentY = doc.lastAutoTable.finalY + 7;
if (contentY + 26 > pageHeight - 14) {
  doc.addPage("a4", "landscape");
  contentY = 16;
}
doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(23, 32, 51);
doc.text("Catatan", margin, contentY);
doc.setFont("helvetica", "normal");
doc.setTextColor(92, 105, 128);
[
  "Harga tidak mengikat, sewaktu-waktu dapat berubah.",
  "CP: Rosi (08984000823)",
].forEach((line, index) => doc.text(line, margin, contentY + 6 + index * 5));
doc.setTextColor(23, 32, 51);
doc.text("Demikian penawaran ini kami sampaikan. Terima kasih atas perhatian dan kerja sama yang baik.", margin, contentY + 24);

const pageCount = doc.getNumberOfPages();
for (let page = 1; page <= pageCount; page += 1) {
  doc.setPage(page);
  doc.setFontSize(7.5);
  doc.setTextColor(92, 105, 128);
  doc.text(`Halaman ${page} dari ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" });
}

fs.writeFileSync(outputPath, Buffer.from(doc.output("arraybuffer")));
console.log(outputPath);
