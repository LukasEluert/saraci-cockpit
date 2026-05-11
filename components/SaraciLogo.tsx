import Image from "next/image";

type Props = {
  height: 28 | 32 | 40;
  className?: string;
  priority?: boolean;
};

export function SaraciLogo({ height, className = "", priority }: Props) {
  const w = Math.round((height / 32) * 96);
  return (
    <Image
      src="/logo.png"
      alt=""
      width={w}
      height={height}
      priority={priority}
      className={`max-w-[min(42vw,9rem)] object-contain object-left md:max-w-[11rem] ${className}`}
      style={{ height, width: "auto" }}
      sizes={`${w}px`}
      draggable={false}
    />
  );
}
