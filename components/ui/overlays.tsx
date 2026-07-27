"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;

function useInitialFieldFocus() {
  const contentRef = React.useRef<HTMLDivElement>(null);

  const onOpenAutoFocus = React.useCallback((event: Event) => {
    event.preventDefault();
    window.requestAnimationFrame(() => {
      const firstField = contentRef.current?.querySelector<HTMLElement>(
        '[data-dialog-autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), button[role="combobox"]',
      );
      firstField?.focus({ preventScroll: true });
    });
  }, []);

  return { contentRef, onOpenAutoFocus };
}

export function ModalContent({
  children,
  className,
  title,
  description,
  variant = "default",
  hideCloseButton,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
  description?: string;
  variant?: "default" | "confirm";
  hideCloseButton?: boolean;
}) {
  const { contentRef, onOpenAutoFocus } = useInitialFieldFocus();

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "mq-overlay fixed inset-0",
          variant === "confirm"
            ? "z-[60] bg-slate-950/55"
            : "z-40 bg-slate-950/35",
        )}
      />
      <DialogPrimitive.Content
        ref={contentRef}
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(
          "mq-modal fixed left-1/2 top-1/2 max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-white focus:outline-none",
          variant === "confirm" ? "z-[70]" : "z-50",
          className,
        )}
      >
        <OverlayHeader title={title} description={description} hideCloseButton={hideCloseButton} />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DrawerContent({
  children,
  title,
  description,
  className,
  hideCloseButton,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
  hideCloseButton?: boolean;
}) {
  const { contentRef, onOpenAutoFocus } = useInitialFieldFocus();

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="mq-overlay fixed inset-0 z-40 bg-slate-950/35" />
      <DialogPrimitive.Content
        ref={contentRef}
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(
          "mq-drawer fixed inset-y-0 right-0 z-50 flex w-screen flex-col border-l border-border bg-white focus:outline-none sm:max-w-[580px]",
          className,
        )}
      >
        <OverlayHeader title={title} description={description} variant="drawer" hideCloseButton={hideCloseButton} />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function OverlayHeader({
  title,
  description,
  variant = "modal",
  hideCloseButton,
}: {
  title: string;
  description?: string;
  variant?: "modal" | "drawer";
  hideCloseButton?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 justify-between gap-4 px-4 sm:px-6 items-center",
        variant === "drawer" ? "py-5" : "py-4",
      )}
    >
      <div>
        <DialogPrimitive.Title
          className={cn(
            "font-semibold text-slate-900",
            variant === "drawer" ? "text-xl leading-7" : "text-xl leading-7",
          )}
        >
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-1 text-sm text-slate-500">
            {description}
          </DialogPrimitive.Description>
        ) : null}
      </div>
      {!hideCloseButton && (
        <DialogPrimitive.Close
          aria-label="Tutup"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          <X className="h-5 w-5" />
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

export function Tooltip({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-[70] rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-slate-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}