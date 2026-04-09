import { useEffect } from 'react';

export default function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — Cascade Concrete Planner` : 'Cascade Concrete Planner';
    return () => { document.title = prev; };
  }, [title]);
}
