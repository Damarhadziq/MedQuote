"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, ChevronRight, CircleUserRound, Clock3, CopyPlus, Info, LogOut, Menu, Search } from "lucide-react";
import { Toaster, toast } from "sonner";
import type {
  AppUser,
  FixedInformation,
  Offer,
  OfferDraft,
  OfferItem,
  Product,
  ProductFormValue,
  MedicationTemplate,
} from "@/lib/types";
import { demoOffers, demoProducts, demoTemplates } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { createOfferPdf } from "@/lib/pdf";
import {
  formatPackageDetailLabel,
  formatRupiah,
  getSmallestUnitPrice,
  uid,
} from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RowActions } from "./ui/row-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Dialog, ModalContent } from "./ui/overlays";
import { LoginScreen } from "./login-screen";
import { ProductModal } from "./product-modal";
import { OfferDrawer } from "./offer-drawer";
import { HistoryPage } from "./history-page";
import { TemplatePage } from "./template-page";
import { PackageChip } from "./package-chip";
import { FixedInfoModal } from "./fixed-info-modal";

const PRODUCT_STORE = "medquote-demo-products-v2";
const OFFER_STORE = "medquote-demo-offers";
const FIXED_INFO_STORE = "medquote-fixed-information";
const TEMPLATE_STORE = "medquote-templates";
const DEFAULT_FIXED_INFO: FixedInformation = {
  contact_person: "Rosi",
  contact_number: "08984000823",
  notes: "Harga tidak mengikat, sewaktu-waktu dapat berubah.",
};

