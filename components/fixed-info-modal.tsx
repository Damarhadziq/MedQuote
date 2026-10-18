"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { FixedInformation } from "@/lib/types";
import { Button } from "./ui/button";
import { Field, Input, Textarea } from "./ui/field";
import { Dialog, ModalContent } from "./ui/overlays";

export function FixedInfoModal({
  open,
  value,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  value: FixedInformation;
  onOpenChange: (open: boolean) => void;
  onSave: (value: FixedInformation) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setEditing(false);
    setErrors({});
    setDiscardOpen(false);
  }, [open, value]);

  const isDirty = useMemo(
    () => editing && JSON.stringify(draft) !== JSON.stringify(value),
    [draft, editing, value],
  );

  const requestClose = () => {
    if (isDirty) setDiscardOpen(true);
    else onOpenChange(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!draft.contact_person.trim()) {
      nextErrors.contact_person = "Contact person wajib diisi.";
    }
    if (!draft.contact_number.trim()) {
      nextErrors.contact_number = "Nomor kontak wajib diisi.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const normalized = {
      contact_person: draft.contact_person.trim(),
      contact_number: draft.contact_number.trim(),
      notes: draft.notes.trim(),
    };
    onSave(normalized);
    setDraft(normalized);
    setEditing(false);
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
          title="Informasi tetap"
          description="Informasi ini otomatis digunakan pada setiap penawaran."
          className="max-w-[460px]"
          hideCloseButton={editing}
        >
          {editing ? (
            <form onSubmit={submit}>
              <div className="grid gap-4 px-5 pb-5 pt-1.5 sm:grid-cols-2">
                <Field
                  label="Contact person"
                  htmlFor="fixed-contact-person"
                  error={errors.contact_person}
                >
                  <Input
                    id="fixed-contact-person"
                    placeholder="Contoh: Rosi"
                    value={draft.contact_person}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        contact_person: event.target.value,
                      }))
                    }
                    aria-invalid={Boolean(errors.contact_person)}
                  />
                </Field>
                <Field
                  label="Nomor kontak"
                  htmlFor="fixed-contact-number"
                  error={errors.contact_number}
                >
                  <Input
                    id="fixed-contact-number"
                    placeholder="Contoh: 08984000823"
                    inputMode="tel"
                    value={draft.contact_number}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        contact_number: event.target.value,
                      }))
                    }
                    aria-invalid={Boolean(errors.contact_number)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Catatan" htmlFor="fixed-notes" optional>
                    <Textarea
                      id="fixed-notes"
                      placeholder="Contoh: Harga dapat berubah sewaktu-waktu."
                      value={draft.notes}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-5 pb-5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setDraft(value);
                    setErrors({});
                    setEditing(false);
                  }}
                >
                  Batal
                </Button>
                <Button type="submit">Simpan perubahan</Button>
              </div>
            </form>
          ) : (
            <>
              <div className="px-5 pb-5">
                <dl className="grid gap-4 rounded-md bg-slate-50 p-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Contact person</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-800">
                      {value.contact_person}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Nomor kontak</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-800">
                      {value.contact_number}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-slate-500">Catatan</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {value.notes || "Tidak ada catatan."}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex justify-end px-5 pb-5">
                <Button onClick={() => setEditing(true)}>Edit informasi</Button>
              </div>
            </>
          )}
        </ModalContent>
      </Dialog>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <ModalContent
          title="Keluar dari form?"
          description="Perubahan informasi tetap belum disimpan."
          variant="confirm"
          className="max-w-[420px]"
          hideCloseButton
        >
          <div className="px-5 py-4 text-sm leading-6 text-slate-600">
            Jika keluar sekarang, perubahan yang Anda buat akan hilang.
          </div>
          <div className="flex flex-row items-center justify-end gap-2 px-5 pb-5">
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
