"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Edit2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Filter,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";
import { AppUser, ManagedUser, Offer, Product, UserRole, UserStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";

interface SuperadminPageProps {
  user: AppUser;
  products: Product[];
  offers: Offer[];
  managedUsers: ManagedUser[];
  onAddUser: (
    userData: Omit<ManagedUser, "id" | "created_at" | "offers_count">,
    password: string,
  ) => Promise<void>;
  onUpdateUser: (id: string, updates: Partial<ManagedUser>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  loading?: boolean;
}

export function SuperadminPage({
  user,
  products,
  offers,
  managedUsers,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  loading = false,
}: SuperadminPageProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "users">("analytics");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("detailer");
  const [formStatus, setFormStatus] = useState<UserStatus>("active");
  const [formTerritory, setFormTerritory] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ==========================================
  // ANALYTICS CALCULATIONS
  // ==========================================
  const analytics = useMemo(() => {
    const totalOffers = offers.length;
    const totalRevenue = offers.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const avgTicket = totalOffers > 0 ? totalRevenue / totalOffers : 0;
    const activeDetailers = managedUsers.filter(
      (u) => u.status === "active" && u.role === "detailer",
    ).length;
    const totalProductsCount = products.length;

    // Monthly Quotation Distribution (last 6 months)
    const monthsMap: Record<string, { label: string; count: number; total: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short" });
      monthsMap[key] = { label, count: 0, total: 0 };
    }

    offers.forEach((o) => {
      const offerDate = new Date(o.offer_date || o.created_at);
      const key = `${offerDate.getFullYear()}-${String(offerDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthsMap[key]) {
        monthsMap[key].count += 1;
        monthsMap[key].total += Number(o.total) || 0;
      }
    });

    const monthlyTrends = Object.values(monthsMap);
    const maxMonthlyCount = Math.max(...monthlyTrends.map((m) => m.count), 1);

    // Status breakdown
    const statusCounts: Record<string, number> = {
      Tersimpan: 0,
      Terkirim: 0,
      Disetujui: 0,
      Negosiasi: 0,
    };
    offers.forEach((o) => {
      const st = o.status || "Tersimpan";
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    // Top Medications offered
    const medMap: Record<
      string,
      { name: string; package: string; count: number; totalQty: number; totalValue: number }
    > = {};

    offers.forEach((o) => {
      (o.offer_items || []).forEach((item) => {
        const key = item.product_name_snapshot || "Obat";
        if (!medMap[key]) {
          medMap[key] = {
            name: key,
            package: item.package_snapshot || "-",
            count: 0,
            totalQty: 0,
            totalValue: 0,
          };
        }
        medMap[key].count += 1;
        medMap[key].totalQty += item.quantity || 0;
        medMap[key].totalValue += Number(item.subtotal) || 0;
      });
    });

    const topMedications = Object.values(medMap)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);

    // Top Target Institutions
    const instMap: Record<string, { name: string; count: number; totalValue: number }> = {};
    offers.forEach((o) => {
      const target = o.institution || o.recipient_name || "Lainnya";
      if (!instMap[target]) {
        instMap[target] = { name: target, count: 0, totalValue: 0 };
      }
      instMap[target].count += 1;
      instMap[target].totalValue += Number(o.total) || 0;
    });

    const topInstitutions = Object.values(instMap)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    return {
      totalOffers,
      totalRevenue,
      avgTicket,
      activeDetailers,
      totalProductsCount,
      monthlyTrends,
      maxMonthlyCount,
      statusCounts,
      topMedications,
      topInstitutions,
    };
  }, [offers, products, managedUsers]);

  // ==========================================
  // FILTERED USERS
  // ==========================================
  const filteredUsers = useMemo(() => {
    return managedUsers.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.territory || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [managedUsers, searchQuery, roleFilter, statusFilter]);

  // Handlers
  const openAddModal = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("Medikote123!");
    setFormRole("detailer");
    setFormStatus("active");
    setFormTerritory("");
    setFormPhone("");
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const openEditModal = (target: ManagedUser) => {
    setEditingUser(target);
    setFormName(target.name);
    setFormEmail(target.email);
    setFormRole(target.role);
    setFormStatus(target.status);
    setFormTerritory(target.territory || "");
    setFormPhone(target.phone || "");
  };

  const handleSaveNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      toast.error("Nama, email, dan password wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await onAddUser(
        {
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          status: formStatus,
          territory: formTerritory.trim() || undefined,
          phone: formPhone.trim() || undefined,
        },
        formPassword,
      );
      setIsAddModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !formName.trim()) return;
    setSubmitting(true);
    try {
      await onUpdateUser(editingUser.id, {
        name: formName.trim(),
        role: formRole,
        status: formStatus,
        territory: formTerritory.trim() || undefined,
        phone: formPhone.trim() || undefined,
      });
      setEditingUser(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (target: ManagedUser) => {
    const nextStatus: UserStatus = target.status === "active" ? "inactive" : "active";
    await onUpdateUser(target.id, { status: nextStatus });
    toast.success(
      `Status akun ${target.name} diubah menjadi ${nextStatus === "active" ? "Aktif" : "Nonaktif"}.`,
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await onDeleteUser(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Superadmin Top Banner */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                Superadmin Workspace
              </span>
              <span className="text-xs text-slate-400">
                Akun: {(user.name || user.email).replace(/medquote/gi, "Medikote")}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Pusat Kendali & Analisis Bisnis
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Pantau performa penawaran obat, analisis nilai perolehan, serta kelola akun akses tim detailer dan manajer dalam satu halaman.
            </p>
          </div>

          {/* View Tab Switcher */}
          <div className="flex items-center rounded-lg bg-slate-800/80 p-1 border border-slate-700/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === "analytics"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Full Analisis
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === "users"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="h-4 w-4" />
              Manajemen Akun ({managedUsers.length})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FULL ANALYTICS                                                     */}
      {/* ========================================================================= */}
      {activeTab === "analytics" ? (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Card 1 */}
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-border bg-white p-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Gross Quotation</span>
                <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <CircleDollarSign className="h-4 w-4" />
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {formatCurrency(analytics.totalRevenue)}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                Total estimasi penawaran diajukan
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Total Dokumen</span>
                <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <FileText className="h-4 w-4" />
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {analytics.totalOffers} <span className="text-xs font-normal text-slate-500">berkas</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                Penawaran resmi terbuat
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Rata-rata Penawaran</span>
                <span className="rounded-lg bg-purple-50 p-2 text-purple-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {formatCurrency(analytics.avgTicket)}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                Rata-rata per dokumen (AOV)
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Detailer Aktif</span>
                <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
                  <UserCheck className="h-4 w-4" />
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {analytics.activeDetailers} <span className="text-xs font-normal text-slate-500">anggota</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                Dari total {managedUsers.length} akun terdaftar
              </p>
            </div>

            {/* Card 5 */}
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-border bg-white p-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Etalase Obat</span>
                <span className="rounded-lg bg-teal-50 p-2 text-teal-600">
                  <FileSpreadsheet className="h-4 w-4" />
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {analytics.totalProductsCount} <span className="text-xs font-normal text-slate-500">item</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                Varian sediaan siap tawar
              </p>
            </div>
          </div>

          {/* Charts & Breakdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Visual */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                    Tren Pembuatan Penawaran (6 Bulan Terakhir)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Aktivitas frekuensi dan volume penawaran obat
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Penawaran
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 pt-6 border-b border-slate-100">
                {analytics.monthlyTrends.map((trend, idx) => {
                  const heightPercent =
                    analytics.maxMonthlyCount > 0
                      ? Math.max(12, Math.round((trend.count / analytics.maxMonthlyCount) * 100))
                      : 12;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-slate-900 text-white rounded px-2 py-1 shadow pointer-events-none mb-1 text-center whitespace-nowrap">
                        <div className="font-semibold">{trend.count} berkas</div>
                        <div className="text-slate-300">{formatCurrency(trend.total)}</div>
                      </div>

                      <div
                        className="w-full max-w-[48px] bg-primary/20 group-hover:bg-primary transition-all rounded-t-md relative flex items-start justify-center pt-1"
                        style={{ height: `${heightPercent}%` }}
                      >
                        {trend.count > 0 && (
                          <span className="text-[10px] font-bold text-primary group-hover:text-white">
                            {trend.count}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium group-hover:text-slate-900">
                        {trend.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>Rata-rata bulanan: {(analytics.totalOffers / 6).toFixed(1)} penawaran</span>
                <span className="font-medium text-slate-700">Data otomatis terhubung Supabase</span>
              </div>
            </div>

            {/* Status & Distribution */}
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">
                  Status Penawaran
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Distribusi penawaran berdasarkan proses tindak lanjut
                </p>

                <div className="space-y-3">
                  {[
                    { label: "Tersimpan", color: "bg-slate-400", count: analytics.statusCounts["Tersimpan"] || 0 },
                    { label: "Terkirim", color: "bg-blue-500", count: analytics.statusCounts["Terkirim"] || 0 },
                    { label: "Disetujui", color: "bg-emerald-500", count: analytics.statusCounts["Disetujui"] || 0 },
                    { label: "Negosiasi", color: "bg-amber-500", count: analytics.statusCounts["Negosiasi"] || 0 },
                  ].map((st, idx) => {
                    const percentage =
                      analytics.totalOffers > 0
                        ? Math.round((st.count / analytics.totalOffers) * 100)
                        : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${st.color}`} />
                            {st.label}
                          </span>
                          <span className="text-slate-500">
                            {st.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${st.color} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total penawaran tercatat:</span>
                <span className="font-semibold text-slate-900">{analytics.totalOffers} dokumen</span>
              </div>
            </div>
          </div>

          {/* Top Products & Top Institutions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Medications */}
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                    Top 5 Obat Paling Banyak Ditawarkan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Berdasarkan kuantitas total penawaran harga
                  </p>
                </div>
                <span className="rounded bg-primary-soft text-primary px-2 py-0.5 text-xs font-medium">
                  Ranked
                </span>
              </div>

              {analytics.topMedications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada penawaran obat yang dibuat.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {analytics.topMedications.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-400 truncate">{item.package}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-slate-900">{item.totalQty} unit</p>
                        <p className="text-xs text-slate-500">{formatCurrency(item.totalValue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Institutions */}
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                    Top 5 Rumah Sakit / Instansi Tujuan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Berdasarkan akumulasi nilai nominal penawaran
                  </p>
                </div>
                <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-medium">
                  Institusi
                </span>
              </div>

              {analytics.topInstitutions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada instansi yang dicatat dalam penawaran.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {analytics.topInstitutions.map((inst, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <Building2 className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{inst.name}</p>
                          <p className="text-xs text-slate-400">{inst.count} penawaran diajukan</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(inst.totalValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 2: USER MANAGEMENT                                                    */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Action & Filter Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, email, atau wilayah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 rounded-lg border border-border bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Semua Role</option>
                <option value="superadmin">Superadmin</option>
                <option value="manager">Manajer Wilayah</option>
                <option value="detailer">Detailer Medis</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-border bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>

            <Button onClick={openAddModal} className="flex items-center gap-2 self-start sm:self-auto">
              <UserPlus className="h-4 w-4" />
              Tambah Pengguna Baru
            </Button>
          </div>

          {/* User Table (Desktop & Mobile) */}
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-5 py-3.5">Nama & Pengguna</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Wilayah Tugas</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Terdaftar</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Tidak ada akun pengguna yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((item) => {
                      const isCurrentUser = item.email === user.email;
                      const initial = (item.name || item.email)[0].toUpperCase();

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                {initial}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 truncate">
                                    {item.name.replace(/medquote/gi, "Medikote")}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                                      Akun Anda
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500 truncate block">
                                  {item.email.replace(/@medquote\.com/gi, "@medikote.com")}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                item.role === "superadmin"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : item.role === "manager"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {item.role === "superadmin" ? (
                                <Shield className="h-3 w-3" />
                              ) : (
                                <Users className="h-3 w-3" />
                              )}
                              {item.role === "superadmin"
                                ? "Superadmin"
                                : item.role === "manager"
                                  ? "Manajer"
                                  : "Detailer"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {item.territory ? (
                              <span className="flex items-center gap-1 text-xs">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {item.territory}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Pusat / Seluruh</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                item.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-600 border border-red-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  item.status === "active" ? "bg-emerald-500" : "bg-red-500"
                                }`}
                              />
                              {item.status === "active" ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">
                            {formatDate(item.created_at)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onSelect={() => openEditModal(item)}>
                                  <Pencil className="mr-2 h-4 w-4 text-slate-500" />
                                  Edit Akun
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleToggleStatus(item)}>
                                  {item.status === "active" ? (
                                    <>
                                      <UserX className="mr-2 h-4 w-4 text-amber-600" />
                                      Nonaktifkan
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4 text-emerald-600" />
                                      Aktifkan Akun
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {!isCurrentUser && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      destructive
                                      onSelect={() => setDeleteTarget(item)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                                      Hapus Akun
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  Tidak ada akun pengguna yang ditemukan.
                </div>
              ) : (
                filteredUsers.map((item) => {
                  const isCurrentUser = item.email === user.email;
                  const initial = (item.name || item.email)[0].toUpperCase();

                  return (
                    <div key={item.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900 text-sm truncate">
                                {item.name}
                              </span>
                              {isCurrentUser && (
                                <span className="rounded bg-blue-50 px-1 py-0.5 text-[9px] font-medium text-blue-700 border border-blue-200">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 truncate block">
                              {item.email}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${
                            item.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.status === "active" ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {item.status === "active" ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
                        <span className="capitalize font-medium text-slate-700">
                          Role: {item.role}
                        </span>
                        <span>{item.territory || "Pusat"}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          className="h-8 text-xs"
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleStatus(item)}
                          className="h-8 text-xs"
                        >
                          {item.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        {!isCurrentUser && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(item)}
                            className="h-8 text-xs px-2.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH PENGGUNA BARU                                              */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-primary-soft p-1.5 text-primary">
                  <UserPlus className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Tambah Akun Pengguna
                  </h3>
                  <p className="text-xs text-slate-500">
                    Akun baru otomatis terdaftar di Supabase Auth
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewUser} className="space-y-4">
              <Field label="Nama Lengkap" htmlFor="new-name">
                <Input
                  id="new-name"
                  placeholder="Contoh: Nama Detailer, S.Farm"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </Field>

              <Field label="Email Pengguna" htmlFor="new-email">
                <Input
                  id="new-email"
                  type="email"
                  placeholder="detailer@medikote.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </Field>

              <Field label="Password Awal" htmlFor="new-password">
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Peran / Role" htmlFor="new-role">
                  <select
                    id="new-role"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="detailer">Detailer Medis</option>
                    <option value="manager">Manajer Wilayah</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </Field>

                <Field label="Status Akun" htmlFor="new-status">
                  <select
                    id="new-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </Field>
              </div>

              <Field label="Wilayah / Area Cover (Opsional)" htmlFor="new-territory">
                <Input
                  id="new-territory"
                  placeholder="Contoh: DKI Jakarta & Tangerang"
                  value={formTerritory}
                  onChange={(e) => setFormTerritory(e.target.value)}
                />
              </Field>

              <Field label="No. Telepon / WhatsApp (Opsional)" htmlFor="new-phone">
                <Input
                  id="new-phone"
                  placeholder="Contoh: 08123456789"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button type="submit" loading={submitting}>
                  Simpan & Daftarkan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT PENGGUNA                                                      */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
                  <UserCog className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Edit Akun Pengguna
                  </h3>
                  <p className="text-xs text-slate-500">{editingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <Field label="Nama Lengkap" htmlFor="edit-name">
                <Input
                  id="edit-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Peran / Role" htmlFor="edit-role">
                  <select
                    id="edit-role"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="detailer">Detailer Medis</option>
                    <option value="manager">Manajer Wilayah</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </Field>

                <Field label="Status Akun" htmlFor="edit-status">
                  <select
                    id="edit-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </Field>
              </div>

              <Field label="Wilayah / Area Cover" htmlFor="edit-territory">
                <Input
                  id="edit-territory"
                  placeholder="Contoh: DKI Jakarta & Tangerang"
                  value={formTerritory}
                  onChange={(e) => setFormTerritory(e.target.value)}
                />
              </Field>

              <Field label="No. Telepon / WhatsApp" htmlFor="edit-phone">
                <Input
                  id="edit-phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingUser(null)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button type="submit" loading={submitting}>
                  Perbarui Akun
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS PENGGUNA                                          */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl border border-border bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <span className="rounded-full bg-red-50 p-2">
                <ShieldAlert className="h-6 w-6 text-red-600" />
              </span>
              <h3 className="text-base font-semibold text-slate-900">
                Hapus Akun Pengguna?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun{" "}
              <strong className="text-slate-900">{deleteTarget.name.replace(/medquote/gi, "Medikote")}</strong> (
              {deleteTarget.email.replace(/@medquote\.com/gi, "@medikote.com")})? Tindakan ini akan mencabut akses pengguna tersebut ke Medikote.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                loading={submitting}
              >
                Hapus Akun
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
