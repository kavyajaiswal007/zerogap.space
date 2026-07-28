import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Briefcase, 
  FileText,
  BookOpen,
  Users,
  Menu, 
  X, 
  User,
  type LucideIcon,
} from 'lucide-react';
import { cn } from './utils';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from './session';
import { LearnPathSidebarToggle } from './learnpath/LearnPathSidebar';
import CommunitySidebar from './CommunitySidebar';

type NavItem =
  | { kind: 'link'; icon: LucideIcon; label: string; path: string }
  | { kind: 'button'; icon: LucideIcon; label: string; onClick: () => void; isActive: boolean };

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const location = useLocation();
  const session = useSession();

  const openCommunity = () => {
    setIsCommunityOpen(true);
    setIsMobileMenuOpen(false);
  };

  const navItems: NavItem[] = [
    { kind: 'link', icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { kind: 'link', icon: BookOpen, label: 'Learn', path: '/learn' },
    { kind: 'link', icon: FileText, label: 'Resume', path: '/resume' },
    { kind: 'link', icon: Briefcase, label: 'Jobs', path: '/jobs' },
    { kind: 'button', icon: Users, label: 'Community', onClick: openCommunity, isActive: isCommunityOpen },
    ...(session.user?.role === 'college' || session.user?.role === 'admin'
      ? [{ kind: 'link' as const, icon: Target, label: 'Admin', path: '/admin' }]
      : []),
  ];

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="fixed left-0 top-0 h-full w-20 bg-white border-r-[2px] border-slate-900 hidden lg:flex flex-col items-center py-8 z-[100] shadow-[2px_0px_0px_0px_rgba(15,23,42,1)]">
        <Link to="/" className="mb-12">
          <span className="font-black text-[9px] uppercase tracking-widest text-slate-900 whitespace-nowrap">
            ZeroGap
          </span>
        </Link>

        <div className="flex-1 flex flex-col gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.kind === 'button' ? item.isActive : location.pathname === item.path;
            const tile = (
              <>
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center border-[2px] transition-all",
                  isActive 
                    ? "bg-secondary border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] scale-105" 
                    : "bg-white border-transparent text-slate-400 group-hover:border-slate-100 group-hover:text-slate-900 group-hover:-translate-y-0.5"
                )}>
                  <Icon size={20} strokeWidth={isActive ? 3 : 2} className={cn(isActive && "text-slate-900")} />
                </div>
                <span className="absolute left-16 px-2 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 whitespace-nowrap border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(190,242,100,1)]">
                  {item.label}
                </span>
              </>
            );
            
            return item.kind === 'button' ? (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="relative group flex flex-col items-center"
                aria-label="Open Community"
              >
                {tile}
              </button>
            ) : (
              <Link 
                key={item.path} 
                to={item.path} 
                className="relative group flex flex-col items-center"
              >
                {tile}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Signed in</p>
            <p className="text-[9px] font-black uppercase tracking-tight text-slate-900 max-w-[52px] truncate">
              {session.user?.full_name?.split(' ')[0] ?? 'You'}
            </p>
          </div>
          <Link to="/profile">
             <div className="w-11 h-11 bg-slate-50 border-[2px] border-slate-900 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
               <User size={20} />
             </div>
          </Link>
        </div>
      </nav>

      {/* Mobile Top Nav */}
      <nav className="fixed top-0 left-0 w-full bg-white border-b-[2px] border-slate-900 h-16 flex items-center justify-between px-6 lg:hidden z-[90]">
         <Link to="/" className="font-black text-sm uppercase tracking-[0.2em] text-slate-900">
            ZeroGap
         </Link>
         <button 
           onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
           className="p-1.5 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
         >
           {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
         </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 bg-white z-[80] pt-24 px-6 lg:hidden"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.kind === 'button' ? item.isActive : location.pathname === item.path;
                const itemClasses = cn(
                  "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all",
                  isActive 
                    ? "bg-secondary border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]" 
                    : "bg-white border-slate-100 text-slate-500"
                );

                return item.kind === 'button' ? (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className={itemClasses}
                  >
                    <Icon size={20} strokeWidth={isActive ? 3 : 2} />
                    <span className="font-black uppercase tracking-widest text-[10px]">{item.label}</span>
                  </button>
                ) : (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    onClick={closeMenu}
                    className={itemClasses}
                  >
                    <Icon size={20} strokeWidth={isActive ? 3 : 2} />
                    <span className="font-black uppercase tracking-widest text-[10px]">{item.label}</span>
                  </Link>
                );
              })}
              <div className="mt-8 border-t-2 border-slate-100 pt-4 space-y-4">
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 text-slate-500"
                >
                  <User size={20} />
                  <span className="font-black uppercase tracking-widest text-[10px]">Profile</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <CommunitySidebar isOpen={isCommunityOpen} onClose={() => setIsCommunityOpen(false)} />
      <LearnPathSidebarToggle />
    </>
  );
}
