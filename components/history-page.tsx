"use client";

import { useMemo, useRef, useState } from "react";
import { Clock3, Download, Package, Search, Trash2 } from "lucide-react";
import type { Offer } from "@/lib/types";
import { formatDate, formatRupiah, getSnapshotSmallestUnitPrice } from "@/lib/utils";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/date-picker";
import { Input } from "./ui/field";
import { Dialog, ModalContent } from "./ui/overlays";

export function HistoryPage({
  offers,
  onDownload,
  onDelete,
}: {
  offers: Offer[];
  onDownload: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
}) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<Offer | null>(null);

  const lastOfferRef = useRef(selected);
  if (selected) lastOfferRef.current = selected;
  const displayOffer = selected || lastOfferRef.current;

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
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-[28px] font-semibold leading-tight sm:leading-10 text-slate-900">Riwayat penawaran</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500">{offers.length} penawaran tersimpan</p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0 sm:max-w-[420px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Cari riwayat"
            className="pl-9 text-xs sm:text-sm"
            placeholder="Cari dokter / no. penawaran"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="w-[145px] shrink-0 sm:w-[200px]">
          <DatePicker
            id="history-date"
            ariaLabel="Filter tanggal"
            placeholder="Pilih tanggal"
            value={date}
            onChange={setDate}
          />
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((offer) => (
            <article
              key={offer.id}
              className="group relative flex cursor-pointer flex-col rounded-xl border border-border bg-white p-5 transition-all hover:border-primary/50 hover:shadow-sm"
              onClick={() => setSelected(offer)}
              role="button"
              tabIndex={0}
              aria-label={`Lihat detail ${offer.offer_number}`}
              onKeyDown={(e) => e.key === "Enter" && setSelected(offer)}
            >
              {/* Header */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base sm:text-lg font-bold text-slate-900 leading-snug">{offer.recipient_name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{offer.offer_number}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary-soft/60"
                    aria-label="Unduh PDF"
                    onClick={() => onDownload(offer)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    aria-label="Hapus"
                    onClick={() => onDelete(offer)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Meta: Date & Product Count inline */}
              <div className="mb-3.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {formatDate(offer.offer_date)}
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                  <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {offer.offer_items.length} produk
                </span>
              </div>

              {/* Products preview */}
              <div className="flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {offer.offer_items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                    >
                      {item.product_name_snapshot}
                    </span>
                  ))}
                  {offer.offer_items.length > 3 && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      +{offer.offer_items.length - 3} lainnya
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-white px-5 py-20 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Clock3 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">Riwayat tidak ditemukan</p>
          <p className="mt-1 text-sm text-slate-500">
            Ubah kata pencarian atau filter tanggal.
          </p>
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(isOpen) => !isOpen && setSelected(null)}>
        <ModalContent
          title="Detail penawaran"
          className="sm:max-w-[800px]"
        >
          {displayOffer ? (
            <OfferDetail
              offer={displayOffer}
              onDownload={() => onDownload(displayOffer)}
              onDelete={() => {
                setSelected(null);
                onDelete(displayOffer);
              }}
            />
          ) : null}
        </ModalContent>
      </Dialog>
    </>
  );
}

function OfferDetail({
  offer,
  onDownload,
  onDelete,
}: {
  offer: Offer;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="space-y-6">
          <section className="grid gap-4 rounded-xl border border-border bg-slate-50 p-4 sm:grid-cols-2">
            <Detail label="Ditujukan kepada" value={offer.recipient_name} />
            <Detail label="Tanggal penawaran" value={formatDate(offer.offer_date)} />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Produk ditawarkan
            </h3>
            <div className="mq-scrollbar overscroll-x-contain overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[700px] table-fixed text-left text-xs">
                <thead className="border-b border-border bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Produk</th>
                    <th className="w-14 px-4 py-3 text-center font-medium">Qty</th>
                    <th className="w-32 px-4 py-3 text-right font-medium">Harga final</th>
                    <th className="w-36 px-4 py-3 text-right font-medium">Satuan terkecil</th>
                    <th className="w-32 px-4 py-3 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {offer.offer_items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {item.product_name_snapshot}
                        </p>
                        <p className="mt-0.5 text-slate-400">
                          {item.package_snapshot} · Diskon {item.discount_percentage}%
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatRupiah(item.final_unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatSmallestUnitPrice(item.package_snapshot, item.price_with_tax)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatRupiah(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 bg-white px-4 pb-5 pt-2 sm:px-6">
        <Button
          variant="ghost"
          className="text-red-600 hover:bg-red-50 hover:text-red-600"
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
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function formatSmallestUnitPrice(packageSnapshot: string, priceWithTax: number) {
  return getSnapshotSmallestUnitPrice(packageSnapshot, priceWithTax);
}
