import { useState, useEffect } from 'react';
import { Bell, ShieldAlert, Sparkles, X, Volume2, Info } from 'lucide-react';

export interface Toast {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
}

// Browser Audio Synthesizer for alerts
export function playAlertSound(type: 'success' | 'warning' | 'info') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'success') {
      // Elegant, positive double chime (ascending)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.3);
    } else if (type === 'warning') {
      // Softer warning alert chime (descending)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.15); // F4

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Subtle click/beep chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {
    console.warn('Audio Context is blocked or not supported on this device:', e);
  }
}

interface ToastContainerProps {
  toasts: Toast[];
  setToasts: (t: Toast[]) => void;
}

export default function ToastContainer({ toasts, setToasts }: ToastContainerProps) {
  const removeToast = (id: string) => {
    setToasts(toasts.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-6 right-6 z-[100000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => {
        let icon = <Info className="w-5 h-5 text-indigo-400" />;
        let borderClass = 'border-slate-850 bg-slate-900/95';
        if (toast.type === 'success') {
          icon = <Sparkles className="w-5 h-5 text-emerald-400" />;
          borderClass = 'border-emerald-500/30 bg-slate-900/95';
        } else if (toast.type === 'warning') {
          icon = <ShieldAlert className="w-5 h-5 text-rose-400" />;
          borderClass = 'border-rose-500/30 bg-slate-900/95';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 border rounded-xl shadow-2xl backdrop-blur transition-all duration-300 animate-slide-in ${borderClass}`}
            id={`toast-${toast.id}`}
          >
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-100 block">{toast.title}</span>
              <p className="text-[11px] text-slate-400 leading-normal mt-0.5">{toast.description}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-slate-500 hover:text-slate-300 p-0.5 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
