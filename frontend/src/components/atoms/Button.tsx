import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const variantClasses = {
  primary:
    "bg-[#274C3D] hover:bg-[#1E3B2F] text-white shadow-sm shadow-[#274C3D]/20 active:scale-95",
  secondary:
    "bg-white hover:bg-[#F2F7F4] text-[#274C3D] border border-[#D6E3DC] shadow-xs active:scale-95",
  danger:
    "bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-900/10 active:scale-95",
  outline:
    "border-2 border-[#274C3D] text-[#274C3D] hover:bg-[#EBF2EE] active:scale-95",
  ghost:
    "text-[#274C3D] hover:bg-[#EBF2EE] hover:text-[#1E3B2F] active:scale-95",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs font-semibold rounded-xl gap-1.5",
  md: "px-4.5 py-2.5 text-sm font-semibold rounded-2xl gap-2",
  lg: "px-6 py-3 text-base font-bold rounded-2xl gap-2.5",
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Procesando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
