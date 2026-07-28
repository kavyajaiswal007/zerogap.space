import { ExternalLink, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface CommunitySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommunitySidebar({ isOpen, onClose }: CommunitySidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-900/20 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 420, y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: 420, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-0 right-0 z-[160] flex h-[85vh] w-full flex-col rounded-t-[1.75rem] border-[3px] border-b-0 border-slate-900 bg-white shadow-[-8px_0px_0px_0px_rgba(15,23,42,1)] lg:top-0 lg:h-full lg:w-96 lg:rounded-none lg:border-y-0 lg:border-l-[3px] lg:border-r-0"
            aria-label="Community sidebar"
          >
            <header className="border-b-[3px] border-slate-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border-[2px] border-slate-900 bg-indigo-50 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                      <Users className="h-5 w-5 text-slate-900" strokeWidth={3} />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-black uppercase leading-none tracking-tight">Community</h2>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Zero Gap socials</p>
                    </div>
                  </div>
                </div>
                <button type="button" className="neo-btn-outline !px-3 !py-2" onClick={onClose} aria-label="Close community sidebar">
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="space-y-5">
                <div className="rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <svg width="18" height="14" viewBox="0 0 71 55" fill="#5865F2" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M60.105 4.898A58.55 58.55 0 0 0 45.653.149a.22.22 0 0 0-.233.11c-.62 1.1-1.306 2.536-1.788 3.664a54.08 54.08 0 0 0-16.228 0A38.38 38.38 0 0 0 25.6.26a.229.229 0 0 0-.233-.11 58.438 58.438 0 0 0-14.452 4.75.207.207 0 0 0-.095.082C1.577 18.93-.944 32.57.292 46.046a.244.244 0 0 0 .093.167C6.444 50.498 12.37 52.8 18.19 54.346a.231.231 0 0 0 .251-.082c1.36-1.857 2.574-3.813 3.615-5.866a.225.225 0 0 0-.123-.312c-1.923-.73-3.754-1.62-5.517-2.637a.228.228 0 0 1-.022-.378c.371-.278.742-.567 1.096-.859a.22.22 0 0 1 .23-.031c11.574 5.284 24.103 5.284 35.54 0a.22.22 0 0 1 .231.028c.354.292.726.584 1.1.862a.228.228 0 0 1-.02.378 36.253 36.253 0 0 1-5.52 2.634.226.226 0 0 0-.12.315 40.512 40.512 0 0 0 3.612 5.863.228.228 0 0 0 .251.084c5.843-1.546 11.77-3.848 17.828-8.134a.229.229 0 0 0 .092-.164c1.48-15.315-2.48-28.842-10.498-40.748a.18.18 0 0 0-.092-.084zM23.725 37.949c-3.497 0-6.38-3.211-6.38-7.156s2.826-7.156 6.38-7.156c3.581 0 6.437 3.238 6.38 7.156 0 3.945-2.826 7.156-6.38 7.156zm23.593 0c-3.498 0-6.38-3.211-6.38-7.156s2.825-7.156 6.38-7.156c3.581 0 6.437 3.238 6.38 7.156 0 3.945-2.798 7.156-6.38 7.156z" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Discord</span>
                    <span className="ml-auto inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="mb-3 text-sm font-black italic tracking-tight">
                    Real-time chat, drops & community events.
                  </p>
                  <p className="mb-4 text-[10px] font-bold leading-relaxed text-slate-500">
                    Ask questions, share wins, join live sessions and vibe with the Zero Gap crew 24/7.
                  </p>
                  <a
                    href="https://discord.gg/SNw23a56"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neo-btn-outline h-11 w-full !border-indigo-400 !text-indigo-700 hover:bg-indigo-100 text-[10px] tracking-widest"
                  >
                    JOIN SERVER <ExternalLink size={12} />
                  </a>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-700">LinkedIn</span>
                    <span className="ml-auto rounded-md bg-sky-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-sky-800">
                      Company
                    </span>
                  </div>
                  <p className="mb-3 text-sm font-black italic tracking-tight">
                    Zero Gap's official company page.
                  </p>
                  <p className="mb-4 text-[10px] font-bold leading-relaxed text-slate-500">
                    Follow for job posts, team milestones, industry insights and Zero Gap updates.
                  </p>
                  <a
                    href="https://www.linkedin.com/company/116164241/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neo-btn-outline h-11 w-full !border-sky-400 !text-sky-700 hover:bg-sky-100 text-[10px] tracking-widest"
                  >
                    FOLLOW PAGE <ExternalLink size={12} />
                  </a>
                </div>

                <p className="pt-1 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Be part of something bigger
                </p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
