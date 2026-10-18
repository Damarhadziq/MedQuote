"use client";

import { useMemo, useRef, useState } from "react";
import { CopyPlus, Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { MedicationTemplate, Product } from "@/lib/types";
import { formatRupiah, uid } from "@/lib/utils";
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
  loading = false,
}: {
  templates: MedicationTemplate[];
  products: Product[];
  onSave: (template: MedicationTemplate) => void | Promise<void>;
  onDelete: (template: MedicationTemplate) => void | Promise<void>;
  loading?: boolean;
}) {
  const [editing, setEditing] = useState<MedicationTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MedicationTemplate | null>(null);
  const [viewingDetail, setViewingDetail] = useState<MedicationTemplate | null>(null);

  const lastEditingRef = useRef(editing);
  if (editing) lastEditingRef.current = editing;
  const displayEditing = editing || lastEditingRef.current;

  const lastDeleteRef = useRef(confirmDelete);
  if (confirmDelete) lastDeleteRef.current = confirmDelete;
  const displayDelete = confirmDelete || lastDeleteRef.current;

  const lastDetailRef = useRef(viewingDetail);
  if (viewingDetail) lastDetailRef.current = viewingDetail;
  const displayDetail = viewingDetail || lastDetailRef.current;

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
      <div className="mb-6 flex flex-row items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-[28px] font-semibold leading-tight sm:leading-10 text-slate-900">Template Obat</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500">{templates.length} template tersimpan</p>
        </div>
        <Button onClick={handleCreate} className="shrink-0 h-8 px-2.5 text-xs gap-1 sm:h-10 sm:px-4 sm:text-sm sm:gap-2">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Tambah template
        </Button>
      </div>

      {/* Card grid or Skeleton */}
      {loading ? (
        <TemplateSkeleton />
      ) : templates.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              products={products}
              onEdit={() => handleEdit(template)}
              onDelete={() => setConfirmDelete(template)}
              onViewDetail={() => setViewingDetail(template)}
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
            <Plus className="h-4 w-4" /> Tambah template
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
          {displayEditing && (
            <TemplateForm
              template={displayEditing}
              products={products}
              onClose={handleClose}
              onSave={handleSave}
            />
          )}
        </ModalContent>
      </Dialog>

      {/* Confirm Delete modal */}
      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <ModalContent
          title="Hapus template?"
          description="Tindakan ini tidak dapat dibatalkan."
          variant="confirm"
          className="max-w-[420px]"
          hideCloseButton
        >
          {displayDelete && (
            <>
              <div className="px-5 pb-4 pt-1 text-sm leading-6 text-slate-600">
                Template “{displayDelete.name}” akan dihapus secara permanen.
              </div>
              <div className="flex justify-end gap-2 px-5 pb-5">
                <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete(displayDelete);
                    setConfirmDelete(null);
                  }}
                >
                  Hapus
                </Button>
              </div>
            </>
          )}
        </ModalContent>
      </Dialog>
      {/* Detail modal */}
      <Dialog open={Boolean(viewingDetail)} onOpenChange={(open) => !open && setViewingDetail(null)}>
        <ModalContent
          title={displayDetail ? `Detail Template: ${displayDetail.name}` : "Detail template"}
          description={displayDetail ? `${displayDetail.items.length} produk tersimpan dalam template ini` : undefined}
          className="sm:max-w-[620px]"
          hideCloseButton
        >
          {displayDetail && (
            <TemplateDetailModal
              template={displayDetail}
              products={products}
              onClose={() => setViewingDetail(null)}
              onEdit={() => {
                const target = displayDetail;
                setViewingDetail(null);
                handleEdit(target);
              }}
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
  onViewDetail,
}: {
  template: MedicationTemplate;
  products: Product[];
  onEdit: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
}) {
  const selectedProducts = useMemo(
    () => products.filter((p) => template.items.includes(p.id)),
    [products, template.items],
  );

  return (
    <article
      onClick={onViewDetail}
      className="group flex flex-col rounded-xl border border-border bg-white p-4 sm:p-5 transition-all hover:border-primary/50 hover:shadow-xs cursor-pointer"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug group-hover:text-primary transition-colors">
          {template.name}
        </h3>
        <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-primary"
            aria-label={`Lihat detail ${template.name}`}
            title="Lihat detail"
            onClick={onViewDetail}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-primary"
            aria-label={`Edit ${template.name}`}
            title="Edit template"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600"
            aria-label={`Hapus ${template.name}`}
            title="Hapus template"
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
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-slate-500">
        <span>{template.items.length} produk dipilih</span>
        <span className="text-primary font-medium text-xs group-hover:underline inline-flex items-center gap-1">
          Lihat detail &rarr;
        </span>
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
      <div className="flex shrink-0 items-center justify-end gap-2 bg-white px-4 pb-5 pt-2 sm:px-6">
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

/* ── Detail Modal component ──────────────────────────────────── */

function TemplateDetailModal({
  template,
  products,
  onClose,
  onEdit,
}: {
  template: MedicationTemplate;
  products: Product[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const selectedProducts = useMemo(
    () => products.filter((p) => template.items.includes(p.id)),
    [products, template.items],
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border bg-slate-50/60 px-4 py-2 sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Daftar Obat dalam Template
        </span>
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
          {selectedProducts.length} produk
        </span>
      </div>

      <div className="mq-scrollbar max-h-[50vh] overflow-y-auto divide-y divide-border px-4 py-2 sm:px-6">
        {selectedProducts.length ? (
          selectedProducts.map((p, idx) => (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 py-3 first:pt-2 last:pb-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-xs font-semibold text-slate-400">
                    {idx + 1}.
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {p.name}
                  </span>
                  <PackageChip type={p.package_type} detail={p.package_detail} className="text-[10px] py-0 px-1.5" />
                </div>
                <p className="ml-7 text-xs text-slate-500 mt-0.5">
                  {p.composition} {p.package_detail && `• ${p.package_detail}`}
                </p>
              </div>
              <div className="ml-7 sm:ml-0 text-left sm:text-right shrink-0">
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  {formatRupiah(p.hna * (1 + p.tax_percentage / 100))}
                </span>
                <p className="text-[10px] text-slate-400">Termasuk PPN {p.tax_percentage}%</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">
            Tidak ada produk dalam template ini.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border bg-slate-50/40 px-4 py-3 sm:px-6">
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
        <Button
          onClick={() => {
            onClose();
            onEdit();
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit template
        </Button>
      </div>
    </div>
  );
}

export function TemplateSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col rounded-xl border border-border bg-white p-4 sm:p-5"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="h-5 w-36 animate-pulse rounded bg-slate-100" />
            <div className="flex gap-1">
              <div className="h-8 w-8 animate-pulse rounded bg-slate-100" />
              <div className="h-8 w-8 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <div className="h-5 w-24 animate-pulse rounded-md bg-slate-100" />
              <div className="h-5 w-32 animate-pulse rounded-md bg-slate-100" />
              <div className="h-5 w-20 animate-pulse rounded-md bg-slate-100" />
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-3 flex items-center justify-between">
            <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-3.5 w-16 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
