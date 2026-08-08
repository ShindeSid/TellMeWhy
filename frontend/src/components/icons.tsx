import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function IconBadgeCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.5l2.4 1.4 2.7-.4 1.2 2.4 2.4 1.2-.4 2.7 1.4 2.4-1.4 2.4.4 2.7-2.4 1.2-1.2 2.4-2.7-.4L12 21.5l-2.4-1.4-2.7.4-1.2-2.4-2.4-1.2.4-2.7L2.3 12l1.4-2.4-.4-2.7 2.4-1.2 1.2-2.4 2.7.4L12 2.5z" />
      <path d="M9 12.2l2 2 4-4.4" />
    </svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}

export function IconHandshake(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12.5l4-4 3 2 3-2.5 3 1 3.5 3.5" />
      <path d="M6.5 8.5l4.5 4.5-2 2a1.6 1.6 0 01-2.3 0l-.2-.2a1.6 1.6 0 010-2.3" />
      <path d="M16 9.5l2-2 3.5 3.5-3.7 3.7a1.6 1.6 0 01-2.3 0 1.6 1.6 0 010-2.3" />
      <path d="M10.5 15.3l1 1a1.6 1.6 0 002.3 0" />
    </svg>
  );
}

export function IconZap(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12.5 2.5L4 14h6l-.5 7.5L20 10h-6l-1-7.5z" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7 3v5.5c0 4.6-3 8.3-7 9.5-4-1.2-7-4.9-7-9.5V6l7-3z" />
      <path d="M9 12l2 2 4-4.3" />
    </svg>
  );
}

export function IconSparkles(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 2.5l1.2 3.6 3.6 1.2-3.6 1.2L11 12.1l-1.2-3.6L6.2 7.3l3.6-1.2L11 2.5z" />
      <path d="M18.5 13l.8 2.3 2.3.8-2.3.8-.8 2.3-.8-2.3-2.3-.8 2.3-.8.8-2.3z" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 2.5h7l4 4V21a1 1 0 01-1 1H7a1 1 0 01-1-1V3.5a1 1 0 011-1z" />
      <path d="M14 2.5V7h4.5" />
    </svg>
  );
}

export function IconLink(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 14.5l5-5" />
      <path d="M11 6.5l1-1a3.5 3.5 0 015 5l-1.5 1.5" />
      <path d="M13 17.5l-1 1a3.5 3.5 0 01-5-5l1.5-1.5" />
    </svg>
  );
}

export function IconNote(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4h16v13l-4 4H4V4z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconLightbulb(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 00-3.5 10.9c.6.4.9 1 .9 1.7V16h5.2v-.4c0-.7.3-1.3.9-1.7A6 6 0 0012 3z" />
    </svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l8.5 4.5L12 12 3.5 7.5 12 3z" />
      <path d="M3.5 12l8.5 4.5 8.5-4.5M3.5 16.5L12 21l8.5-4.5" />
    </svg>
  );
}

export function IconGitBranch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="6" cy="5" r="2.2" />
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
      <path d="M6 7.2V16.8M6 7.2c0 4 4.5 4.8 10 4.8" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
    </svg>
  );
}

export function IconCompass(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
    </svg>
  );
}

export function IconBrain(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4.5a2.5 2.5 0 00-2.5 2.5v.3A2.7 2.7 0 004.5 10v1a2.7 2.7 0 001.3 2.3 2.7 2.7 0 001 4.5A2.5 2.5 0 009 20V4.5z" />
      <path d="M15 4.5a2.5 2.5 0 012.5 2.5v.3a2.7 2.7 0 012 2.7v1a2.7 2.7 0 01-1.3 2.3 2.7 2.7 0 01-1 4.5 2.5 2.5 0 01-2.2 2.2V4.5z" />
      <path d="M9 20V4.5M15 20V4.5" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20z" />
      <path d="M13.5 6.8L17.2 10.5" />
    </svg>
  );
}

export function IconQuote(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7.5 8.5c-2 0-3.5 1.5-3.5 3.8 0 2 1.4 3.7 3.3 3.7.2 2-1 3.5-3 4" />
      <path d="M16.5 8.5c-2 0-3.5 1.5-3.5 3.8 0 2 1.4 3.7 3.3 3.7.2 2-1 3.5-3 4" />
    </svg>
  );
}
