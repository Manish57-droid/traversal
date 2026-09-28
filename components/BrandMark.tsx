import Image from "next/image";
import Link from "next/link";

// The one place the logo mark + "traversal" wordmark pairing is
// assembled, so every navbar/sidebar across roles renders it
// identically instead of five near-duplicate copies drifting apart.
export default function BrandMark({
  href,
  showText = true,
  className = "",
}: {
  href: string;
  showText?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`flex items-center gap-2 font-display text-lg tracking-tight text-fg ${className}`}>
      <Image src="/logo-mark.png" alt="" width={28} height={28} className="rounded-full" priority />
      {showText && "traversal"}
    </Link>
  );
}
