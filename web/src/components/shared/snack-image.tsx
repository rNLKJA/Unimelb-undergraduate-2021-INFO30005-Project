import Image from "next/image";
import { cn } from "@/lib/utils";

/** Hand-drawn snack art from /public/images/snacks (SVG, served as-is). */
export function SnackImage({
  src,
  alt,
  size = 96,
  className,
  priority,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      priority={priority}
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}

export function avatarSrc(key: string | null | undefined): string {
  return `/images/snacks/${key || "flat-white"}.svg`;
}
