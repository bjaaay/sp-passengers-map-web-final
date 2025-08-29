import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function PassengersMapLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 4.5V10l-2 1-2-1V4.5" />
      <path d="m10 4.5-5.42 2.71C4.23 7.42 4 7.91 4 8.44v9.06c0 .89 1.08 1.34 1.71.71L10 14" />
      <path d="m14 4.5 5.42 2.71c.36.21.58.58.58.98v9.06c0 .89-1.08 1.34-1.71.71L14 14" />
      <path d="M12 10v4" />
      <path d="M10 14h4" />
      <circle cx="12" cy="4.5" r="1.5" />
    </svg>
  );
}
