import React from "react";

interface StarRatingProps {
  value: number;
  onChange: (val: number) => void;
  max?: number;
  size?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange, max = 10, size = "32px" }) => {
  return (
    <div className="flex gap-1" dir="ltr">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
          className="transition-transform duration-150 cursor-pointer"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            lineHeight: 1,
          }}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={star <= value ? "#FFD700" : "#444"}
            stroke={star <= value ? "#FFC000" : "#555"}
            strokeWidth="1"
            style={{
              filter: star <= value
                ? "drop-shadow(0 0 4px rgba(255, 215, 0, 0.7))"
                : "none",
              opacity: star <= value ? 1 : 0.3,
              transition: "all 0.15s ease",
            }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
};

export default StarRating;
