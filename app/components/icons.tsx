type IconProps = {
  className?: string;
};

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l2.6 6.7L21 11l-6.4 2.4L12 21l-2.6-7.6L3 11l6.4-2.3L12 2z" />
    </svg>
  );
}

export function ExportIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function ImportIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21V9" />
      <path d="M7 14l5-5 5 5" />
      <path d="M5 3h14" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="17"
      height="17"
      viewBox="0 0 24 24"
      strokeWidth={1.4}
      aria-hidden="true"
    >
      <path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.8l-6.1 3.2 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z" />
    </svg>
  );
}
