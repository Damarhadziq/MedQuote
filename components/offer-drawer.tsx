"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { FixedInformation, OfferDraft, Product } from "@/lib/types";
import { formatRupiah, getSmallestUnitPrice, todayIso } from "@/lib/utils";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { DatePicker } from "./ui/date-picker";
import { Field, Input } from "./ui/field";
import { Dialog, DrawerContent, ModalContent } from "./ui/overlays";
import { PackageChip } from "./package-chip";

const createEmptyDraft = (fixedInfo: FixedInformation): OfferDraft => ({
  recipient_name: "",
  institution: "",
  contact_person: fixedInfo.contact_person,
  contact_number: fixedInfo.contact_number,
  offer_date: todayIso(),
  valid_until: "",
  general_discount: 0,
  discount_mode: "per_product",
  notes: fixedInfo.notes,
  payment_terms: "",
  shipping_information: "",
  additional_notes: "",
  selected: {},
});

export function OfferDrawer({
  open,
  products,
  fixedInfo,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  products: Product[];
  fixedInfo: FixedInformation;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: OfferDraft, download: boolean) => Promise<void>;
}) {
  const [draft, setDraft] = useState<OfferDraft>(() => createEmptyDraft(fixedInfo));
  const [baseline, setBaseline] = useState<OfferDraft>(() => createEmptyDraft(fixedInfo));
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingAction, setSavingAction] = useState<"save" | "pdf" | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = createEmptyDraft(fixedInfo);
    setDraft(next);
    setBaseline(next);
    setQuery("");
    setErrors({});
    setSavingAction(null);
    setDiscardOpen(false);
  }, [fixedInfo, open]);

  const isDirty = useMemo(
    () =>
      open &&
      (draft.recipient_name !== baseline.recipient_name ||
        draft.offer_date !== baseline.offer_date ||
        JSON.stringify(draft.selected) !== JSON.stringify(baseline.selected)),
    [baseline, draft.offer_date, draft.recipient_name, draft.selected, open],
  );

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  const filteredProducts = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return products.filter((product) =>
      [product.name, product.composition, product.package_type]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [products, query]);

  const selectedLines = useMemo(
    () =>
      products
        .filter((product) => draft.selected[product.id])
        .map((product) => {
          const selection = draft.selected[product.id];
          const priceWithTax = product.hna * (1 + product.tax_percentage / 100);
          const discount = selection.discount;
          const finalPrice = priceWithTax * (1 - discount / 100);
          return {
            product,
            quantity: selection.quantity,
            discount,
            priceWithTax,
            finalPrice,
            smallestUnitPrice: getSmallestUnitPrice(
              product.package_type,
              product.package_detail,
              priceWithTax,
            ),
            subtotal: finalPrice * selection.quantity,
          };
        }),
    [draft.selected, products],
  );

  const setValue = <K extends keyof OfferDraft>(key: K, value: OfferDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const requestClose = () => {
    if (savingAction) return;
    if (isDirty) setDiscardOpen(true);
    else onOpenChange(false);
  };

  const toggleProduct = (productId: string) => {
    setDraft((current) => {
      const next = { ...current.selected };
      if (next[productId]) delete next[productId];
      else next[productId] = { quantity: 1, discount: 0 };
      return { ...current, selected: next };
    });
  };

  const updateSelection = (
    productId: string,
    key: "quantity" | "discount",
    value: number,
  ) => {
    const normalized =
      key === "quantity"
        ? Math.max(1, Math.floor(value || 1))
        : Math.min(100, Math.max(0, value || 0));
    setDraft((current) => ({
      ...current,
      selected: {
        ...current.selected,
        [productId]: { ...current.selected[productId], [key]: normalized },
      },
    }));
  };

  const save = async (download: boolean) => {
    const nextErrors: Record<string, string> = {};
    if (!draft.recipient_name.trim()) {
      nextErrors.recipient_name = "Nama penerima wajib diisi.";
    }
    if (!draft.offer_date) nextErrors.offer_date = "Tanggal penawaran wajib diisi.";
    if (!selectedLines.length) nextErrors.products = "Pilih minimal satu produk.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSavingAction(download ? "pdf" : "save");
    try {
      await onSave(draft, download);
      setBaseline(draft);
      onOpenChange(false);
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) onOpenChange(true);
          else requestClose();
        }}
      >
        <DrawerContent title="Tambah penawaran">
          <div className="mq-scrollbar min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-6 px-4 py-5 sm:px-6">
              <section className="space-y-4">
                <SectionTitle number="1" title="Informasi penerima" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Ditujukan kepada"
                    htmlFor="offer-recipient"
                    error={errors.recipient_name}
                  >
                    <Input
                      id="offer-recipient"
                      placeholder="Contoh: dr. Budi Santoso"
                      value={draft.recipient_name}
                      onChange={(event) => setValue("recipient_name", event.target.value)}
                      aria-invalid={Boolean(errors.recipient_name)}
                    />
                  </Field>
                  <Field
                    label="Tanggal penawaran"
                    htmlFor="offer-date"
                    error={errors.offer_date}
                  >
                    <DatePicker
                      id="offer-date"
                      value={draft.offer_date}
                      onChange={(value) => setValue("offer_date", value)}
                      ariaLabel="Tanggal penawaran"
                      invalid={Boolean(errors.offer_date)}
                    />
                  </Field>
                </div>
              </section>

              <section className="space-y-4">
                <SectionTitle number="2" title="Pilih produk" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    aria-label="Cari produk untuk penawaran"
                    className="pl-9"
                    placeholder="Cari produk berdasarkan nama atau komposisi"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <div className="mq-scrollbar max-h-64 divide-y divide-[#f5f5f5] overflow-y-auto rounded-md border border-border">
                  {filteredProducts.length ? (
                    filteredProducts.map((product) => {
                      const selected = Boolean(draft.selected[product.id]);
                      return (
                        <label
                          key={product.id}
                          className="flex min-h-[62px] cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-slate-50"
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleProduct(product.id)}
                            aria-label={`Pilih ${product.name}`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-slate-800">
                              {product.name}
                            </span>
                            <PackageChip
                              type={product.package_type}
                              detail={product.package_detail}
                              className="mt-1"
                            />
                          </span>
                          <span className="shrink-0 text-right text-sm font-medium text-slate-700">
                            {formatRupiah(
                              product.hna * (1 + product.tax_percentage / 100),
                            )}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">
                      Produk tidak ditemukan.
                    </p>
                  )}
                </div>
                {errors.products ? (
                  <p className="text-xs text-red-600">{errors.products}</p>
                ) : null}
              </section>

              <section className="space-y-4">
                <SectionTitle number="3" title="Pengaturan harga" />
                <p className="text-sm leading-5 text-slate-500">
                  Diskon diterapkan terpisah pada setiap produk.
                </p>

                {selectedLines.length ? (
                  <div className="mq-scrollbar overflow-x-auto overscroll-x-contain rounded-md border border-border">
                    <table className="w-full min-w-[900px] table-fixed text-left text-xs">
                      <thead className="border-b border-border bg-slate-50 text-slate-600">
                        <tr>
                          <th className="w-44 px-3 py-2.5 font-medium">Produk</th>
                          <th className="w-20 px-3 py-2.5 text-center font-medium">Jumlah</th>
                          <th className="w-28 px-3 py-2.5 text-right font-medium">HNA + PPN</th>
                          <th className="w-24 px-3 py-2.5 text-center font-medium">Diskon</th>
                          <th className="w-28 px-3 py-2.5 text-right font-medium">Harga final</th>
                          <th className="w-36 px-3 py-2.5 text-right font-medium">Harga satuan terkecil</th>
                          <th className="w-28 px-3 py-2.5 text-right font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f5f5f5]">
                        {selectedLines.map((line) => (
                          <tr key={line.product.id} className="align-middle">
                            <td className="px-3 py-3 font-medium leading-5 text-slate-800">
                              {line.product.name}
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                aria-label={`Jumlah ${line.product.name}`}
                                placeholder="1"
                                className="mx-auto h-9 w-16 px-2 text-center"
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={(event) =>
                                  updateSelection(
                                    line.product.id,
                                    "quantity",
                                    Number(event.target.value),
                                  )
                                }
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right">
                              {formatRupiah(line.priceWithTax)}
                            </td>
                            <td className="px-3 py-3">
                              <div className="relative mx-auto w-20">
                                <Input
                                  aria-label={`Diskon ${line.product.name}`}
                                  placeholder="0"
                                  className="h-9 pr-7 text-center"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={line.discount || ""}
                                  onChange={(event) =>
                                    updateSelection(
                                      line.product.id,
                                      "discount",
                                      event.target.value === ""
                                        ? 0
                                        : Number(event.target.value),
                                    )
                                  }
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                                  %
                                </span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right">
                              {formatRupiah(line.finalPrice)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right">
                              {formatRupiah(line.smallestUnitPrice)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">
                              {formatRupiah(line.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-slate-500">
                    Produk yang dipilih akan muncul di sini.
                  </div>
                )}
              </section>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex shrink-0 flex-col gap-2 border-t border-border bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              variant="secondary"
              onClick={() => save(false)}
              loading={savingAction === "save"}
              disabled={Boolean(savingAction)}
            >
              Simpan
            </Button>
            <Button
              onClick={() => save(true)}
              loading={savingAction === "pdf"}
              disabled={Boolean(savingAction)}
            >
              Simpan &amp; unduh PDF
            </Button>
          </div>
        </DrawerContent>
      </Dialog>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <ModalContent
          title="Keluar dari form?"
          description="Data yang sudah Anda isi belum tersimpan."
          variant="confirm"
          className="max-w-[420px]"
        >
          <div className="px-5 py-4 text-sm leading-6 text-slate-600">
            Jika keluar sekarang, penawaran yang sedang disusun akan hilang.
          </div>
          <div className="flex flex-col-reverse gap-2 px-5 pb-5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
              Kembali ke form
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDiscardOpen(false);
                onOpenChange(false);
              }}
            >
              Keluar tanpa menyimpan
            </Button>
          </div>
        </ModalContent>
      </Dialog>
    </>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
        {number}
      </span>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    </div>
  );
}