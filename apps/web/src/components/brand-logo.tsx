import Image from "next/image";

export function BrandLogo() {
  return (
    <span className="brand-logo">
      <Image src="/logo.png" alt="Biling Media logo" width={768} height={768} priority />
    </span>
  );
}
