"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  FileClock,
  FilePlus2,
  LogOut,
  PackagePlus,
  Pill,
  Search,
  Trash2,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import type {
  AppUser,
  Offer,
  OfferDraft,
  OfferItem,
  Product,
  ProductFormValue,
} from "@/lib/types";
import { demoOffers, demoProducts } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { createOfferPdf } from "@/lib/pdf";
import { formatRupiah, uid } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/field";
import { Dialog, ModalContent, Tooltip } from "./ui/overlays";
import { LoginScreen } from "./login-screen";
import { ProductModal } from "./product-modal";
import { OfferDrawer } from "./offer-drawer";
import { HistoryDrawer } from "./history-drawer";

const PRODUCT_STORE = "medquote-demo-products";
const OFFER_STORE = "medquote-demo-offers";

export function MedQuoteApp() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [query, setQuery] = useState("");
  const [packageFilter, setPackageFilter] = useState("Semua");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<
    { type: "product"; item: Product } | { type: "offer"; item: Offer } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (sessionUser?.email) {
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.user_metadata?.name,
        });
      }
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      setUser(
        sessionUser?.email
          ? {
              id: sessionUser.id,
              email: sessionUser.email,
              name: sessionUser.user_metadata?.name,
            }
          : null,
      );
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setOffers([]);
      return;
    }
    void loadData(user);
  }, [user]);

  const loadData = async (activeUser: AppUser) => {
    setLoading(true);
    try {
      if (!supabase) {
        const storedProducts = readDemo<Product[]>(PRODUCT_STORE, demoProducts);
        const storedOffers = readDemo<Offer[]>(OFFER_STORE, demoOffers);
        setProducts(storedProducts);
        setOffers(storedOffers);
        return;
      }
      const [productResult, offerResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("user_id", activeUser.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("offers")
          .select("*, offer_items(*)")
          .eq("user_id", activeUser.id)
          .order("created_at", { ascending: false }),
      ]);
      if (productResult.error) throw productResult.error;
      if (offerResult.error) throw offerResult.error;
      setProducts((productResult.data || []) as Product[]);
      setOffers((offerResult.data || []) as unknown as Offer[]);
    } catch (reason) {
      toast.error(messageFrom(reason, "Data belum dapat dimuat."));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    if (!supabase) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setUser({ id: "demo-user", email, name: "Pengguna Demo" });
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(readableAuthError(error.message));
    if (!data.user.email)
      throw new Error("Akun tidak memiliki alamat email yang valid.");
    setUser({
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name,
    });
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  const saveProduct = async (
    value: ProductFormValue,
    currentProduct: Product | null,
  ) => {
    if (!user) return;
    const payload = {
      name: value.name.trim(),
      composition: value.composition.trim(),
      package_type: value.package_type.trim(),
      package_detail: value.package_detail.trim(),
      hna: Number(value.hna),
      tax_percentage: Number(value.tax_percentage),
      updated_at: new Date().toISOString(),
    };
    try {
      if (!supabase) {
        const next = currentProduct
          ? products.map((product) =>
              product.id === currentProduct.id
                ? { ...product, ...payload }
                : product,
            )
          : [
              {
                ...payload,
                id: uid(),
                user_id: user.id,
                created_at: new Date().toISOString(),
              },
              ...products,
            ];
        setProducts(next);
        writeDemo(PRODUCT_STORE, next);
      } else if (currentProduct) {
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", currentProduct.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        setProducts((list) =>
          list.map((product) =>
            product.id === currentProduct.id ? (data as Product) : product,
          ),
        );
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({ ...payload, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        setProducts((list) => [data as Product, ...list]);
      }
      toast.success(currentProduct ? "Produk diperbarui." : "Produk ditambahkan.");
    } catch (reason) {
      toast.error(messageFrom(reason, "Produk belum dapat disimpan."));
      throw reason;
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!user) return;
    setDeleting(true);
    try {
      if (!supabase) {
        const next = products.filter((item) => item.id !== product.id);
        setProducts(next);
        writeDemo(PRODUCT_STORE, next);
      } else {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", product.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setProducts((list) => list.filter((item) => item.id !== product.id));
      }
      toast.success("Produk dihapus.");
      setConfirmTarget(null);
    } catch (reason) {
      toast.error(messageFrom(reason, "Produk belum dapat dihapus."));
    } finally {
      setDeleting(false);
    }
  };

  const saveOffer = async (draft: OfferDraft, download: boolean) => {
    if (!user) return;
    const now = new Date().toISOString();
    const year = draft.offer_date.slice(0, 4);
    const sequence =
      Math.max(
        0,
        ...offers
          .filter((offer) => offer.offer_number.startsWith(`MQ-${year}-`))
          .map((offer) => Number(offer.offer_number.split("-").pop()) || 0),
      ) + 1;
    const offerNumber = `MQ-${year}-${String(sequence).padStart(4, "0")}`;

    const items = products
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
          id: uid(),
          offer_id: "",
          product_id: product.id,
          product_name_snapshot: product.name,
          composition_snapshot: product.composition,
          package_snapshot: `${product.package_type} Â· ${product.package_detail}`,
          quantity: selection.quantity,
          hna_snapshot: product.hna,
          tax_percentage: product.tax_percentage,
          price_with_tax: priceWithTax,
          discount_percentage: discount,
          final_unit_price: finalPrice,
          subtotal: finalPrice * selection.quantity,
        } satisfies OfferItem;
      });
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    const baseOffer: Offer = {
      id: uid(),
      user_id: user.id,
      offer_number: offerNumber,
      recipient_name: draft.recipient_name.trim(),
      institution: draft.institution.trim() || null,
      contact_person: draft.contact_person.trim() || null,
      contact_number: draft.contact_number.trim() || null,
      offer_date: draft.offer_date,
      valid_until: draft.valid_until || null,
      general_discount: draft.general_discount,
      discount_mode: draft.discount_mode,
      notes: draft.notes.trim() || null,
      payment_terms: draft.payment_terms.trim() || null,
      shipping_information: draft.shipping_information.trim() || null,
      additional_notes: draft.additional_notes.trim() || null,
      total,
      status: "Tersimpan",
      created_at: now,
      updated_at: now,
      offer_items: [],
    };

    try {
      let savedOffer: Offer;
      if (!supabase) {
        savedOffer = {
          ...baseOffer,
          offer_items: items.map((item) => ({
            ...item,
            offer_id: baseOffer.id,
          })),
        };
        const next = [savedOffer, ...offers];
        setOffers(next);
        writeDemo(OFFER_STORE, next);
      } else {
        const offerPayload = { ...baseOffer, id: undefined, offer_items: undefined };
        const { data: saved, error: offerError } = await supabase
          .from("offers")
          .insert(offerPayload)
          .select()
          .single();
        if (offerError) throw offerError;
        const itemPayload = items.map((item) => ({
          ...item,
          offer_id: saved.id,
        }));
        const { data: savedItems, error: itemError } = await supabase
          .from("offer_items")
          .insert(itemPayload)
          .select();
        if (itemError) {
          await supabase.from("offers").delete().eq("id", saved.id);
          throw itemError;
        }
        savedOffer = {
          ...(saved as Offer),
          offer_items: (savedItems || []) as OfferItem[],
        };
        setOffers((list) => [savedOffer, ...list]);
      }
      toast.success(`Penawaran ${savedOffer.offer_number} disimpan.`);
      if (download) {
        const { createOfferPdf } = await import("@/lib/pdf");
        createOfferPdf(savedOffer);
        toast.success("PDF penawaran selesai dibuat.");
      }
    } catch (reason) {
      toast.error(messageFrom(reason, "Penawaran belum dapat disimpan."));
      throw reason;
    }
  };

  const deleteOffer = async (offer: Offer) => {
    if (!user) return;
    setDeleting(true);
    try {
      if (!supabase) {
        const next = offers.filter((item) => item.id !== offer.id);
        setOffers(next);
        writeDemo(OFFER_STORE, next);
      } else {
        const { error } = await supabase
          .from("offers")
          .delete()
          .eq("id", offer.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setOffers((list) => list.filter((item) => item.id !== offer.id));
      }
      setConfirmTarget(null);
      toast.success("Penawaran dihapus.");
    } catch (reason) {
      toast.error(messageFrom(reason, "Penawaran belum dapat dihapus."));
    } finally {
      setDeleting(false);
    }
  };

  const downloadOffer = (offer: Offer) => {
    createOfferPdf(offer);
    toast.success("PDF penawaran selesai dibuat.");
  };

  const packageTypes = useMemo(
    () => [
      "Semua",
      ...Array.from(new Set(products.map((product) => product.package_type))).sort(),
    ],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter(
      (product) =>
        (packageFilter === "Semua" ||
          product.package_type === packageFilter) &&
        [product.name, product.composition, product.package_detail]
          .join(" ")
          .toLowerCase()
          .includes(needle),
    );
  }, [packageFilter, products, query]);

  if (authLoading) return <AppLoading />;
  if (!user)
    return <LoginScreen isDemo={!isSupabaseConfigured} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 text-sm text-slate-800">
      <Toaster richColors position="top-right" />
      <header className="h-16 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-800 text-white">
              <Pill className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-slate-900">MedQuote</span>
            {!isSupabaseConfigured ? (
              <span className="hidden rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 sm:inline-flex">
                Mode Demo
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-medium text-slate-700">
                {user.name || user.email}
              </p>
              {user.name ? (
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              ) : null}
            </div>
            <Tooltip label="Keluar">
              <Button
                aria-label="Keluar"
                size="icon"
                variant="ghost"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[23px] font-semibold leading-8 text-slate-900">
                Etalase Produk
              </h1>
              {!isSupabaseConfigured ? (
                <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 sm:hidden">
                  Mode Demo
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {products.length} produk tersedia untuk dibuatkan penawaran.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="secondary"
              className="col-span-1"
              onClick={() => setHistoryOpen(true)}
            >
              <FileClock className="h-4 w-4" />
              Riwayat
            </Button>
            <Button
              className="col-span-1"
              onClick={() => setOfferOpen(true)}
              disabled={!products.length}
            >
              <FilePlus2 className="h-4 w-4" />
              Tambah Penawaran
            </Button>
            <Button
              variant="secondary"
              className="col-span-2"
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
            >
              <PackagePlus className="h-4 w-4" />
              Tambah Produk
            </Button>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-[minmax(240px,1fr)_220px]">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Cari produk"
                className="pl-9"
                placeholder="Cari nama, komposisi, atau kemasan"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              aria-label="Filter kemasan"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
              value={packageFilter}
              onChange={(event) => setPackageFilter(event.target.value)}
            >
              {packageTypes.map((item) => (
                <option key={item} value={item}>
                  {item === "Semua" ? "Semua kemasan" : item}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <ProductSkeleton />
          ) : filteredProducts.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left">
                <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-16 px-4 py-3 text-center">No.</th>
                    <th className="min-w-48 px-4 py-3">Nama Produk</th>
                    <th className="min-w-72 px-4 py-3">Komposisi</th>
                    <th className="min-w-48 px-4 py-3">Kemasan</th>
                    <th className="min-w-36 px-4 py-3 text-right">HNA</th>
                    <th className="min-w-40 px-4 py-3 text-right">HNA + PPN</th>
                    <th className="w-28 px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className="min-h-[52px] transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-3.5 text-center text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        {product.name}
                      </td>
                      <td className="max-w-md px-4 py-3.5 leading-5 text-slate-600">
                        {product.composition}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-700">
                          {product.package_type}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {product.package_detail}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        {formatRupiah(product.hna)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-slate-900">
                        {formatRupiah(
                          product.hna * (1 + product.tax_percentage / 100),
                        )}
                        <p className="mt-0.5 text-[11px] font-normal text-slate-400">
                          PPN {product.tax_percentage}%
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-center gap-1">
                          <Tooltip label="Edit produk">
                            <Button
                              aria-label={`Edit ${product.name}`}
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingProduct(product);
                                setProductModalOpen(true);
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip label="Hapus produk">
                            <Button
                              aria-label={`Hapus ${product.name}`}
                              size="icon"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() =>
                                setConfirmTarget({ type: "product", item: product })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                <PackagePlus className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-semibold text-slate-800">
                {products.length ? "Produk tidak ditemukan" : "Belum ada produk"}
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {products.length
                  ? "Coba ubah kata pencarian atau filter kemasan."
                  : "Tambahkan produk pertama agar Anda dapat membuat penawaran."}
              </p>
              {!products.length ? (
                <Button
                  className="mt-4"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductModalOpen(true);
                  }}
                >
                  <PackagePlus className="h-4 w-4" />
                  Tambah Produk
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </main>

      <ProductModal
        open={productModalOpen}
        product={editingProduct}
        onOpenChange={setProductModalOpen}
        onSave={saveProduct}
      />
      <OfferDrawer
        open={offerOpen}
        products={products}
        onOpenChange={setOfferOpen}
        onSave={saveOffer}
      />
      <HistoryDrawer
        open={historyOpen}
        offers={offers}
        onOpenChange={setHistoryOpen}
        onDownload={downloadOffer}
        onDelete={(offer) => setConfirmTarget({ type: "offer", item: offer })}
      />
      <Dialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
      >
        <ModalContent
          title={
            confirmTarget?.type === "product"
              ? "Hapus produk?"
              : "Hapus penawaran?"
          }
          description="Tindakan ini tidak dapat dibatalkan."
          className="max-w-[440px]"
        >
          <div className="p-5">
            <p className="text-sm leading-6 text-slate-600">
              {confirmTarget?.type === "product"
                ? `Produk â€œ${confirmTarget.item.name}â€ akan dihapus dari etalase. Riwayat penawaran yang sudah tersimpan tidak akan berubah.`
                : `Penawaran ${confirmTarget?.item.offer_number} untuk ${confirmTarget?.item.recipient_name} akan dihapus permanen.`}
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <Button variant="secondary" onClick={() => setConfirmTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              loading={deleting}
              onClick={() => {
                if (confirmTarget?.type === "product")
                  void deleteProduct(confirmTarget.item);
                else if (confirmTarget?.type === "offer")
                  void deleteOffer(confirmTarget.item);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Hapus
            </Button>
          </div>
        </ModalContent>
      </Dialog>
    </div>
  );
}

function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-pulse rounded-md bg-teal-800" />
        <p className="mt-3 text-sm text-slate-500">Menyiapkan MedQuote...</p>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="grid min-h-[64px] grid-cols-[48px_1.2fr_2fr_1fr_1fr_1fr_80px] items-center gap-4 px-4"
        >
          {Array.from({ length: 7 }).map((__, cell) => (
            <div
              key={cell}
              className="h-3 animate-pulse rounded bg-slate-100"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function readDemo<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeDemo(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Demo tetap berfungsi selama sesi meski penyimpanan browser dibatasi.
  }
}

function readableAuthError(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes("invalid login"))
    return "Email atau password tidak sesuai.";
  if (lowered.includes("email not confirmed"))
    return "Email belum dikonfirmasi. Periksa kotak masuk Anda.";
  if (lowered.includes("rate limit"))
    return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  return "Tidak dapat masuk. Periksa email dan password Anda.";
}

function messageFrom(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}


