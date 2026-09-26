import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X, LoaderCircle, ChevronRight } from 'lucide-react';
import type { CaseRecord } from '../shared/domain';
import { statusLabels } from '../shared/domain';

export function Status({ status }: { status: CaseRecord['status'] }) {
  return (
    <span className={`status status-${status}`}>
      <span />
      {statusLabels[status]}
    </span>
  );
}
export function Spinner({ label = 'Working' }: { label?: string }) {
  return (
    <span className="inline-loader">
      <LoaderCircle size={16} className="spin" />
      <span>{label}</span>
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      onCancel={onClose}
      aria-label={title}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function money(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
export function dateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
export function Breadcrumb({ onBack, current }: { onBack: () => void; current: string }) {
  return (
    <div className="breadcrumb">
      <button onClick={onBack}>Review queue</button>
      <ChevronRight size={14} />
      <span>{current}</span>
    </div>
  );
}
