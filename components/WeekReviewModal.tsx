"use client";

import { createPortal } from "react-dom";
import { WeekReviewPanel } from "@/components/WeekReviewPanel";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function WeekReviewModal({ open, onClose }: Props) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ui-modal-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ui-animate-modal w-[92vw] max-w-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <WeekReviewPanel
          clock={new Date()}
          showClose
          onClose={onClose}
        />
      </div>
    </div>,
    document.body
  );
}
