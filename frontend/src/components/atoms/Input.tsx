import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input: React.FC<InputProps> = ({ className = "", error, ...props }) => {
  return (
    <input
      className={`w-full px-3.5 py-2.5 bg-white border text-slate-800 placeholder-slate-400 text-sm rounded-xl transition-all duration-200 outline-none focus:ring-2 shadow-2xs ${
        error
          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
          : "border-[#D6E3DC] focus:border-[#274C3D] focus:ring-[#274C3D]/15"
      } ${className}`}
      {...props}
    />
  );
};

export default Input;
