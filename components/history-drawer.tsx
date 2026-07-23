"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  Search,
  Trash2,
} from "lucide-react";
import type { Offer } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/field";
import { Dialog, DrawerContent, Tooltip } from "./ui/overlays";

export function HistoryDrawer({
  open,
  offers,
  onOpenChange,
  onDownload,
  onDelete,
}: {
  open: boolean;
  offers: Offer[];
  onOpenChange: (open: boolean) => void;
  onDownload: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
}) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<Offer | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDate("");
      setSelected(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return offers.filter(
      (offer) =>
        (!needle ||
          offer.recipient_name.toLowerCase().includes(needle) ||
          offer.offer_number.toLowerCase().includes(needle)) &&
        (!date || offer.offer_date === date),
    );
  }, [date, offers, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title={selected ? "Detail Penawaran" : "Riwayat Penawaran"}
        description={
          selected
            ? selected.offer_number
            : `${offers.length} penawaran tersimpan`
        }
        className="sm:max-w-[620px]"
      >
        {selected ? (
          <OfferDetail
            offer={selected}
            onBack={() => setSelected(null)}
            onDownload={() => onDownload(selected)}
            onDelete={() => {
              setSelected(null);
              onDelete(selected);
            }}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-4 py-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    aria-label="Cari riwayat"
                    className="pl-9"
                    placeholder="Cari dokter atau nomor"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    aria-label="Filter tanggal"
                    className="pl-9"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </div>
              </div>

              {filtered.length ? (
                <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {filtered.map((offer) => (
                    <article
                      key={offer.id}
                      className="space-y-3 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {offer.recipient_name}
                            </p>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              {offer.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {offer.offer_number} Â· {formatDate(offer.offer_date)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-900">
                          {formatRupiah(offer.total)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          {offer.offer_items.length} produk
                        </p>
                        <div className="flex items-center gap-1">
                          <Tooltip label="Lihat detail">
                            <Button
                              aria-label={`Lihat ${offer.offer_number}`}
                              size="icon"
                              variant="ghost"
                              onClick={() => setSelected(offer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip label="Unduh PDF">
                            <Button
                              aria-label={`Unduh ${offer.offer_number}`}
                              size="icon"
                              variant="ghost"
                              onClick={() => onDownload(offer)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip label="Hapus penawaran">
                            <Button
                              aria-label={`Hapus ${offer.offer_number}`}
                              size="icon"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => onDelete(offer)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 px-5 py-12 text-center">
                  <p className="font-medium text-slate-700">
                    Riwayat tidak ditemukan
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Ubah kata pencarian atau filter tanggal.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerContent>
    </Dialog>
  );
}

function OfferDetail({
  offer,
  onBack,
  onDownload,
  onDelete,
}: {
  offer: Offer;
  onBack: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <Button variant="ghost" className="-ml-3 mb-4" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>

        <div className="space-y-6">
          <section className="grid gap-4 rounded-md border border-slate-200 p-4 sm:grid-cols-2">
            <Detail label="Ditujukan kepada" value={offer.recipient_name} />
            <Detail label="Tanggal" value={formatDate(offer.offer_date)} />
            <Detail label="Instansi" value={offer.institution || "-"} />
            <Detail
              label="Masa berlaku"
              value={offer.valid_until ? formatDate(offer.valid_until) : "-"}
            />
            <Detail label="Contact Person" value={offer.contact_person || "-"} />
            <Detail label="Nomor kontak" value={offer.contact_number || "-"} />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Produk ditawarkan
            </h3>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-[640px] w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Produk</th>
                    <th className="px-3 py-2.5 text-center font-medium">Qty</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Harga final
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {offer.offer_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800">
                          {item.product_name_snapshot}
                        </p>
                        <p className="mt-0.5 text-slate-500">
                          {item.package_snapshot} Â· Diskon{" "}
                          {item.discount_percentage}%
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center">{item.quantity}</td>
                      <td className="px-3 py-3 text-right">
                        {formatRupiah(item.final_unit_price)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">
                        {formatRupiah(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md bg-teal-50 px-4 py-3">
              <span className="text-sm font-medium text-teal-900">Total</span>
              <span className="text-base font-semibold text-teal-900">
                {formatRupiah(offer.total)}
              </span>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Catatan dan ketentuan
            </h3>
            <Detail label="Catatan" value={offer.notes || "-"} />
            <Detail
              label="Ketentuan pembayaran"
              value={offer.payment_terms || "-"}
            />
            <Detail
              label="Informasi pengiriman"
              value={offer.shipping_information || "-"}
            />
            <Detail
              label="Catatan tambahan"
              value={offer.additional_notes || "-"}
            />
          </section>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white px-4 py-4 sm:justify-end sm:px-6">
        <Button
          variant="secondary"
          className="text-red-600 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Hapus
        </Button>
        <Button onClick={onDownload}>
          <Download className="h-4 w-4" />
          Unduh PDF
        </Button>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-700">
        {value}
      </p>
    </div>
  );
}

