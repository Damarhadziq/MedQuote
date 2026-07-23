"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { id } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      locale={id}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn(defaults.root, "text-sm"),
        months: cn(defaults.months, "relative flex flex-col gap-4"),
        month: cn(defaults.month, "space-y-4"),
        month_caption: cn(
          defaults.month_caption,
          "flex h-9 items-center justify-center px-10",
        ),
        caption_label: cn(
          defaults.caption_label,
          "text-sm font-semibold text-slate-800",
        ),
        nav: cn(
          defaults.nav,
          "absolute inset-x-0 top-0 flex items-center justify-between",
        ),
        button_previous: cn(
          defaults.button_previous,
          "flex h-9 w-9 items-center justify-center rounded-md text-slate-500 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/20",
        ),
        button_next: cn(
          defaults.button_next,
          "flex h-9 w-9 items-center justify-center rounded-md text-slate-500 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/20",
        ),
        month_grid: cn(defaults.month_grid, "w-full border-collapse"),
        weekdays: cn(defaults.weekdays, "flex"),
        weekday: cn(
          defaults.weekday,
          "w-9 text-center text-xs font-medium text-slate-400",
        ),
        week: cn(defaults.week, "mt-1 flex w-full"),
        day: cn(defaults.day, "relative h-9 w-9 p-0 text-center"),
        day_button: cn(
          defaults.day_button,
          "flex h-9 w-9 items-center justify-center rounded-md font-medium text-slate-700 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/20",
        ),
        today: cn(defaults.today, "[&>button]:font-semibold [&>button]:text-primary"),
        selected: cn(
          defaults.selected,
          "[&>button]:bg-primary [&>button]:font-medium [&>button]:text-white [&>button]:hover:bg-primary-hover",
        ),
        outside: cn(
          defaults.outside,
          "[&>button]:text-slate-300 [&>button]:hover:bg-transparent",
        ),
        disabled: cn(defaults.disabled, "opacity-40"),
        hidden: cn(defaults.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", chevronClass)} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", chevronClass)} />
          ),
      }}
      {...props}
    />
  );
}
