import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { cn } from './utils';

interface CardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  children: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'highlight' | 'warning' | 'success';
}

interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'neo' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function Card({ 
  title, 
  subtitle, 
  icon: Icon, 
  badge, 
  children, 
  action, 
  className,
  variant = 'default' 
}: CardProps) {
  const accentColors = {
    default: 'shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]',
    highlight: 'shadow-[4px_4px_0px_0px_rgba(236,72,153,1)] border-pink-400',
    warning: 'shadow-[4px_4px_0px_0px_rgba(245,158,11,1)] border-accent',
    success: 'shadow-[4px_4px_0px_0px_rgba(16,185,129,1)] border-success',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "bg-white border-[2px] border-slate-900 rounded-[2rem] p-8",
        accentColors[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border-[2px] border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]",
              variant === 'highlight' ? "bg-secondary" : 
              variant === 'warning' ? "bg-accent" : 
              variant === 'success' ? "bg-success" : "bg-slate-50"
            )}>
              <Icon size={20} strokeWidth={2.5} />
            </div>
          )}
          <div>
            <h3 className="text-xl font-display font-black leading-none mb-1 uppercase tracking-tight">{title}</h3>
            {subtitle && <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{subtitle}</p>}
          </div>
        </div>
        {badge && (
          <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-8 relative z-10 text-left">
        {children}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="w-full mt-10 neo-btn-primary h-14 text-sm tracking-widest uppercase"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon,
  className,
  ...props 
}: ButtonProps) {
  const classMap = {
    primary: "neo-btn-primary",
    secondary: "neo-btn-secondary",
    outline: "neo-btn-outline",
    neo: "neo-btn-outline",
    ghost: "text-slate-500 hover:text-slate-900 font-black uppercase tracking-widest text-[9px] transition-all",
  };

  return (
    <button 
      className={cn(
        "flex items-center justify-center gap-2",
        classMap[variant],
        size === 'sm' ? "px-4 py-2 text-[9px] tracking-widest" : 
        size === 'lg' ? "px-10 py-5 text-xl tracking-tighter capitalize" : "px-8 py-4 text-xs tracking-widest uppercase",
        className
      )}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 20} strokeWidth={2.5} className="mr-0.5" />}
      {children}
    </button>
  );
}
