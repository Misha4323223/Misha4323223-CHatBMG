import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

const BooomerangsLogo: React.FC<LogoProps> = ({ className = "", size = 200 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Circle */}
      <circle cx="100" cy="100" r="90" fill="white" stroke="#3B82F6" strokeWidth="4"/>
      
      {/* Boomerang Shapes */}
      <path 
        d="M50,55 C80,40 130,55 150,90 C130,65 90,65 65,85 C80,65 90,75 75,95 C60,115 40,90 50,55" 
        fill="#3B82F6" 
        stroke="#2563EB" 
        strokeWidth="2"
      />
      <path 
        d="M150,145 C120,160 70,145 50,110 C70,135 110,135 135,115 C120,135 110,125 125,105 C140,85 160,110 150,145" 
        fill="#4F46E5" 
        stroke="#4338CA" 
        strokeWidth="2"
      />
            
      {/* Text */}
      <text x="100" y="105" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" textAnchor="middle" fill="#1E40AF">BOOOMERANGS</text>
      <text x="100" y="125" fontFamily="Arial, sans-serif" fontSize="14" textAnchor="middle" fill="#3B82F6">AI</text>
    </svg>
  );
};

export default BooomerangsLogo;