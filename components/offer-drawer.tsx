"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import type { OfferDraft, Product } from "@/lib/types";
import { formatRupiah, todayIso } from "@/lib/utils";
import { Button } from "./ui/button";
import { Field, Input, Textarea } from "./ui/field";
import { Dialog, DrawerContent } from "./ui/overlays";

const createEmptyDraft = (): OfferDraft => ({
  recipient_name: "",
  institution: "",
  contact_person: "",
  contact_number: "",
  offer_date: todayIso(),
  valid_until: "",
  general_discount: 0,
  discount_mode: "general",
  notes: "",
  payment_terms: "",
  shipping_information: "",
  additional_notes: "",
  selected: {},
});

export function OfferDrawer({
  open,
  products,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  products: Product[];
  onOpenChange: (open: boolean) => void;
  onSave: (draft: OfferDraft, download: boolean) => Promise<void>;
}) {
  const [draft, setDraft] = useState<OfferDraft>(createEmptyDraft);
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingAction, setSavingAction] = useState<"save" | "pdf" | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(createEmptyDraft());
      setQuery("");
      setErrors({});
      setSavingAction(null);
    }
  }, [open]);

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
          const priceWithTax =
            product.hna * (1 + product.tax_percentage / 100);
          const discount =
            draft.discount_mode === "general"
              ? draft.general_discount
              : selection.discount;
          const finalPrice = priceWithTax * (1 - discount / 100);
          return {
            product,
            quantity: selection.quantity,
            discount,
            priceWithTax,
            finalPrice,
            subtotal: finalPrice * selection.quantity,
          };
        }),
    [draft.discount_mode, draft.general_discount, draft.selected, products],
  );

  const total = selectedLines.reduce((sum, line) => sum + line.subtotal, 0);

  const setValue = <K extends keyof OfferDraft>(
    key: K,
    value: OfferDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

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
        [productId]: {
          ...current.selected[productId],
          [key]: normalized,
        },
      },
    }));
  };

  const save = async (download: boolean) => {
    const nextErrors: Record<string, string> = {};
    if (!draft.recipient_name.trim())
      nextErrors.recipient_name = "Nama penerima wajib diisi.";
    if (!selectedLines.length)
      nextErrors.products = "Pilih minimal satu produk.";
    if (
      draft.valid_until &&
      new Date(draft.valid_until) < new Date(draft.offer_date)
    )
      nextErrors.valid_until =
        "Masa berlaku tidak boleh sebelum tanggal penawaran.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSavingAction(download ? "pdf" : "save");
    try {
      await onSave(draft, download);
      onOpenChange(false);
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title="Tambah Penawaran"
        description="Susun penawaran harga yang rapi dan siap dikirim."
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-7 px-4 py-5 sm:px-6">
            <section className="space-y-4">
              <SectionTitle number="1" title="Informasi penerima" />
              <Field
                label="Ditujukan kepada"
                htmlFor="offer-recipient"
                error={errors.recipient_name}
              >
                <Input
                  id="offer-recipient"
                  placeholder="dr. Budi Santoso"
                  value={draft.recipient_name}
                  onChange={(event) =>
                    setValue("recipient_name", event.target.value)
                  }
                  aria-invalid={Boolean(errors.recipient_name)}
                />
              </Field>
              <Field
                label="Instansi atau tempat praktik"
                htmlFor="offer-institution"
                optional
              >
                <Input
                  id="offer-institution"
                  value={draft.institution}
                  onChange={(event) =>
                    setValue("institution", event.target.value)
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Contact Person (CP)"
                  htmlFor="offer-cp"
                  optional
                >
                  <Input
                    id="offer-cp"
                    value={draft.contact_person}
                    onChange={(event) =>
                      setValue("contact_person", event.target.value)
                    }
                  />
                </Field>
                <Field label="Nomor kontak" htmlFor="offer-contact" optional>
                  <Input
                    id="offer-contact"
                    inputMode="tel"
                    value={draft.contact_number}
                    onChange={(event) =>
                      setValue("contact_number", event.target.value)
                    }
                  />
                </Field>
                <Field label="Tanggal penawaran" htmlFor="offer-date">
                  <Input
                    id="offer-date"
                    type="date"
                    value={draft.offer_date}
                    onChange={(event) =>
                      setValue("offer_date", event.target.value)
                    }
                  />
                </Field>
                <Field
                  label="Masa berlaku"
                  htmlFor="offer-valid-until"
                  error={errors.valid_until}
                  optional
                >
                  <Input
                    id="offer-valid-until"
                    type="date"
                    min={draft.offer_date}
                    value={draft.valid_until}
                    onChange={(event) =>
                      setValue("valid_until", event.target.value)
                    }
                    aria-invalid={Boolean(errors.valid_until)}
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
                  placeholder="Cari nama atau komposisi produk"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
                {filteredProducts.length ? (
                  filteredProducts.map((product) => {
                    const selected = Boolean(draft.selected[product.id]);
                    return (
                      <label
                        key={product.id}
                        className="flex min-h-[66px] cursor-pointer items-start gap-3 px-3 py-3 transition-colors hover:bg-slate-50"
                      >
                        <input
                          className="sr-only"
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleProduct(product.id)}
                        />
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            selected
                              ? "border-teal-700 bg-teal-700 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                          aria-hidden="true"
                        >
                          {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-slate-800">
                            {product.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {product.package_type} · {product.package_detail}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-sm font-medium text-slate-700">
                          {formatRupiah(
                            product.hna *
                              (1 + product.tax_percentage / 100),
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
              <div className="grid gap-2 sm:grid-cols-2">
                <DiscountMode
                  checked={draft.discount_mode === "general"}
                  label="Diskon umum"
                  description="Satu diskon untuk semua produk"
                  onChange={() => setValue("discount_mode", "general")}
                />
                <DiscountMode
                  checked={draft.discount_mode === "per_product"}
                  label="Per produk"
                  description="Atur diskon masing-masing produk"
                  onChange={() => setValue("discount_mode", "per_product")}
                />
              </div>
              {draft.discount_mode === "general" ? (
                <Field label="Diskon umum" htmlFor="general-discount">
                  <div className="relative w-full sm:w-40">
                    <Input
                      id="general-discount"
                      className="pr-9"
                      type="number"
                      min="0"
                      max="100"
                      value={draft.general_discount}
                      onChange={(event) =>
                        setValue(
                          "general_discount",
                          Math.min(100, Math.max(0, Number(event.target.value))),
                        )
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      %
                    </span>
                  </div>
                </Field>
              ) : null}

              {selectedLines.length ? (
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="min-w-[720px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Produk</th>
                        <th className="px-3 py-2.5 text-center font-medium">
                          Jumlah
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium">
                          HNA + PPN
                        </th>
                        <th className="px-3 py-2.5 text-center font-medium">
                          Diskon
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium">
                          Harga satuan
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedLines.map((line) => (
                        <tr key={line.product.id}>
                          <td className="max-w-40 px-3 py-3 font-medium text-slate-800">
                            {line.product.name}
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              aria-label={`Jumlah ${line.product.name}`}
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
                            {draft.discount_mode === "per_product" ? (
                              <div className="relative mx-auto w-20">
                                <Input
                                  aria-label={`Diskon ${line.product.name}`}
                                  className="h-9 pr-7 text-center"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={line.discount}
                                  onChange={(event) =>
                                    updateSelection(
                                      line.product.id,
                                      "discount",
                                      Number(event.target.value),
                                    )
                                  }
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                                  %
                                </span>
                              </div>
                            ) : (
                              <div className="text-center">{line.discount}%</div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right">
                            {formatRupiah(line.finalPrice)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">
                            {formatRupiah(line.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div className="flex items-center justify-between rounded-md bg-teal-50 px-4 py-3">
                <span className="text-sm font-medium text-teal-900">
                  Total penawaran
                </span>
                <span className="text-base font-semibold text-teal-900">
                  {formatRupiah(total)}
                </span>
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle number="4" title="Catatan" />
              <Field label="Catatan penawaran" htmlFor="offer-notes" optional>
                <Textarea
                  id="offer-notes"
                  value={draft.notes}
                  onChange={(event) => setValue("notes", event.target.value)}
                />
              </Field>
              <Field
                label="Ketentuan pembayaran"
                htmlFor="offer-payment"
                optional
              >
                <Textarea
                  id="offer-payment"
                  value={draft.payment_terms}
                  onChange={(event) =>
                    setValue("payment_terms", event.target.value)
                  }
                />
              </Field>
              <Field
                label="Informasi pengiriman"
                htmlFor="offer-shipping"
                optional
              >
                <Textarea
                  id="offer-shipping"
                  value={draft.shipping_information}
                  onChange={(event) =>
                    setValue("shipping_information", event.target.value)
                  }
                />
              </Field>
              <Field
                label="Catatan tambahan"
                htmlFor="offer-additional"
                optional
              >
                <Textarea
                  id="offer-additional"
                  value={draft.additional_notes}
                  onChange={(event) =>
                    setValue("additional_notes", event.target.value)
                  }
                />
              </Field>
            </section>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={Boolean(savingAction)}
          >
            Batal
          </Button>
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
            Simpan &amp; Unduh PDF
          </Button>
        </div>
      </DrawerContent>
    </Dialog>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800">
        {number}
      </span>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

function DiscountMode({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-md border p-3 transition-colors ${
        checked
          ? "border-teal-700 bg-teal-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <input
        className="sr-only"
        type="radio"
        name="discount-mode"
        checked={checked}
        onChange={onChange}
      />
      <span className="block text-sm font-medium text-slate-800">{label}</span>
      <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
    </label>
  );
}
