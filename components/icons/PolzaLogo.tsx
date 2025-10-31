import React from 'react';

interface PolzaLogoProps {
  className?: string;
}

export const PolzaLogo: React.FC<PolzaLogoProps> = ({ className = "" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 130 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="polzaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="50%" stopColor="#5DADE2" />
          <stop offset="100%" stopColor="#85E3FF" />
        </linearGradient>
      </defs>
      
      {/* POLZA text */}
      <text 
        x="65" 
        y="30" 
        fontSize="28" 
        fontWeight="bold" 
        fill="url(#polzaGradient)"
        fontFamily="Arial, sans-serif"
        letterSpacing="2px"
        textAnchor="middle"
      >
        POLZA
      </text>
      
      {/* Underline */}
      <line 
        x1="10" 
        y1="35" 
        x2="120" 
        y2="35" 
        stroke="url(#polzaGradient)" 
        strokeWidth="1.5"
      />
      
      {/* agency text - centered relative to POLZA */}
      <text 
        x="65" 
        y="50" 
        fontSize="12" 
        fill="url(#polzaGradient)" 
        fontFamily="Arial, sans-serif"
        letterSpacing="2px"
        textAnchor="middle"
      >
        agency
      </text>
    </svg>
  );
};

export default PolzaLogo;