"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Offer } from "./types";
import { formatDate, safeFilePart } from "./utils";

const money = (value: number) =>
  `Rp${Math.round(value).toLocaleString("id-ID")}`;

const clean = (value: string | null | undefined) => value?.trim() || "-";

export function createOfferPdf(offer: Offer, shouldSave = true) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 74, 70);
  doc.setFontSize(16);
  doc.text("PENAWARAN HARGA", margin, 19);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8.5);
  doc.text(`Nomor: ${offer.offer_number}`, pageWidth - margin, 16, {
    align: "right",
  });
  doc.text(`Tanggal: ${formatDate(offer.offer_date)}`, pageWidth - margin, 21, {
    align: "right",
  });
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.5);
  doc.line(margin, 25, pageWidth - margin, 25);

  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Kepada Yth.", margin, 32);
  doc.setFont("helvetica", "bold");
  doc.text(offer.recipient_name, margin, 37);
  doc.setFont("helvetica", "normal");
  let y = 42;
  if (offer.institution) {
    doc.text(offer.institution, margin, y);
    y += 5;
  }
  if (offer.contact_person || offer.contact_number) {
    doc.text(
      `CP: ${clean(offer.contact_person)}${offer.contact_number ? ` Â· ${offer.contact_number}` : ""}`,
      margin,
      y,
    );
    y += 5;
  }
  y += 3;
  const intro =
    "Dengan hormat, berikut kami sampaikan penawaran harga produk untuk menjadi bahan pertimbangan.";
  doc.text(doc.splitTextToSize(intro, pageWidth - margin * 2), margin, y);
  y += 9;

  autoTable(doc, {
    startY: y,
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
    body: offer.offer_items.map((item, index) => [
      index + 1,
      item.product_name_snapshot,
      item.composition_snapshot,
      item.package_snapshot,
      item.quantity,
      money(item.hna_snapshot),
      money(item.price_with_tax),
      `${item.discount_percentage}%`,
      money(item.final_unit_price),
      money(item.subtotal),
    ]),
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
      valign: "middle",
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
      const page = doc.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Halaman ${page}`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" },
      );
    },
  });

  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? y;
  let contentY = tableEnd + 7;

  const ensureSpace = (needed: number) => {
    if (contentY + needed > doc.internal.pageSize.getHeight() - 18) {
      doc.addPage();
      contentY = 18;
    }
  };

  ensureSpace(14);
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(pageWidth - margin - 68, contentY, 68, 12, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 74, 70);
  doc.setFontSize(9);
  doc.text("TOTAL PENAWARAN", pageWidth - margin - 64, contentY + 5);
  doc.setFontSize(10.5);
  doc.text(money(offer.total), pageWidth - margin - 4, contentY + 5, {
    align: "right",
  });
  contentY += 19;

  const sections = [
    ["Catatan", offer.notes],
    ["Ketentuan pembayaran", offer.payment_terms],
    ["Informasi pengiriman", offer.shipping_information],
    ["Catatan tambahan", offer.additional_notes],
    [
      "Masa berlaku",
      offer.valid_until
        ? `Penawaran berlaku sampai ${formatDate(offer.valid_until)}.`
        : null,
    ],
  ].filter(([, value]) => value);

  for (const [label, value] of sections) {
    const lines = doc.splitTextToSize(String(value), pageWidth - margin * 2);
    ensureSpace(8 + lines.length * 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.text(`${label}:`, margin, contentY);
    contentY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(lines, margin, contentY);
    contentY += lines.length * 4 + 3;
  }

  ensureSpace(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(
    doc.splitTextToSize(
      "Demikian penawaran ini kami sampaikan. Terima kasih atas perhatian dan kerja sama yang baik.",
      pageWidth - margin * 2,
    ),
    margin,
    contentY + 3,
  );

  const filename = `Penawaran-${safeFilePart(offer.recipient_name)}-${offer.offer_date}.pdf`;
  if (shouldSave) doc.save(filename);
  return { doc, filename };
}




