
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Bevestigen',
  cancelText = 'Annuleren',
  variant = 'danger'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={`p-3 rounded-2xl ${
                  variant === 'danger' ? 'bg-red-50 text-red-500' : 
                  variant === 'warning' ? 'bg-amber-50 text-amber-500' : 
                  'bg-indigo-50 text-indigo-500'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button onClick={onCancel} className="text-slate-300 hover:text-slate-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">{title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
            </div>
            
            <div className="p-8 bg-slate-50 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all active:scale-95"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`flex-1 px-6 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-xl ${
                  variant === 'danger' ? 'bg-red-500 shadow-red-100' : 
                  variant === 'warning' ? 'bg-amber-500 shadow-amber-100' : 
                  'bg-indigo-600 shadow-indigo-100'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
