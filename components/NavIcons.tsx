import type { SVGProps } from "react";

const c = "stroke-current stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]";

export function IconCockpit(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" className={c} />
      <rect x="13" y="3" width="8" height="5" rx="1.5" className={c} />
      <rect x="13" y="10" width="8" height="11" rx="1.5" className={c} />
      <rect x="3" y="13" width="8" height="8" rx="1.5" className={c} />
    </svg>
  );
}

export function IconWoche(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" className={c} />
      <path d="M8 3v4M16 3v4M4 10h16" className={c} />
    </svg>
  );
}

export function IconAkquise(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M4 11v4h3l4 4V7L7 11H4Z" className={c} />
      <path d="M16 9a5 5 0 0 1 0 6M14 7a8 8 0 0 1 0 10" className={c} />
    </svg>
  );
}

export function IconProjekte(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
        className={c}
      />
    </svg>
  );
}

export function IconTv(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect x="3" y="5" width="18" height="13" rx="2" className={c} />
      <path d="M8 21h8M12 18v3" className={c} />
    </svg>
  );
}

export function IconEinstellungen(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="3" className={c} />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        className={c}
      />
    </svg>
  );
}

export function IconSites(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" className={c} />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" className={c} />
    </svg>
  );
}

/** Saraci Desk — Heute */
export function IconHeute(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" className={c} />
      <path d="M12 7v5l3 3" className={c} />
    </svg>
  );
}

export function IconAufgaben(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
        className={c}
      />
    </svg>
  );
}

export function IconBriefing(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M5 6h.01M5 12h.01M5 18h.01" className={c} />
    </svg>
  );
}

export function IconReview(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        className={c}
      />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" className={c} />
    </svg>
  );
}

export function IconImportExport(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M12 15V3m0 0L8 7m4-4l4 4M12 21v-4m0 0l-4 4m4-4l4-4" className={c} />
    </svg>
  );
}
