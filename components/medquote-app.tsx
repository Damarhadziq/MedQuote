"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Check, ChevronLeft, ChevronRight, CircleUserRound, Clock3, CopyPlus, FilePlus, Info, LogOut, Menu, PackagePlus, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import type {
  AppUser,
  FixedInformation,
  ManagedUser,
  Offer,
  OfferDraft,
  OfferItem,
  Product,
  ProductFormValue,
  MedicationTemplate,
} from "@/lib/types";
import { demoOffers, demoProducts, demoTemplates } from "@/lib/demo-data";
import { createSecondaryClient, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { createOfferPdf } from "@/lib/pdf";
import {
  cn,
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
import { SuperadminPage } from "./superadmin-page";
import { ExtractedProductItem } from "./ai-product-import";
import { PackageChip } from "./package-chip";
import { FixedInfoModal } from "./fixed-info-modal";

const PRODUCT_STORE = "medquote-demo-products-v2";
const OFFER_STORE = "medquote-demo-offers";
const FIXED_INFO_STORE = "medquote-fixed-information";
const TEMPLATE_STORE = "medquote-templates";
const MANAGED_USERS_STORE = "medquote-managed-users";
const DEFAULT_MANAGED_USERS: ManagedUser[] = [
  {
    id: "usr-admin",
    name: "Superadmin",
    email: "admin@medikote.com",
    role: "superadmin",
    status: "active",
    territory: "Kantor Pusat",
    created_at: new Date().toISOString(),
    offers_count: 0,
  },
  {
    id: "usr-rosidah",
    name: "Rosidah",
    email: "rosidah@medikote.com",
    role: "detailer",
    status: "active",
    territory: "Area Lapangan 1",
    created_at: new Date().toISOString(),
    offers_count: 0,
  },
  {
    id: "usr-oky",
    name: "Oky",
    email: "oky@medikote.com",
    role: "detailer",
    status: "active",
    territory: "Area Lapangan 2",
    created_at: new Date().toISOString(),
    offers_count: 0,
  },
];
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
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<
    { type: "product"; item: Product } | { type: "offer"; item: Offer } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const lastConfirmRef = useRef(confirmTarget);
  if (confirmTarget) lastConfirmRef.current = confirmTarget;
  const displayConfirm = confirmTarget || lastConfirmRef.current;

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
          role: sessionUser.user_metadata?.role,
          user_metadata: sessionUser.user_metadata,
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
              role: sessionUser.user_metadata?.role,
              user_metadata: sessionUser.user_metadata,
            }
          : null,
      );
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Fitur Auto Logout (Auto-lock) jika tidak ada aktivitas pengguna (default 15 menit)
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 Menit
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        toast.info("Sesi Anda telah berakhir karena tidak ada aktivitas.");
        void handleLogout();
      }, INACTIVITY_LIMIT_MS);
    };

    // Dengarkan aktivitas pengguna (klik, pergerakan mouse, ketikan keyboard, scroll, touch)
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer(); // Mulai timer saat login / komponen di-mount

    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setOffers([]);
      setTemplates([]);
      setManagedUsers([]);
      setFixedInfo(DEFAULT_FIXED_INFO);
      return;
    }
    const metaFixed = user.user_metadata?.fixed_info as FixedInformation | undefined;
    if (metaFixed) {
      setFixedInfo(metaFixed);
    } else {
      setFixedInfo(
        readDemo<FixedInformation>(
          `${FIXED_INFO_STORE}-${user.id}`,
          DEFAULT_FIXED_INFO,
        ),
      );
    }
    // Template fallback jika belum ada data di Supabase
    if (!supabase) {
      setTemplates(
        readDemo<MedicationTemplate[]>(`${TEMPLATE_STORE}-${user.id}`, demoTemplates),
      );
    }
    void loadData(user);
  }, [user]);

  const loadData = async (activeUser: AppUser) => {
    setLoading(true);
    try {
      // 1. Muat pengguna terkelola (Managed Users) - Bersihkan akun demo lawas secara tuntas
      const isLegacyDemo = (email: string) => {
        const em = email.toLowerCase().trim();
        return (
          em.startsWith("budi") ||
          em.startsWith("siti") ||
          em.startsWith("anton") ||
          em.startsWith("rian") ||
          em.startsWith("demo")
        );
      };

      const localUsers = readDemo<ManagedUser[]>(MANAGED_USERS_STORE, DEFAULT_MANAGED_USERS);

      // Normalisasi email dan filter akun demo lawas
      const userMap = new Map<string, ManagedUser>();

      // Muat akun default resmi terlebih dahulu
      DEFAULT_MANAGED_USERS.forEach((u) => {
        userMap.set(u.email.toLowerCase(), u);
      });

      // Gabungkan akun lokal tersimpan (jika ada akun baru buatan Superadmin)
      localUsers
        .filter((u) => !isLegacyDemo(u.email))
        .forEach((u) => {
          const normEmail = u.email.replace(/@medquote\.com/gi, "@medikote.com").toLowerCase();
          if (!userMap.has(normEmail)) {
            userMap.set(normEmail, {
              ...u,
              name: u.name.replace(/medquote/gi, "Medikote"),
              email: normEmail,
            });
          }
        });

      if (supabase) {
        try {
          // Hapus akun demo lawas dari tabel profiles Supabase agar bersih
          await supabase
            .from("profiles")
            .delete()
            .or("email.ilike.budi%,email.ilike.siti%,email.ilike.anton%,email.ilike.rian%");

          const { data: profs, error: profError } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });
          if (!profError && profs && profs.length > 0) {
            profs
              .filter((p) => !isLegacyDemo(p.email))
              .forEach((p) => {
                const normEmail = p.email.replace(/@medquote\.com/gi, "@medikote.com").toLowerCase();
                const existing = userMap.get(normEmail);
                userMap.set(normEmail, {
                  ...(existing || {}),
                  ...p,
                  name: p.name.replace(/medquote/gi, "Medikote"),
                  email: normEmail,
                });
              });
          }
        } catch {
          // Abaikan jika tabel profiles belum dibuat di Supabase
        }
      }

      // Pastikan akun yang sedang aktif masuk ke daftar
      const activeNormEmail = activeUser.email.replace(/@medquote\.com/gi, "@medikote.com").toLowerCase();
      if (!userMap.has(activeNormEmail)) {
        const currentAsManaged: ManagedUser = {
          id: activeUser.id,
          name: (activeUser.name || activeUser.email.split("@")[0]).replace(/medquote/gi, "Medikote"),
          email: activeNormEmail,
          role:
            (activeUser.user_metadata?.role as any) ||
            (activeNormEmail.includes("admin") ? "superadmin" : "detailer"),
          status: "active",
          territory: "Pusat & Lapangan",
          created_at: new Date().toISOString(),
          offers_count: 0,
        };
        userMap.set(activeNormEmail, currentAsManaged);
      }

      let usersList = Array.from(userMap.values());
      writeDemo(MANAGED_USERS_STORE, usersList);
      setManagedUsers(usersList);

      if (!supabase) {
        const storedProducts = readDemo<Product[]>(PRODUCT_STORE, demoProducts);
        const storedOffers = readDemo<Offer[]>(OFFER_STORE, demoOffers);
        setProducts(storedProducts);
        setOffers(storedOffers);
        return;
      }

      const [productResult, offerResult, templateResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("offers")
          .select("*, offer_items(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("templates")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      if (productResult.error) throw productResult.error;
      if (offerResult.error) throw offerResult.error;
      if (templateResult.error) throw templateResult.error;
      setProducts((productResult.data || []) as Product[]);
      setOffers((offerResult.data || []) as unknown as Offer[]);
      setTemplates((templateResult.data || []) as MedicationTemplate[]);
    } catch (reason) {
      toast.error(messageFrom(reason, "Data belum dapat dimuat."));
    } finally {
      setLoading(false);
    }
  };

  const handleAddManagedUser = async (
    userData: Omit<ManagedUser, "id" | "created_at" | "offers_count">,
    password: string,
  ) => {
    const newId = uid();
    const createdDate = new Date().toISOString();
    const newUser: ManagedUser = {
      ...userData,
      id: newId,
      created_at: createdDate,
      offers_count: 0,
    };

    if (supabase) {
      try {
        const secondary = createSecondaryClient();
        if (secondary) {
          const { error: signUpError } = await secondary.auth.signUp({
            email: userData.email,
            password,
            options: {
              data: {
                name: userData.name,
                role: userData.role,
                status: userData.status,
                territory: userData.territory,
              },
            },
          });
          if (signUpError) {
            console.warn("Secondary auth signup note:", signUpError.message);
          }
        }
        // Simpan ke tabel profiles jika tabel tersedia
        await supabase.from("profiles").insert([
          {
            id: newId,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            status: userData.status,
            territory: userData.territory,
            phone: userData.phone,
          },
        ]);
      } catch (err) {
        console.warn("Profiles insert note:", err);
      }
    }

    setManagedUsers((prev) => {
      const next = [newUser, ...prev];
      writeDemo(MANAGED_USERS_STORE, next);
      return next;
    });

    toast.success(`Akun ${userData.name} (${userData.email}) berhasil dibuat!`);
  };

  const handleUpdateManagedUser = async (id: string, updates: Partial<ManagedUser>) => {
    if (supabase) {
      try {
        await supabase.from("profiles").update(updates).eq("id", id);
      } catch (err) {
        console.warn("Profiles update note:", err);
      }
    }

    setManagedUsers((prev) => {
      const next = prev.map((u) => (u.id === id ? { ...u, ...updates } : u));
      writeDemo(MANAGED_USERS_STORE, next);
      return next;
    });

    toast.success("Akun berhasil diperbarui.");
  };

  const handleDeleteManagedUser = async (id: string) => {
    if (supabase) {
      try {
        await supabase.from("profiles").delete().eq("id", id);
      } catch (err) {
        console.warn("Profiles delete note:", err);
      }
    }

    setManagedUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      writeDemo(MANAGED_USERS_STORE, next);
      return next;
    });

    toast.success("Akun pengguna berhasil dihapus.");
  };

  const handleLogin = async (email: string, password: string) => {
    const rawEmail = email.trim();
    // Normalisasi: jika user mengetik "rosidah", "oky", atau "admin", lengkapi domain @medikote.com
    let trimmedEmail = rawEmail.includes("@") ? rawEmail : `${rawEmail}@medikote.com`;
    // Dukung juga jika user masih mengetik @medquote.com
    trimmedEmail = trimmedEmail.replace(/@medquote\.com$/i, "@medikote.com");

    const localUsers = readDemo<ManagedUser[]>(MANAGED_USERS_STORE, DEFAULT_MANAGED_USERS);
    const matchedUser =
      localUsers.find(
        (u) =>
          u.email.toLowerCase() === trimmedEmail.toLowerCase() ||
          u.email.split("@")[0].toLowerCase() === trimmedEmail.split("@")[0].toLowerCase(),
      ) ||
      DEFAULT_MANAGED_USERS.find(
        (u) =>
          u.email.toLowerCase() === trimmedEmail.toLowerCase() ||
          u.email.split("@")[0].toLowerCase() === trimmedEmail.split("@")[0].toLowerCase(),
      );

    if (!supabase) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (matchedUser) {
        setUser({
          id: matchedUser.id,
          email: matchedUser.email,
          name: matchedUser.name,
          role: matchedUser.role,
          user_metadata: {
            name: matchedUser.name,
            role: matchedUser.role,
            territory: matchedUser.territory,
          },
        });
        return;
      }
      const isSuper = trimmedEmail.toLowerCase().includes("admin");
      const name = trimmedEmail.split("@")[0];
      setUser({
        id: `user-${name}`,
        email: trimmedEmail,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        role: isSuper ? "superadmin" : "detailer",
      });
      return;
    }

    let loginRes = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (loginRes.error) {
      if (matchedUser) {
        // Otomatis daftarkan akun lapangan ke Supabase Auth jika belum terdaftar
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              name: matchedUser.name,
              role: matchedUser.role,
              territory: matchedUser.territory,
            },
          },
        });
        if (!signUpErr && signUpData?.session?.user) {
          loginRes = { data: { user: signUpData.session.user, session: signUpData.session }, error: null };
        } else {
          // Fallback session langsung untuk akun resmi agar proses testing lapangan tidak terhambat
          setUser({
            id: matchedUser.id,
            email: matchedUser.email,
            name: matchedUser.name,
            role: matchedUser.role,
            user_metadata: {
              name: matchedUser.name,
              role: matchedUser.role,
              territory: matchedUser.territory,
            },
          });
          return;
        }
      }
    }

    if (loginRes.error) throw new Error(readableAuthError(loginRes.error.message));
    if (!loginRes.data.user?.email)
      throw new Error("Akun tidak memiliki alamat email yang valid.");

    const metaRole =
      matchedUser?.role ||
      (loginRes.data.user.user_metadata?.role as any) ||
      (trimmedEmail.toLowerCase().includes("admin") ? "superadmin" : "detailer");

    setUser({
      id: loginRes.data.user.id,
      email: loginRes.data.user.email,
      name: loginRes.data.user.user_metadata?.name || matchedUser?.name || trimmedEmail.split("@")[0],
      role: metaRole,
      user_metadata: loginRes.data.user.user_metadata,
    });
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  const saveFixedInfo = async (value: FixedInformation) => {
    if (!user) return;
    setFixedInfo(value);
    writeDemo(`${FIXED_INFO_STORE}-${user.id}`, value);
    if (supabase) {
      try {
        await supabase.auth.updateUser({
          data: { fixed_info: value },
        });
      } catch {
        // Abaikan jika offline / batasan jaringan
      }
    }
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

  const handleBatchSaveProducts = async (items: ExtractedProductItem[]) => {
    if (!user) return;
    const toUpdate = items.filter(
      (item) => item.matchedProductId && item.status === "price_changed",
    );
    const toInsert = items.filter(
      (item) => !item.matchedProductId || item.status === "new",
    );

    const now = new Date().toISOString();

    try {
      if (!supabase) {
        let updatedList = [...products];
        // 1. Update existing
        for (const item of toUpdate) {
          updatedList = updatedList.map((p) =>
            p.id === item.matchedProductId
              ? {
                  ...p,
                  hna: item.hna,
                  tax_percentage: item.tax_percentage,
                  package_type: item.package_type,
                  package_detail: item.package_detail,
                  updated_at: now,
                }
              : p,
          );
        }
        // 2. Insert new
        for (const item of toInsert) {
          const newP: Product = {
            id: uid(),
            user_id: user.id,
            name: item.name,
            composition: item.composition,
            package_type: item.package_type,
            package_detail: item.package_detail,
            hna: item.hna,
            tax_percentage: item.tax_percentage,
            created_at: now,
            updated_at: now,
          };
          updatedList.unshift(newP);
        }
        setProducts(updatedList);
        writeDemo(PRODUCT_STORE, updatedList);
      } else {
        // 1. Update existing in Supabase
        for (const item of toUpdate) {
          await supabase
            .from("products")
            .update({
              hna: item.hna,
              tax_percentage: item.tax_percentage,
              package_type: item.package_type,
              package_detail: item.package_detail,
              updated_at: now,
            })
            .eq("id", item.matchedProductId)
            .eq("user_id", user.id);
        }

        // 2. Insert new in Supabase
        if (toInsert.length > 0) {
          const newRows = toInsert.map((item) => ({
            user_id: user.id,
            name: item.name,
            composition: item.composition,
            package_type: item.package_type,
            package_detail: item.package_detail,
            hna: item.hna,
            tax_percentage: item.tax_percentage,
            created_at: now,
            updated_at: now,
          }));
          const { error: insErr } = await supabase.from("products").insert(newRows);
          if (insErr) throw insErr;
        }

        await loadData(user);
      }

      toast.success(
        `Berhasil menerapkan: ${toInsert.length} produk baru ditambahkan, ${toUpdate.length} harga produk diperbarui.`,
      );
    } catch (err) {
      toast.error(messageFrom(err, "Gagal menerapkan pembaruan produk."));
      throw err;
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

  const saveTemplate = async (template: MedicationTemplate) => {
    if (!user) return;
    const isExisting = templates.some((t) => t.id === template.id);
    try {
      if (!supabase) {
        const next = isExisting
          ? templates.map((t) => (t.id === template.id ? template : t))
          : [template, ...templates];
        setTemplates(next);
        writeDemo(`${TEMPLATE_STORE}-${user.id}`, next);
      } else if (isExisting) {
        const { data, error } = await supabase
          .from("templates")
          .update({ name: template.name, items: template.items })
          .eq("id", template.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        setTemplates((list) =>
          list.map((t) => (t.id === template.id ? (data as MedicationTemplate) : t)),
        );
      } else {
        const { data, error } = await supabase
          .from("templates")
          .insert({ name: template.name, items: template.items, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        setTemplates((list) => [data as MedicationTemplate, ...list]);
      }
      toast.success(isExisting ? "Template diperbarui." : "Template ditambahkan.");
    } catch (reason) {
      toast.error(messageFrom(reason, "Template belum dapat disimpan."));
      throw reason;
    }
  };

  const deleteTemplate = async (template: MedicationTemplate) => {
    if (!user) return;
    try {
      if (!supabase) {
        const next = templates.filter((t) => t.id !== template.id);
        setTemplates(next);
        writeDemo(`${TEMPLATE_STORE}-${user.id}`, next);
      } else {
        const { error } = await supabase
          .from("templates")
          .delete()
          .eq("id", template.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setTemplates((list) => list.filter((t) => t.id !== template.id));
      }
      toast.success("Template dihapus.");
    } catch (reason) {
      toast.error(messageFrom(reason, "Template belum dapat dihapus."));
    }
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

  const isSuperadmin =
    user.role === "superadmin" ||
    user.user_metadata?.role === "superadmin" ||
    user.email.toLowerCase() === "admin@medikote.com" ||
    user.email.toLowerCase() === "admin@medquote.com" ||
    user.email.toLowerCase().startsWith("admin@");

  // =========================================================================
  // TAMPILAN SUPERADMIN (MANDIRI & TANPA SIDEBAR)
  // =========================================================================
  if (isSuperadmin) {
    return (
      <div className="min-h-screen bg-slate-50/50 text-sm text-slate-800">
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            classNames: { toast: "mq-toast" },
            style: { boxShadow: "none", borderColor: "#ECECEC" },
          }}
        />
        {/* Top Header Bar Khusus Superadmin */}
        <header className="sticky top-0 z-30 border-b border-border bg-white shadow-xs">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <img
                src="/logo-medikote-full.png"
                alt="Medikote"
                className="h-7 w-auto object-contain"
              />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Superadmin
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200 text-xs text-slate-700">
                <CircleUserRound className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-slate-800">
                  {(user.name || "Superadmin").replace(/medquote/gi, "Medikote")}
                </span>
                <span className="hidden sm:inline text-slate-400">
                  ({user.email.replace(/@medquote\.com/gi, "@medikote.com")})
                </span>
              </div>
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 h-9 px-3 gap-2 text-xs sm:text-sm font-medium"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 text-red-600" />
                <span>Keluar</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Workspace Superadmin - Full Width Tanpa Sidebar */}
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <SuperadminPage
            user={user}
            products={products}
            offers={offers}
            managedUsers={managedUsers}
            onAddUser={handleAddManagedUser}
            onUpdateUser={handleUpdateManagedUser}
            onDeleteUser={handleDeleteManagedUser}
            loading={loading}
          />
        </main>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN TIM DETAILER (DILENGKAPI SIDEBAR ETALASE, TEMPLATE & RIWAYAT)
  // =========================================================================
  return (
    <div className="min-h-screen bg-white text-sm text-slate-800">
      <Toaster richColors position="top-right" toastOptions={{ classNames: { toast: "mq-toast" }, style: { boxShadow: "none", borderColor: "#ECECEC" } }} />
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border bg-white lg:flex">
          <div className="px-6 py-5 flex items-center">
            <img src="/logo-medikote-full.png" alt="Medikote" className="h-7 w-auto object-contain" />
          </div>
          <nav className="space-y-1 px-3" aria-label="Navigasi utama">
            <button type="button" className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${activeTab === "etalase" ? "bg-primary-soft text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} aria-current={activeTab === "etalase" ? "page" : undefined} onClick={() => setActiveTab("etalase")}><Boxes className="h-4 w-4" aria-hidden="true" />Etalase</button>
            <button type="button" className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${activeTab === "template" ? "bg-primary-soft text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} aria-current={activeTab === "template" ? "page" : undefined} onClick={() => setActiveTab("template")}><CopyPlus className="h-4 w-4" aria-hidden="true" />Template Obat</button>
            <button type="button" className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${activeTab === "history" ? "bg-primary-soft text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} aria-current={activeTab === "history" ? "page" : undefined} onClick={() => setActiveTab("history")}><Clock3 className="h-4 w-4" aria-hidden="true" />Riwayat</button>
            <button type="button" className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" onClick={() => setInfoOpen(true)}><Info className="h-4 w-4" aria-hidden="true" />Informasi tetap</button>
          </nav>
          <div className="mt-auto p-4">
            <div className="mb-2 flex min-w-0 items-center gap-3 px-2 py-2">
              <CircleUserRound className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {(user.name || user.email).replace(/medquote/gi, "Medikote")}
                </p>
                {user.name ? (
                  <p className="truncate text-xs text-slate-500">
                    {user.email.replace(/@medquote\.com/gi, "@medikote.com")}
                  </p>
                ) : null}
              </div>
            </div>
            <Button className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" variant="ghost" onClick={handleLogout}><LogOut className="h-4 w-4 text-red-600" aria-hidden="true" />Keluar</Button>
          </div>
        </aside>
        <div className="min-w-0 flex-1 pt-14 lg:pt-0">
          <div className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white px-4 lg:hidden">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <img src="/logo-medikote-full.png" alt="Medikote" className="h-5 w-auto object-contain shrink-0" />
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
              <span className="truncate text-slate-500 font-medium">
                {activeTab === "etalase"
                  ? "Etalase"
                  : activeTab === "template"
                    ? "Template Obat"
                    : "Riwayat"}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Buka menu navigasi"><Menu className="h-5 w-5" aria-hidden="true" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem onSelect={() => setActiveTab("etalase")}><Boxes className="mr-2 h-4 w-4" aria-hidden="true" />Etalase</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab("template")}><CopyPlus className="mr-2 h-4 w-4" aria-hidden="true" />Template Obat</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab("history")}><Clock3 className="mr-2 h-4 w-4" aria-hidden="true" />Riwayat</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setInfoOpen(true)}><Info className="mr-2 h-4 w-4" aria-hidden="true" />Informasi tetap</DropdownMenuItem>
                <DropdownMenuItem destructive onSelect={() => void handleLogout()}><LogOut className="mr-2 h-4 w-4 text-red-600" aria-hidden="true" />Keluar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {activeTab === "history" ? (
              <HistoryPage
                offers={offers}
                onDownload={downloadOffer}
                onDelete={(offer) => setConfirmTarget({ type: "offer", item: offer })}
                loading={loading}
              />
            ) : activeTab === "template" ? (
              <TemplatePage
                templates={templates}
                products={products}
                onSave={saveTemplate}
                onDelete={deleteTemplate}
                loading={loading}
              />
            ) : (
            <>
            <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
              <h1 className="text-xl sm:text-[28px] font-semibold leading-tight sm:leading-10 text-slate-900">Etalase produk</h1>
              <div className="flex items-center gap-2">
                {/* Mobile: 2 icon buttons aligned horizontally with the title */}
                <div className="flex items-center gap-1.5 sm:hidden">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label="Tambah produk"
                    title="Tambah produk"
                    onClick={() => { setEditingProduct(null); setProductModalOpen(true); }}
                  >
                    <PackagePlus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label="Tambah penawaran"
                    title="Tambah penawaran"
                    onClick={() => setOfferOpen(true)}
                    disabled={!products.length}
                  >
                    <FilePlus className="h-4 w-4" />
                  </Button>
                </div>
                {/* Desktop: Standard buttons with text */}
                <div className="hidden sm:flex sm:items-center sm:gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => { setEditingProduct(null); setProductModalOpen(true); }}
                  >
                    <PackagePlus className="h-4 w-4" />
                    Tambah produk
                  </Button>
                  <Button
                    onClick={() => setOfferOpen(true)}
                    disabled={!products.length}
                  >
                    <FilePlus className="h-4 w-4" />
                    Tambah penawaran
                  </Button>
                </div>
              </div>
            </div>
        <div className="mb-4 flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:max-w-[420px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Cari produk"
              className="pl-9 text-xs sm:text-sm"
              placeholder="Cari nama atau komposisi produk"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={packageFilter !== "Semua" ? "default" : "secondary"}
                size="icon"
                className="relative h-10 w-10 shrink-0"
                aria-label="Filter kemasan"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {packageFilter !== "Semua" && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 shadow-lg">
              {packageTypes.map((item) => {
                const isSelected = packageFilter === item;
                return (
                  <DropdownMenuItem
                    key={item}
                    onSelect={() => setPackageFilter(item)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-xs sm:text-sm font-medium cursor-pointer rounded-md transition-colors",
                      isSelected
                        ? "bg-primary-soft text-primary font-semibold"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span>{item === "Semua" ? "Semua kemasan" : item}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {packageFilter !== "Semua" && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              {packageFilter}
              <button
                type="button"
                onClick={() => setPackageFilter("Semua")}
                className="ml-0.5 hover:text-primary-hover"
                aria-label="Reset filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
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

        {!loading && filteredProducts.length > 0 && (
          <div className="mt-3.5 flex flex-col gap-2.5 sm:mt-4 sm:flex-row sm:items-center sm:justify-between px-1">
            <p className="text-xs text-slate-500">
              Menampilkan {pageStart + 1}–{Math.min(pageStart + productsPerPage, filteredProducts.length)} dari {filteredProducts.length} produk
            </p>
            <nav className="flex items-center gap-1 self-start sm:self-auto" aria-label="Navigasi halaman produk">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs sm:h-9 sm:px-3"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Sebelumnya</span>
              </Button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <Button
                  key={pageNumber}
                  variant={pageNumber === currentPage ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 min-w-8 p-0 text-xs sm:h-9 sm:min-w-9 sm:px-2"
                  aria-current={pageNumber === currentPage ? "page" : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs sm:h-9 sm:px-3"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={currentPage === pageCount}
                aria-label="Halaman berikutnya"
              >
                <span className="hidden sm:inline mr-1">Berikutnya</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        )}
            </>
            )}
          </main>
        </div>
      </div>
      <ProductModal
        open={productModalOpen}
        product={editingProduct}
        existingProducts={products}
        onOpenChange={setProductModalOpen}
        onSave={saveProduct}
        onBatchSave={handleBatchSaveProducts}
      />
      <OfferDrawer open={offerOpen} products={products} fixedInfo={fixedInfo} templates={templates} onOpenChange={setOfferOpen} onSave={saveOffer} />
      <FixedInfoModal
        open={infoOpen}
        value={fixedInfo}
        onOpenChange={setInfoOpen}
        onSave={saveFixedInfo}
      />
      <Dialog open={Boolean(confirmTarget)} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <ModalContent
          title={displayConfirm?.type === "product" ? "Hapus produk?" : "Hapus penawaran?"}
          description="Tindakan ini tidak dapat dibatalkan."
          variant="confirm"
          className="max-w-[440px]"
          hideCloseButton
        >
          {displayConfirm && (
            <>
              <div className="px-5 pb-4 pt-1 text-sm leading-6 text-slate-600">
                {displayConfirm.type === "product"
                  ? `Produk “${displayConfirm.item.name}” akan dihapus dari etalase. Riwayat penawaran yang sudah tersimpan tidak akan berubah.`
                  : `Penawaran ${displayConfirm.item.offer_number} untuk ${displayConfirm.item.recipient_name} akan dihapus permanen.`}
              </div>
              <div className="flex justify-end gap-2 px-5 pb-5">
                <Button variant="secondary" onClick={() => setConfirmTarget(null)}>
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  loading={deleting}
                  onClick={() => {
                    if (displayConfirm.type === "product") void deleteProduct(displayConfirm.item);
                    else if (displayConfirm.type === "offer") void deleteOffer(displayConfirm.item);
                  }}
                >
                  Hapus
                </Button>
              </div>
            </>
          )}
        </ModalContent>
      </Dialog>
    </div>
  );
}

function AppLoading() {
  return (
    <div className="flex min-h-screen bg-white" role="status" aria-label="Memuat Medikote">
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
      {/* Desktop / tablet table skeleton */}
      <div className="hidden sm:block min-w-[1180px] divide-y divide-border">
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
      {/* Mobile card/row skeleton */}
      <div className="sm:hidden divide-y divide-border">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
            <div className="flex justify-between items-center pt-1">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            </div>
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
