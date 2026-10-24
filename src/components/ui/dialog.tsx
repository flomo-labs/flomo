"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

// Arrastar a alça para baixo além deste limite fecha o sheet (#115).
const SHEET_DRAG_CLOSE_PX = 80;

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  const popupRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const dragStartY = React.useRef<number | null>(null);

  function onDragStart(event: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (popupRef.current) popupRef.current.style.transition = "none";
  }

  function onDragMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null || !popupRef.current) return;
    const dy = Math.max(0, event.clientY - dragStartY.current);
    popupRef.current.style.translate = `0 ${dy}px`;
  }

  function onDragEnd(event: React.PointerEvent<HTMLDivElement>) {
    const start = dragStartY.current;
    dragStartY.current = null;
    const popup = popupRef.current;
    if (start === null || !popup) return;
    popup.style.transition = "";
    if (event.clientY - start > SHEET_DRAG_CLOSE_PX) {
      closeRef.current?.click();
    } else {
      popup.style.translate = "";
    }
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={popupRef}
        data-slot="dialog-content"
        className={cn(
          // Celular (abaixo de sm): bottom sheet colado na base, largura
          // total, topo arredondado e área segura do iPhone. De sm para cima:
          // centralizado (#115). Altura limitada a `dvh` e rolagem própria, para
          // caber com o teclado aberto e no zoom de 200%.
          "fixed z-50 grid w-full gap-4 overflow-y-auto overscroll-contain bg-popover p-4 max-sm:max-h-[90dvh] sm:max-h-[calc(100dvh-2rem)] text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none max-sm:bottom-0 max-sm:left-0 max-sm:rounded-t-2xl max-sm:pt-6 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:data-open:animate-in max-sm:data-open:slide-in-from-bottom-full max-sm:data-closed:animate-out max-sm:data-closed:slide-out-to-bottom-full sm:top-1/2 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:data-open:animate-in sm:data-open:fade-in-0 sm:data-open:zoom-in-95 sm:data-closed:animate-out sm:data-closed:fade-out-0 sm:data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden
          data-slot="dialog-grabber"
          className="absolute inset-x-0 top-0 flex h-6 cursor-grab touch-none justify-center pt-2 sm:hidden"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <span className="h-1 w-9 rounded-full bg-muted-foreground/40" />
        </div>
        <DialogPrimitive.Close
          ref={closeRef}
          tabIndex={-1}
          aria-hidden
          className="hidden"
        />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2 rounded-full"
                size="icon-sm"
              />
            }
          >
            <Icon name="close" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 max-sm:-mb-[max(1rem,env(safe-area-inset-bottom))] max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:rounded-b-xl sm:p-3 sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
