import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export const formatRupiah = (value: number) => rupiah.format(Math.round(value));

export const formatIntegerInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const safeFilePart = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "Penerima";

export type PackageDetailUnit = "tablet" | "ml" | "g" | "mg";

export function getBoxUnitCount(
  packageType: string,
  packageDetail?: string,
): number | null {
  if (!packageType || packageType.trim().toLowerCase() !== "box" || !packageDetail) return null;

  const values = packageDetail.match(/\d+(?:[.,]\d+)?/g)?.map((value) =>
    Number(value.replace(",", ".")),
  );
  if (!values?.length || values.some((value) => !Number.isFinite(value))) {
    return null;
  }

  const unitCount = values.reduce((total, value) => total * value, 1);
  return unitCount > 0 ? unitCount : null;
}

export function getBoxUnitPrice(
  packageType: string,
  packageDetail: string,
  packagePrice: number,
): number | null {
  const unitCount = getBoxUnitCount(packageType, packageDetail);
  return unitCount ? packagePrice / unitCount : null;
}

export function getSmallestUnitPrice(
  packageType: string,
  packageDetail: string,
  priceWithTax: number,
): number {
  return getBoxUnitPrice(packageType, packageDetail, priceWithTax) ?? priceWithTax;
}

export const getSmallestUnitHna = getSmallestUnitPrice;

export function getPackageDetailParts(
  packageType: string,
  packageDetail?: string,
): { amount: string; unit: PackageDetailUnit } {
  const type = packageType?.trim().toLowerCase() ?? "";
  const detail = packageDetail ?? "";
  const fallbackAmount =
    detail.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".") ?? "";
  const amount =
    type === "box"
      ? String(getBoxUnitCount(packageType, detail) ?? fallbackAmount)
      : fallbackAmount;

  if (type === "box") return { amount, unit: "tablet" };
  if (type === "botol") return { amount, unit: "ml" };
  return {
    amount,
    unit: /\bmg\b/i.test(detail) ? "mg" : "g",
  };
}

export function buildPackageDetail(
  packageType: string,
  amount: string,
  tubeUnit: "g" | "mg" = "g",
) {
  const type = packageType.trim().toLowerCase();
  const unit = type === "box" ? "tablet" : type === "botol" ? "ml" : tubeUnit;
  return amount ? `${amount} ${unit}` : "";
}

export function formatPackageDetailLabel(
  packageType: string,
  packageDetail?: string,
) {
  if (!packageDetail) return "";
  const { amount, unit } = getPackageDetailParts(packageType, packageDetail);
  return amount ? `${amount} ${unit}` : packageDetail;
}

function parsePackageSnapshot(packageSnapshot: string) {
  const normalizedSnapshot = packageSnapshot.replace(/\u00c2/g, "");
  const [packageType = "", ...detailParts] = normalizedSnapshot.split("\u00b7");
  return {
    packageType: packageType.replace(/[^a-zA-Z]/g, ""),
    packageDetail: detailParts.join("\u00b7").trim(),
  };
}

export function getSnapshotUnitPrice(
  packageSnapshot: string,
  packagePrice: number,
): number | null {
  const { packageType, packageDetail } = parsePackageSnapshot(packageSnapshot);
  return getBoxUnitPrice(packageType, packageDetail, packagePrice);
}

export function getSnapshotSmallestUnitPrice(
  packageSnapshot: string,
  priceWithTax: number,
): number {
  const { packageType, packageDetail } = parsePackageSnapshot(packageSnapshot);
  return getSmallestUnitPrice(packageType, packageDetail, priceWithTax);
}

export const getSnapshotSmallestUnitHna = getSnapshotSmallestUnitPrice;