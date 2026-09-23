import { StarIcon } from "@/app/components/icons";
import { focusRing } from "@/app/components/styles";

type StarRatingProps = {
  value: number;
  onChange: (rating: number) => void;
};

export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div role="group" aria-label="Rating" className="mt-3.5 flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className={`cursor-pointer p-0.5 leading-none rounded ${focusRing}`}
        >
          <StarIcon className={n <= value ? "fill-hl-4 stroke-hl-4" : "fill-none stroke-muted"} />
        </button>
      ))}
    </div>
  );
}
