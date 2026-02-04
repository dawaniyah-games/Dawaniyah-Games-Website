import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 font-['Josefin_Sans'] uppercase tracking-wider";
    
    const variants = {
      primary: "bg-gradient-to-r from-[#2AA9DF] to-[#AE0CA7] text-white hover:opacity-90 shadow-[0_0_15px_rgba(174,12,167,0.5)]",
      secondary: "bg-white text-black hover:bg-gray-200",
      outline: "border-2 border-[#DC00D3] text-white hover:bg-[#DC00D3]/10 shadow-[0_0_10px_rgba(220,0,211,0.3)]",
      ghost: "text-white/70 hover:text-white hover:bg-white/10",
    };

    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-12 px-8 text-sm",
      lg: "h-14 px-10 text-base",
    };

    const Comp = motion.button;

    return (
      <Comp
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        {...(props as any)}
      />
    );
  }
);
Button.displayName = "Button";
