"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Product, ProductFormValue } from "@/lib/types";
import {
  buildPackageDetail,
  formatIntegerInput,
  getPackageDetailParts,
} from "@/lib/utils";
import { Dialog, ModalContent } from "./ui/overlays";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const emptyForm: ProductFormValue = {
  name: "",
  composition: "",
  package_type: "Box",
  package_detail: "",
  hna: "",
  tax_percentage: "11",
};

function initialForm(product: Product | null): ProductFormValue {
  return product
    ? {
        name: product.name,
        composition: product.composition,
        package_type: product.package_type,
        package_detail: product.package_detail,
        hna: String(product.hna),
        tax_percentage: String(product.tax_percentage),
      }
    : { ...emptyForm };
}

export function ProductModal({
  open,
  product,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onSave: (value: ProductFormValue, product: Product | null) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductFormValue>(emptyForm);
  const [baseline, setBaseline] = useState<ProductFormValue>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [tubeUnit, setTubeUnit] = useState<"g" | "mg">("g");

  useEffect(() => {
    if (!open) return;
    const next = initialForm(product);
    setErrors({});
    setForm(next);
    setBaseline(next);
    const nextPackageDetail = getPackageDetailParts(
      next.package_type,
      next.package_detail,
    );
    setTubeUnit(nextPackageDetail.unit === "mg" ? "mg" : "g");
    setDiscardOpen(false);
  }, [open, product]);

  const isDirty = useMemo(
    () => open && JSON.stringify(form) !== JSON.stringify(baseline),
    [baseline, form, open],
  );

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  const update = (key: keyof ProductFormValue, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const packageDetail = getPackageDetailParts(
    form.package_type,
    form.package_detail,
  );

  const updatePackageAmount = (amount: string) => {
    const normalized = amount
      .replace(/[^\d.,]/g, "")
      .replace(",", ".")
      .replace(/^0+(?=\d)/, "");
    update(
      "package_detail",
      buildPackageDetail(
        form.package_type,
        normalized,
        tubeUnit,
      ),
    );
  };

  const updatePackageType = (packageType: string) => {
    setForm((current) => {
      const currentDetail = getPackageDetailParts(
        current.package_type,
        current.package_detail,
      );
      return {
        ...current,
        package_type: packageType,
        package_detail: buildPackageDetail(
          packageType,
          currentDetail.amount,
          tubeUnit,
        ),
      };
    });
  };

  const requestClose = () => {
    if (saving) return;
    if (isDirty) setDiscardOpen(true);
    else onOpenChange(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Nama produk wajib diisi.";
    if (!form.composition.trim()) nextErrors.composition = "Komposisi wajib diisi.";
    if (!form.package_type.trim()) nextErrors.package_type = "Jenis kemasan wajib diisi.";
    if (!packageDetail.amount || Number(packageDetail.amount) <= 0) {
      nextErrors.package_detail = "Jumlah satuan kemasan wajib diisi.";
    }
    if (!form.hna || Number(form.hna) <= 0) nextErrors.hna = "Masukkan HNA lebih dari Rp 0.";
    if (
      form.tax_percentage === "" ||
      Number(form.tax_percentage) < 0 ||
      Number(form.tax_percentage) > 100
    ) {
      nextErrors.tax_percentage = "PPN harus berada antara 0–100%.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const normalizedForm = {
        ...form,
        package_detail: buildPackageDetail(
          form.package_type,
          packageDetail.amount,
          tubeUnit,
        ),
      };
      await onSave(normalizedForm, product);
      setBaseline(normalizedForm);
      onOpenChange(false);
    } finally {
      setSaving(false);
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
        <ModalContent
          title={product ? "Edit produk" : "Tambah produk"}
          description="Lengkapi informasi produk yang akan ditawarkan."
          hideCloseButton
        >
          <form onSubmit={submit}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nama produk" htmlFor="product-name" error={errors.name}>
                  <Input
                    id="product-name"
                    placeholder="Contoh: Amlodipine 10 mg"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    aria-invalid={Boolean(errors.name)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Komposisi"
                  htmlFor="product-composition"
                  error={errors.composition}
                >
                  <Input
                    id="product-composition"
                    placeholder="Contoh: Amlodipine 10 mg / tablet"
                    value={form.composition}
                    onChange={(event) => update("composition", event.target.value)}
                    aria-invalid={Boolean(errors.composition)}
                  />
                </Field>
              </div>
              <Field
                label="Jenis kemasan"
                htmlFor="product-package-type"
                error={errors.package_type}
              >
                <Select
                  value={form.package_type}
                  onValueChange={updatePackageType}
                >
                  <SelectTrigger
                    id="product-package-type"
                    aria-invalid={Boolean(errors.package_type)}
                  >
                    <SelectValue placeholder="Pilih jenis kemasan" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Box",
                      "Botol",
                      "Tube",
                    ].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Detail kemasan"
                htmlFor="product-package-detail"
                error={errors.package_detail}
              >
                {form.package_type === "Tube" ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_88px]">
                    <Input
                      id="product-package-detail"
                      placeholder="0"
                      className="rounded-r-none"
                      inputMode="decimal"
                      value={packageDetail.amount}
                      onChange={(event) => updatePackageAmount(event.target.value)}
                      aria-invalid={Boolean(errors.package_detail)}
                    />
                    <Select
                      value={tubeUnit}
                      onValueChange={(unit) => {
                        const nextUnit = unit as "g" | "mg";
                        setTubeUnit(nextUnit);
                        update(
                          "package_detail",
                          buildPackageDetail(
                            form.package_type,
                            packageDetail.amount,
                            nextUnit,
                          ),
                        );
                      }}
                    >
                      <SelectTrigger
                        aria-label="Satuan tube"
                        className="rounded-l-none border-l-0 px-2"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="mg">mg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id="product-package-detail"
                      placeholder="0"
                      className="pr-20"
                      inputMode="decimal"
                      value={packageDetail.amount}
                      onChange={(event) => updatePackageAmount(event.target.value)}
                      aria-invalid={Boolean(errors.package_detail)}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      {form.package_type === "Box" ? "tablet" : "ml"}
                    </span>
                  </div>
                )}
              </Field>
              <Field label="HNA" htmlFor="product-hna" error={errors.hna}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    Rp
                  </span>
                  <Input
                    id="product-hna"
                    placeholder="0"
                    className="pl-9"
                    inputMode="numeric"
                    autoComplete="off"
                    value={formatIntegerInput(form.hna)}
                    onChange={(event) =>
                      update(
                        "hna",
                        event.target.value
                          .replace(/\D/g, "")
                          .replace(/^0+(?=\d)/, ""),
                      )
                    }
                    aria-invalid={Boolean(errors.hna)}
                  />
                </div>
              </Field>
              <Field label="PPN" htmlFor="product-tax" error={errors.tax_percentage}>
                <div className="relative">
                  <Input
                    id="product-tax"
                    placeholder="11"
                    className="pr-9"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.tax_percentage}
                    onChange={(event) => update("tax_percentage", event.target.value)}
                    aria-invalid={Boolean(errors.tax_percentage)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    %
                  </span>
                </div>
              </Field>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5">
              <Button type="button" variant="secondary" onClick={requestClose}>
                Batal
              </Button>
              <Button type="submit" loading={saving}>
                {product ? "Simpan perubahan" : "Tambah produk"}
              </Button>
            </div>
          </form>
        </ModalContent>
      </Dialog>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <ModalContent
          title="Keluar dari form?"
          description="Data yang sudah Anda isi belum tersimpan."
          variant="confirm"
          className="max-w-[420px]"
          hideCloseButton
        >
          <div className="px-5 py-4 text-sm leading-6 text-slate-600">
            Jika keluar sekarang, perubahan pada produk akan hilang.
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