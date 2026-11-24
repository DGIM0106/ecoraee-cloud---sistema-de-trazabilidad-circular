import React from "react";

interface AvatarProps {
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs font-bold",
  md: "w-10 h-10 text-sm font-bold",
  lg: "w-13 h-13 text-base font-bold",
};

const getAvatarBg = (name: string) => {
  const colors = [
    "bg-[#274C3D] text-white",
    "bg-[#325A4A] text-white",
    "bg-[#3D6A57] text-white",
    "bg-[#2F5244] text-white",
    "bg-[#203F32] text-white",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

const Avatar: React.FC<AvatarProps> = ({
  name = "Usuario",
  size = "md",
  className = "",
}) => {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  return (
    <div
      className={`${sizeClasses[size]} rounded-2xl ${getAvatarBg(
        name
      )} flex items-center justify-center select-none shadow-sm ring-2 ring-[#EBF2EE] ${className}`}
    >
      {initial}
    </div>
  );
};

export default Avatar;
