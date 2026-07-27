"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Offer } from "./types";
import { formatDate, getSnapshotSmallestUnitPrice, safeFilePart } from "./utils";

const PRIMARY_BLUE: [number, number, number] = [0, 34, 255];
const TEXT_COLOR: [number, number, number] = [23, 32, 51];
const MUTED_COLOR: [number, number, number] = [92, 105, 128];
const ZEBRA_COLOR: [number, number, number] = [246, 247, 255];

const money = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;

export function createOfferPdf(offer: Offer, shouldSave = true) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY_BLUE);
  doc.setFontSize(16);
  doc.text(`Penawaran Harga Produk per ${formatDate(offer.offer_date)}`, margin, 15);

  doc.setDrawColor(...PRIMARY_BLUE);
  doc.setLineWidth(0.45);
  doc.line(margin, 20, pageWidth - margin, 20);

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_COLOR);
  doc.setFont("helvetica", "normal");
  doc.text("Ditujukan kepada", margin, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(offer.recipient_name, margin, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(
    "Dengan hormat, berikut kami sampaikan penawaran harga produk untuk menjadi bahan pertimbangan.",
    margin,
    42,
  );

  autoTable(doc, {
    startY: 48,
    margin: { left: margin, right: margin, bottom: 14 },
    tableWidth: pageWidth - margin * 2,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    head: [
      [
        "No.",
        "Nama produk",
        "Komposisi",
        "Kemasan",
        "HNA",
        "HNA + PPN",
        "Diskon",
        "Harga final",
        "Harga satuan terkecil",
      ],
    ],
    body: offer.offer_items.map((item, index) => {
      const smallestUnitPrice = getSnapshotSmallestUnitPrice(
        item.package_snapshot,
        item.price_with_tax,
      );
      return [
        index + 1,
        item.product_name_snapshot,
        item.composition_snapshot,
        item.package_snapshot,
        money(item.hna_snapshot),
        money(item.price_with_tax),
        `${item.discount_percentage}%`,
        `${money(item.final_unit_price)} / ${item.package_snapshot.split(" ")[0].toLowerCase()}`,
        money(smallestUnitPrice),
      ];
    }),
    styles: {
      font: "helvetica",
      fontSize: 7.1,
      cellPadding: 1.7,
      overflow: "linebreak",
      valign: "middle",
      textColor: TEXT_COLOR,
      lineColor: [236, 236, 236],
      lineWidth: 0.12,
      minCellHeight: 7,
    },
    headStyles: {
      fillColor: PRIMARY_BLUE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      minCellHeight: 9,
    },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: ZEBRA_COLOR },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 52 },
      2: { cellWidth: 73 },
      3: { cellWidth: 22 },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 27, halign: "right" },
      6: { cellWidth: 14, halign: "center" },
      7: { cellWidth: 27, halign: "right" },
      8: { cellWidth: 27, halign: "right" },
    },
  });

  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? 48;
  let contentY = tableEnd + 7;
  const noteLines = [
    ...(offer.notes?.split("\n").map((line) => line.trim()).filter((line) => line && !/distributor/i.test(line)) ?? []),
    ...(offer.contact_person
      ? [
          `CP: ${offer.contact_person}${offer.contact_number ? ` (${offer.contact_number})` : ""}`,
        ]
      : offer.contact_number
        ? [`Nomor kontak: ${offer.contact_number}`]
        : []),
  ];
  const noteHeight = Math.max(16, 11 + noteLines.length * 5);

  if (contentY + noteHeight > pageHeight - 14) {
    doc.addPage("a4", "landscape");
    contentY = 16;
  }

  if (noteLines.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_COLOR);
    doc.text("Catatan", margin, contentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED_COLOR);
    noteLines.forEach((line, index) => {
      doc.text(line, margin, contentY + 6 + index * 5);
    });
  }

  const closingY = contentY + (noteLines.length ? 11 + noteLines.length * 5 : 0);
  if (closingY < pageHeight - 13) {
    doc.setTextColor(...TEXT_COLOR);
    doc.text(
      "Demikian penawaran ini kami sampaikan. Terima kasih atas perhatian dan kerja sama yang baik.",
      margin,
      closingY,
    );
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Halaman ${page} dari ${pageCount}`, pageWidth - margin, pageHeight - 6, {
      align: "right",
    });
  }

  const filename = `Penawaran-${safeFilePart(offer.recipient_name)}-${offer.offer_date}.pdf`;
  if (shouldSave) doc.save(filename);
  return { doc, filename };
}
