import type { SVGProps } from "react";

/**
 * The Snacks in a Van mark: a little tomato-red coffee van with a striped
 * awning over the serving hatch. Decorative unless a title is given.
 */
export function VanMark({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 64 46"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M41 13h9.5c2.7 0 5.1 1.6 6.1 4.1l3.6 8.4c.5 1.1.8 2.4.8 3.6V33a3 3 0 0 1-3 3H41z"
        fill="#e8462c"
      />
      <path d="M45 16.5h5.2c1.3 0 2.5.8 3 2l2.2 5.5H45z" fill="#fdf3e3" />
      <rect x="3" y="6" width="42" height="30" rx="7" fill="#e8462c" />
      <rect x="8" y="16" width="27" height="12" rx="2.5" fill="#241811" />
      <path d="M8 10.5h27v5.5H8z" fill="#fdf3e3" />
      <path d="M8 10.5h4.5v5.5H8zm9 0h4.5v5.5H17zm9 0h4.5v5.5H26z" fill="#c93720" />
      <path
        d="M8 16l2.25 2.5L12.5 16l2.25 2.5L17 16l2.25 2.5L21.5 16l2.25 2.5L26 16l2.25 2.5L30.5 16l2.25 2.5L35 16z"
        fill="#fdf3e3"
      />
      <path
        d="M17.5 21.5h7l-.8 4.2c-.2.9-1 1.5-1.9 1.5h-1.6c-.9 0-1.7-.6-1.9-1.5z"
        fill="#fdf3e3"
      />
      <path d="M24.3 22.4c1.6 0 2.2 1.6 1 2.6" stroke="#fdf3e3" strokeWidth="1" fill="none" />
      <circle cx="15" cy="36" r="6" fill="#241811" />
      <circle cx="15" cy="36" r="2.4" fill="#f0d3a8" />
      <circle cx="49" cy="36" r="6" fill="#241811" />
      <circle cx="49" cy="36" r="2.4" fill="#f0d3a8" />
    </svg>
  );
}
