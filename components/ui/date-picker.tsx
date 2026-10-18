"use client";

import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const parseDate = (value?: string) =>
  value ? new Date(`${value}T00:00:00`) : undefined;

export function DatePicker({
  id: inputId,
  value,
  onChange,
  placeholder = "Pilih tanggal",
  min,
  invalid,
  ariaLabel,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const selected = parseDate(value);
  const minDate = parseDate(min);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={inputId}
          type="button"
          variant="secondary"
          aria-label={ariaLabel}
          aria-invalid={invalid}
          className={cn(
            "h-10 w-full justify-start border-border px-3 font-medium text-xs sm:text-sm data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/10",
            !selected && "text-placeholder",
            invalid && "border-red-500 focus-visible:ring-red-500/20",
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">
            {selected
              ? format(selected, "dd MMM yyyy", { locale: id })
              : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={16}>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected || minDate}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
        />
      </PopoverContent>
    </Popover>
  );
}
