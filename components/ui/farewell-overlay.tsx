"use client";

import { motion, AnimatePresence } from "framer-motion";

type FarewellOverlayProps = {
  message?: string;
};

export function FarewellOverlay({ message = "¡Gracias! ¡Nos vemos la próxima vez!" }: FarewellOverlayProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mx-6 max-w-xl rounded-[40px] border border-white/60 bg-white/95 px-12 py-12 text-center shadow-[0_32px_80px_rgba(15,23,42,0.24)]"
        >
          <p className="text-3xl font-black leading-tight text-brand-deep">
            {message}
          </p>
          <p className="mt-4 text-base font-semibold uppercase tracking-[0.28em] text-brand-ink-muted">
            Redirigiendo…
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