export function MedQuoteApp() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [fixedInfo, setFixedInfo] = useState<FixedInformation>(DEFAULT_FIXED_INFO);
  const [query, setQuery] = useState("");
  const [packageFilter, setPackageFilter] = useState("Semua");
  const [page, setPage] = useState(1);
  const productsPerPage = 10;
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"etalase" | "history" | "template">("etalase");
  const [templates, setTemplates] = useState<MedicationTemplate[]>([]);
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
      setTemplates([]);
      setFixedInfo(DEFAULT_FIXED_INFO);
      return;
    }
    setFixedInfo(
      readDemo<FixedInformation>(
        `${FIXED_INFO_STORE}-${user.id}`,
        DEFAULT_FIXED_INFO,
      ),
    );
    setTemplates(
      readDemo<MedicationTemplate[]>(`${TEMPLATE_STORE}-${user.id}`, demoTemplates),
    );
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
      setUser({ id: "demo-user", email });
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

  const saveFixedInfo = (value: FixedInformation) => {
    if (!user) return;
    setFixedInfo(value);
    writeDemo(`${FIXED_INFO_STORE}-${user.id}`, value);
    toast.success("Informasi tetap diperbarui.");
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
        const discount = selection.discount;
        const finalPrice = priceWithTax * (1 - discount / 100);
        return {
          id: uid(),
          offer_id: "",
          product_id: product.id,
          product_name_snapshot: product.name,
          composition_snapshot: product.composition,
          package_snapshot: `${product.package_type} \u00b7 ${formatPackageDetailLabel(product.package_type, product.package_detail)}`,
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

  const saveTemplate = (template: MedicationTemplate) => {
    if (!user) return;
    const isExisting = templates.some((t) => t.id === template.id);
    const next = isExisting
      ? templates.map((t) => (t.id === template.id ? template : t))
      : [template, ...templates];
    setTemplates(next);
    writeDemo(`${TEMPLATE_STORE}-${user.id}`, next);
    toast.success(isExisting ? "Template diperbarui." : "Template ditambahkan.");
  };

  const deleteTemplate = (template: MedicationTemplate) => {
    if (!user) return;
    const next = templates.filter((t) => t.id !== template.id);
    setTemplates(next);
    writeDemo(`${TEMPLATE_STORE}-${user.id}`, next);
    toast.success("Template dihapus.");
  };

  const packageTypes = ["Semua", "Box", "Botol", "Tube"];

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

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * productsPerPage;
  const visibleProducts = filteredProducts.slice(
    pageStart,
    pageStart + productsPerPage,
  );

  useEffect(() => {
    setPage(1);
  }, [packageFilter, query]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  if (authLoading) return <AppLoading />;
  if (!user)
    return <LoginScreen isDemo={!isSupabaseConfigured} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-white text-sm text-slate-800">
      <Toaster richColors position="top-right" toastOptions={{ classNames: { toast: "mq-toast" }, style: { boxShadow: "none", borderColor: "#ECECEC" } }} />
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border bg-white lg:flex">
          <div className="px-6 py-6"><span className="text-xl font-semibold text-slate-900">MedQuote</span></div>
          <nav className="space-y-1 px-3" aria-label="Navigasi utama">
            <button type="button" className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${activeTab === "etalase" ? "bg-primary-soft text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} aria-current={activeTab === "etalase" ? "page" : undefined} onClick={() => setActiveTab("etalase")}><Boxes className="h-4 w-4" aria-hidden="true" />Etalase</button>
            <button type="button" className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${activeTab === "template" ? "bg-primary-soft text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} aria-current={activeTab === "template" ? "page" : undefined} onClick={() => setActiveTab("template")}><CopyPlus className="h-4 w-4" aria-hidden="true" />Template Obat</button>
            <button type="button" className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${activeTab === "history" ? "bg-primary-soft text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} aria-current={activeTab === "history" ? "page" : undefined} onClick={() => setActiveTab("history")}><Clock3 className="h-4 w-4" aria-hidden="true" />Riwayat</button>
            <button type="button" className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" onClick={() => setInfoOpen(true)}><Info className="h-4 w-4" aria-hidden="true" />Informasi tetap</button>
          </nav>
          <div className="mt-auto p-4">
            <div className="mb-2 flex min-w-0 items-center gap-3 px-2 py-2">
              <CircleUserRound className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{user.name || user.email}</p>{user.name ? <p className="truncate text-xs text-slate-500">{user.email}</p> : null}</div>
            </div>
            <Button className="w-full justify-start text-slate-600" variant="ghost" onClick={handleLogout}><LogOut className="h-4 w-4" aria-hidden="true" />Keluar</Button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
            <div className="flex min-w-0 items-center gap-2 text-sm"><span className="font-semibold text-slate-900">MedQuote</span><ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" /><span className="truncate text-slate-500">{activeTab === "etalase" ? "Etalase" : activeTab === "template" ? "Template Obat" : "Riwayat"}</span></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Buka menu navigasi"><Menu className="h-5 w-5" aria-hidden="true" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem onSelect={() => setActiveTab("etalase")}><Boxes className="mr-2 h-4 w-4" aria-hidden="true" />Etalase</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab("template")}><CopyPlus className="mr-2 h-4 w-4" aria-hidden="true" />Template Obat</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab("history")}><Clock3 className="mr-2 h-4 w-4" aria-hidden="true" />Riwayat</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setInfoOpen(true)}><Info className="mr-2 h-4 w-4" aria-hidden="true" />Informasi tetap</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleLogout()}><LogOut className="mr-2 h-4 w-4" aria-hidden="true" />Keluar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {activeTab === "history" ? (
              <HistoryPage
                offers={offers}
                onDownload={downloadOffer}
                onDelete={(offer) => setConfirmTarget({ type: "offer", item: offer })}
              />
            ) : activeTab === "template" ? (
              <TemplatePage
                templates={templates}
                products={products}
                onSave={saveTemplate}
                onDelete={deleteTemplate}
              />
            ) : (
            <>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-[28px] font-semibold leading-10 text-slate-900">Etalase produk</h1>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <Button variant="secondary" onClick={() => { setEditingProduct(null); setProductModalOpen(true); }}>Tambah produk</Button>
                <Button onClick={() => setOfferOpen(true)} disabled={!products.length}>Tambah penawaran</Button>
              </div>
            </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-[420px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Cari produk"
              className="pl-9"
              placeholder="Cari nama atau komposisi produk"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="w-full sm:ml-auto sm:w-[220px]">
            <Select value={packageFilter} onValueChange={setPackageFilter}>
            <SelectTrigger aria-label="Filter kemasan">
              <SelectValue placeholder="Semua kemasan" />
            </SelectTrigger>
            <SelectContent>
              {packageTypes.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "Semua" ? "Semua kemasan" : item}
                </SelectItem>
              ))}
            </SelectContent>
            </Select>
          </div>
        </div>
        <section className="overflow-hidden rounded-lg border border-border bg-white">
          {loading ? (
            <ProductSkeleton />
          ) : filteredProducts.length ? (
            <>
              <div className="mq-scrollbar overscroll-x-contain overflow-x-auto">
                <table className="w-full min-w-[1180px] table-fixed text-left">
                  <thead className="border-b-[0.5px] border-border bg-slate-50 text-xs font-medium text-slate-500">
                    <tr>
                      <th className="w-16 px-4 py-3 text-center">No.</th>
                      <th className="w-52 px-4 py-3">Nama produk</th>
                      <th className="w-[320px] px-4 py-3">Komposisi</th>
                      <th className="w-44 px-4 py-3">Kemasan</th>
                      <th className="w-36 px-4 py-3 text-right">HNA</th>
                      <th className="w-40 px-4 py-3 text-right">HNA + PPN</th>
                      <th className="w-44 px-4 py-3 text-right">Harga satuan terkecil</th>
                      <th className="w-24 px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[0.5px] divide-border">
                    {visibleProducts.map((product, index) => {
                      const priceWithTax = product.hna * (1 + product.tax_percentage / 100);
                      const smallestUnitPrice = getSmallestUnitPrice(
                        product.package_type,
                        product.package_detail,
                        priceWithTax,
                      );
                      return (
                        <tr
                          key={product.id}
                          className="min-h-[52px] align-middle transition-colors hover:bg-slate-50"
                        >
                          <td className="px-4 py-3.5 text-center text-slate-500">
                            {pageStart + index + 1}
                          </td>
                          <td className="break-words px-4 py-3.5 font-medium leading-5 text-slate-900">
                            {product.name}
                          </td>
                          <td className="break-words px-4 py-3.5 leading-5 text-slate-600">
                            {product.composition}
                          </td>
                          <td className="px-4 py-3.5">
                            <PackageChip
                              type={product.package_type}
                              detail={product.package_detail}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right">
                            {formatRupiah(product.hna)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-slate-900">
                            {formatRupiah(priceWithTax)}
                            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                              PPN {product.tax_percentage}%
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right">
                            <span className="font-medium text-slate-900">{formatRupiah(smallestUnitPrice)}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex justify-center">
                              <RowActions
                                label={`Aksi ${product.name}`}
                                primaryLabel="Edit produk"
                                onPrimary={() => {
                                  setEditingProduct(product);
                                  setProductModalOpen(true);
                                }}
                                onDelete={() => setConfirmTarget({ type: "product", item: product })}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t-[0.5px] border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Menampilkan {pageStart + 1}–{Math.min(pageStart + productsPerPage, filteredProducts.length)} dari {filteredProducts.length} produk
                </p>
                <nav className="flex flex-wrap items-center gap-1" aria-label="Navigasi halaman produk">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                  >
                    Sebelumnya
                  </Button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === currentPage ? "default" : "ghost"}
                      size="sm"
                      className="min-w-9 px-2"
                      aria-current={pageNumber === currentPage ? "page" : undefined}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    disabled={currentPage === pageCount}
                  >
                    Berikutnya
                  </Button>
                </nav>
              </div>
            </>
          ) : (
            <div className="px-5 py-16 text-center">
              <h2 className="font-semibold text-slate-800">
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
                  variant="secondary"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductModalOpen(true);
                  }}
                >
                  Tambah produk
                </Button>
              ) : null}
            </div>
          )}
        </section>
            </>
            )}
          </main>
        </div>
      </div>
      <ProductModal open={productModalOpen} product={editingProduct} onOpenChange={setProductModalOpen} onSave={saveProduct} />
      <OfferDrawer open={offerOpen} products={products} fixedInfo={fixedInfo} templates={templates} onOpenChange={setOfferOpen} onSave={saveOffer} />
      <FixedInfoModal
        open={infoOpen}
        value={fixedInfo}
        onOpenChange={setInfoOpen}
        onSave={saveFixedInfo}
      />
      <Dialog open={Boolean(confirmTarget)} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <ModalContent title={confirmTarget?.type === "product" ? "Hapus produk?" : "Hapus penawaran?"} description="Tindakan ini tidak dapat dibatalkan." variant="confirm" className="max-w-[440px]">
          <div className="px-5 pb-5 text-sm leading-6 text-slate-600">{confirmTarget?.type === "product" ? `Produk “${confirmTarget.item.name}” akan dihapus dari etalase. Riwayat penawaran yang sudah tersimpan tidak akan berubah.` : `Penawaran ${confirmTarget?.item.offer_number} untuk ${confirmTarget?.item.recipient_name} akan dihapus permanen.`}</div>
          <div className="flex justify-end gap-2 px-5 pb-5"><Button variant="secondary" onClick={() => setConfirmTarget(null)}>Batal</Button><Button variant="destructive" loading={deleting} onClick={() => { if (confirmTarget?.type === "product") void deleteProduct(confirmTarget.item); else if (confirmTarget?.type === "offer") void deleteOffer(confirmTarget.item); }}>Hapus</Button></div>
        </ModalContent>
      </Dialog>
    </div>
  );
}

