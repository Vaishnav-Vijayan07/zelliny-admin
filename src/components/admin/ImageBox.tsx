import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DROP_ON, chooseFiles, useFileDrop } from "@/lib/image-upload";

/** A box that takes an image two ways: click to choose a file, or drop one dragged from a folder. */
export function ImageBox({
  onFiles,
  multiple,
  className,
  style,
  children,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const { over, bind } = useFileDrop();
  return (
    <button
      type="button"
      onClick={() => chooseFiles(onFiles, { multiple: !!multiple })}
      {...bind("box", onFiles, { multiple: !!multiple })}
      className={cn(className, over && DROP_ON)}
      style={style}
    >
      {children}
    </button>
  );
}
