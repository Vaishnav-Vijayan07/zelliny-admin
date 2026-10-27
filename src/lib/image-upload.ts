import { useState, type DragEvent } from "react";

/** Every image upload offers two ways in: click to choose, or drop files dragged from a folder. */

export const isImageFile = (f: File) => f.type.startsWith("image/");
export const isMediaFile = (f: File) => f.type.startsWith("image/") || f.type.startsWith("video/");

export function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(f);
  });
}

/** Opens the system file chooser. */
export function chooseFiles(
  onFiles: (files: File[]) => void,
  opts: { multiple?: boolean; accept?: string } = {},
) {
  const el = document.createElement("input");
  el.type = "file";
  el.accept = opts.accept ?? "image/*";
  el.multiple = !!opts.multiple;
  el.onchange = () => {
    const files = [...(el.files ?? [])];
    if (files.length) onFiles(files);
  };
  el.click();
}

/** True while the user is dragging files (not an in-page element) over the target. */
const dragHasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes("Files");

export interface DropOpts {
  /** Accept several files at once; otherwise only the first one is used. */
  multiple?: boolean;
  /** Which dropped files count. Defaults to images. */
  accept?: (f: File) => boolean;
}

/**
 * Drop targets for files dragged from a folder. `bind(key, onFiles)` returns the props to spread on
 * a target; `over === key` while a file hovers it. In-page drags (re-ordering) are left alone.
 */
export function useFileDrop() {
  const [over, setOver] = useState<string | null>(null);
  const bind = (key: string, onFiles: (files: File[]) => void, opts: DropOpts = {}) => ({
    onDragEnter: (e: DragEvent) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      setOver(key);
    },
    onDragOver: (e: DragEvent) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setOver(key);
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
    },
    onDrop: (e: DragEvent) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      setOver(null);
      const ok = opts.accept ?? isImageFile;
      const files = [...e.dataTransfer.files].filter(ok);
      if (files.length) onFiles(opts.multiple ? files : files.slice(0, 1));
    },
  });
  return { over, bind };
}

/** Highlight classes for a target that a file is hovering. */
export const DROP_ON =
  "border-primary bg-hover outline-2 outline-dashed outline-offset-2 outline-primary";