function AppLoading() {
  return (
    <div className="flex min-h-screen bg-white" role="status" aria-label="Memuat MedQuote">
      <aside className="relative hidden h-screen w-[248px] shrink-0 border-r border-border p-4 lg:block">
        <div className="h-6 w-28 animate-pulse rounded bg-slate-100" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
        <div className="absolute bottom-6 h-16 w-[216px] animate-pulse rounded-md bg-slate-100" />
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center border-b border-border px-4 lg:hidden">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        </div>
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
            <div className="hidden gap-2 sm:flex">
              <div className="h-10 w-32 animate-pulse rounded-md bg-slate-100" />
              <div className="h-10 w-40 animate-pulse rounded-md bg-slate-100" />
            </div>
          </div>
          <div className="mb-4 flex gap-3">
            <div className="h-10 w-full max-w-[420px] animate-pulse rounded-md bg-slate-100" />
            <div className="ml-auto hidden h-10 w-[220px] animate-pulse rounded-md bg-slate-100 sm:block" />
          </div>
          <ProductSkeleton />
        </main>
      </div>
      <span className="sr-only">Memuat data aplikasi...</span>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden">
      <div className="min-w-[1180px] divide-y divide-border">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="grid min-h-[64px] grid-cols-[48px_1.2fr_2fr_1fr_1fr_1fr_1fr_80px] items-center gap-4 px-4"
          >
            {Array.from({ length: 8 }).map((__, cell) => (
              <div key={cell} className="h-3 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ))}
      </div>
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
