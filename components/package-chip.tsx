import { cn, formatPackageDetailLabel } from "@/lib/utils";

const packageStyles: Record<string, string> = {
  box: "bg-blue-50 text-blue-700",
  botol: "bg-emerald-50 text-emerald-700",
  tube: "bg-amber-50 text-amber-700",
};

export function PackageChip({
  type,
  detail,
  className,
}: {
  type: string;
  detail: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        packageStyles[type.trim().toLowerCase()] ?? "bg-slate-100 text-slate-700",
        className,
      )}
    >
      <span>{type}</span>
      <span aria-hidden="true" className="opacity-45">
        &middot;
      </span>
      <span>{formatPackageDetailLabel(type, detail)}</span>
    </span>
  );
}
