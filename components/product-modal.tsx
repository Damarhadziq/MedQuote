"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Product, ProductFormValue } from "@/lib/types";
import { Dialog, ModalContent } from "./ui/overlays";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/field";

const emptyForm: ProductFormValue = {
  name: "",
  composition: "",
  package_type: "Box",
  package_detail: "",
  hna: "",
  tax_percentage: "11",
};

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      product
        ? {
            name: product.name,
            composition: product.composition,
            package_type: product.package_type,
            package_detail: product.package_detail,
            hna: String(product.hna),
            tax_percentage: String(product.tax_percentage),
          }
        : emptyForm,
    );
  }, [open, product]);

  const update = (key: keyof ProductFormValue, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Nama produk wajib diisi.";
    if (!form.composition.trim())
      nextErrors.composition = "Komposisi wajib diisi.";
    if (!form.package_type.trim())
      nextErrors.package_type = "Jenis kemasan wajib diisi.";
    if (!form.package_detail.trim())
      nextErrors.package_detail = "Detail kemasan wajib diisi.";
    if (!form.hna || Number(form.hna) <= 0)
      nextErrors.hna = "Masukkan HNA lebih dari Rp 0.";
    if (
      form.tax_percentage === "" ||
      Number(form.tax_percentage) < 0 ||
      Number(form.tax_percentage) > 100
    )
      nextErrors.tax_percentage = "PPN harus berada antara 0–100%.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      await onSave(form, product);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title={product ? "Edit Produk" : "Tambah Produk"}
        description="Lengkapi informasi produk yang akan ditawarkan."
      >
        <form onSubmit={submit}>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nama produk" htmlFor="product-name" error={errors.name}>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  autoFocus
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
              <Input
                id="product-package-type"
                list="package-types"
                value={form.package_type}
                onChange={(event) => update("package_type", event.target.value)}
                aria-invalid={Boolean(errors.package_type)}
              />
              <datalist id="package-types">
                <option value="Box" />
                <option value="Botol" />
                <option value="Tube" />
                <option value="Strip" />
                <option value="Lainnya" />
              </datalist>
            </Field>
            <Field
              label="Detail kemasan"
              htmlFor="product-package-detail"
              error={errors.package_detail}
            >
              <Input
                id="product-package-detail"
                placeholder="10 strip × 10 tablet"
                value={form.package_detail}
                onChange={(event) => update("package_detail", event.target.value)}
                aria-invalid={Boolean(errors.package_detail)}
              />
            </Field>
            <Field label="HNA" htmlFor="product-hna" error={errors.hna}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  Rp
                </span>
                <Input
                  id="product-hna"
                  className="pl-9"
                  type="number"
                  min="1"
                  step="1"
                  value={form.hna}
                  onChange={(event) => update("hna", event.target.value)}
                  aria-invalid={Boolean(errors.hna)}
                />
              </div>
            </Field>
            <Field
              label="PPN"
              htmlFor="product-tax"
              error={errors.tax_percentage}
            >
              <div className="relative">
                <Input
                  id="product-tax"
                  className="pr-9"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.tax_percentage}
                  onChange={(event) =>
                    update("tax_percentage", event.target.value)
                  }
                  aria-invalid={Boolean(errors.tax_percentage)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  %
                </span>
              </div>
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              {product ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Dialog>
  );
}
