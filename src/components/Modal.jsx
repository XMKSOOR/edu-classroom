import { useEffect, useRef } from 'react';

export default function Modal({ open, onClose, title, subtitle, children, actions, wide }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) el.showModal();
    else el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e) => { if (e.target === el) onClose(); };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onClose]);

  return (
    <dialog ref={ref} onClose={onClose}>
      <div className="modal" style={wide ? { maxWidth: '600px' } : {}}>
        {title && <h2>{title}</h2>}
        {subtitle && <p>{subtitle}</p>}
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </dialog>
  );
}
