"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import type { Offer } from "@/lib/types";
import { formatDate, formatRupiah, getSnapshotSmallestUnitPrice } from "@/lib/utils";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/date-picker";
import { Input } from "./ui/field";
import { Dialog, DrawerContent } from "./ui/overlays";
import { RowActions } from "./ui/row-actions";

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
        title={selected ? "Detail penawaran" : "Riwayat penawaran"}
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
                    placeholder="Cari nama dokter atau nomor penawaran"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <DatePicker
                  id="history-date"
                  ariaLabel="Filter tanggal"
                  placeholder="Pilih tanggal"
                  value={date}
                  onChange={setDate}
                />
              </div>

              {filtered.length ? (
                <div className="divide-y divide-border rounded-md border border-border">
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
                            {offer.offer_number} · {formatDate(offer.offer_date)}
                          </p>
                        </div>

                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          {offer.offer_items.length} produk
                        </p>
                        <RowActions
                          label={`Aksi ${offer.offer_number}`}
                          primaryLabel="Lihat detail"
                          onPrimary={() => setSelected(offer)}
                          secondaryLabel="Unduh PDF"
                          onSecondary={() => onDownload(offer)}
                          onDelete={() => onDelete(offer)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border px-5 py-12 text-center">
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
          <section className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-2">
            <Detail label="Ditujukan kepada" value={offer.recipient_name} />
            <Detail label="Tanggal penawaran" value={formatDate(offer.offer_date)} />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Produk ditawarkan
            </h3>
            <div className="mq-scrollbar overscroll-x-contain overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[760px] table-fixed text-left text-xs">
                <thead className="bg-white text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Produk</th>
                    <th className="px-3 py-2.5 text-center font-medium">Qty</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Harga final
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Harga satuan terkecil
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {offer.offer_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800">
                          {item.product_name_snapshot}
                        </p>
                        <p className="mt-0.5 text-slate-500">
                          {item.package_snapshot} · Diskon{" "}
                          {item.discount_percentage}%
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center">{item.quantity}</td>
                      <td className="px-3 py-3 text-right">
                        {formatRupiah(item.final_unit_price)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatSmallestUnitPrice(item.package_snapshot, item.price_with_tax)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">
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

      <div className="flex shrink-0 gap-2 bg-white px-4 pb-4 sm:justify-end sm:px-6">
        <Button
          variant="secondary"
          className="text-red-600 hover:bg-red-50"
          onClick={onDelete}
        >
          Hapus
        </Button>
        <Button onClick={onDownload}>
          Unduh PDF
        </Button>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-700">
        {value}
      </p>
    </div>
  );
}


function formatSmallestUnitPrice(packageSnapshot: string, priceWithTax: number) {
  return formatRupiah(
    getSnapshotSmallestUnitPrice(packageSnapshot, priceWithTax),
  );
}
