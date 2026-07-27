"use client";

import { useMemo, useState } from "react";
import { CopyPlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { MedicationTemplate, Product } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Field, Input } from "./ui/field";
import { Dialog, ModalContent } from "./ui/overlays";
import { PackageChip } from "./package-chip";

export function TemplatePage({
  templates,
  products,
  onSave,
  onDelete,
}: {
  templates: MedicationTemplate[];
  products: Product[];
  onSave: (template: MedicationTemplate) => void | Promise<void>;
  onDelete: (template: MedicationTemplate) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState<MedicationTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleEdit = (template: MedicationTemplate) => {
    setEditing(template);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditing({ id: uid(), user_id: "", name: "", items: [], created_at: "" });
    setIsCreating(true);
  };

  const handleClose = () => {
    setEditing(null);
    setIsCreating(false);
  };

  const handleSave = (template: MedicationTemplate) => {
    onSave(template);
    setEditing(null);
    setIsCreating(false);
  };

  return (
    <>
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-10 text-slate-900">Template Obat</h1>
          <p className="mt-1 text-sm text-slate-500">{templates.length} template tersimpan</p>
        </div>
        <Button onClick={handleCreate} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Tambah template
        </Button>
      </div>

      {/* Card grid */}
      {templates.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              products={products}
              onEdit={() => handleEdit(template)}
              onDelete={() => onDelete(template)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-white px-5 py-20 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <CopyPlus className="h-6 w-6 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">Belum ada template</p>
          <p className="mt-1 text-sm text-slate-500">
            Buat template untuk mempercepat pembuatan penawaran.
          </p>
          <Button className="mt-4" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Tambah template
          </Button>
        </div>
      )}

      {/* Edit/Create modal */}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && handleClose()}>
        <ModalContent
          title={isCreating ? "Tambah template" : "Edit template"}
          className="sm:max-w-[560px]"
          hideCloseButton
        >
          {editing && (
            <TemplateForm
              template={editing}
              products={products}
              onClose={handleClose}
              onSave={handleSave}
            />
          )}
        </ModalContent>
      </Dialog>
    </>
  );
}

/* ── Card component ──────────────────────────────────────────── */

function TemplateCard({
  template,
  products,
  onEdit,
  onDelete,
}: {
  template: MedicationTemplate;
  products: Product[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const selectedProducts = useMemo(
    () => products.filter((p) => template.items.includes(p.id)),
    [products, template.items],
  );

  return (
    <article className="flex flex-col rounded-xl border border-border bg-white p-5 transition-colors hover:border-primary/40">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-900">{template.name}</p>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-primary"
            aria-label={`Edit ${template.name}`}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600"
            aria-label={`Hapus ${template.name}`}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Product chips */}
      <div className="flex-1">
        {selectedProducts.length ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedProducts.slice(0, 5).map((p) => (
              <span
                key={p.id}
                className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                {p.name}
              </span>
            ))}
            {selectedProducts.length > 5 && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                +{selectedProducts.length - 5} lainnya
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Belum ada produk</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="text-xs text-slate-500">{template.items.length} produk dipilih</p>
      </div>
    </article>
  );
}

/* ── Form (inside modal) ─────────────────────────────────────── */

function TemplateForm({
  template,
  products,
  onClose,
  onSave,
}: {
  template: MedicationTemplate;
  products: Product[];
  onClose: () => void;
  onSave: (template: MedicationTemplate) => void;
}) {
  const [name, setName] = useState(template.name);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(template.items),
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const filteredProducts = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return products.filter((p) =>
      [p.name, p.composition, p.package_type].join(" ").toLowerCase().includes(needle),
    );
  }, [products, query]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Nama template wajib diisi.");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Pilih minimal satu produk.");
      return;
    }
    setError("");
    onSave({ ...template, name: name.trim(), items: Array.from(selectedIds) });
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="space-y-6">
          {/* Name */}
          <Field
            label="Nama template"
            htmlFor="template-name"
            error={error === "Nama template wajib diisi." ? error : undefined}
          >
            <Input
              id="template-name"
              placeholder="Contoh: Dokter Gigi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={error === "Nama template wajib diisi."}
            />
          </Field>

          {/* Product search */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-900 block">
              Pilih produk
              <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                {selectedIds.size} dipilih
              </span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Cari produk"
                className="pl-9"
                placeholder="Cari produk berdasarkan nama atau komposisi"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="mq-scrollbar max-h-72 divide-y divide-[#f5f5f5] overflow-y-auto rounded-xl border border-border">
              {filteredProducts.length ? (
                filteredProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex min-h-[58px] cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={selectedIds.has(product.id)}
                      onCheckedChange={() => toggle(product.id)}
                      aria-label={`Pilih ${product.name}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-800">{product.name}</span>
                      <PackageChip type={product.package_type} detail={product.package_detail} className="mt-1" />
                    </span>
                  </label>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  Produk tidak ditemukan.
                </p>
              )}
            </div>

            {error === "Pilih minimal satu produk." && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex shrink-0 gap-2 border-t border-border bg-white px-4 py-4 sm:justify-end sm:px-6">
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button onClick={handleSave}>
          Simpan Template
        </Button>
      </div>
    </>
  );
}
