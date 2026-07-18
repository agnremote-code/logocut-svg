"use client";

import { ReactNode } from "react";

type UploaderTriggerProps = {
  children: ReactNode;
  className: string;
  sourcePage: string;
  cutType?: "single" | "multi";
  variant?: "button" | "link";
};

export function openUploader(sourcePage: string, cutType?: "single" | "multi") {
  window.dispatchEvent(
    new CustomEvent("logocut:open-uploader", {
      detail: { sourcePage, cutType },
    }),
  );
}

export function UploaderTrigger({
  children,
  className,
  sourcePage,
  cutType,
  variant = "button",
}: UploaderTriggerProps) {
  const handleClick = () => openUploader(sourcePage, cutType);

  if (variant === "link") {
    return (
      <button className={className} type="button" onClick={handleClick}>
        {children}
      </button>
    );
  }

  return (
    <button className={className} type="button" onClick={handleClick}>
      {children}
    </button>
  );
}
