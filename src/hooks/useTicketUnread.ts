import { useEffect, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';

const seenKey = (ticketId: string, userId: string) => `ticket_seen_${ticketId}_${userId}`;

export const getLastSeen = (ticketId: string, userId: string): number => {
  try {
    const v = localStorage.getItem(seenKey(ticketId, userId));
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
};

export const markTicketSeen = (ticketId: string, userId: string) => {
  try {
    localStorage.setItem(seenKey(ticketId, userId), String(Date.now()));
    window.dispatchEvent(new CustomEvent('ticket-seen', { detail: { ticketId } }));
  } catch {}
};

export const useTicketUnreadCount = (ticketId: string): number => {
  const { messages } = useData();
  const { user } = useAuth();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.ticketId === ticketId) setTick((t) => t + 1);
    };
    window.addEventListener('ticket-seen', handler);
    window.addEventListener('new-ticket-message', handler);
    return () => {
      window.removeEventListener('ticket-seen', handler);
      window.removeEventListener('new-ticket-message', handler);
    };
  }, [ticketId]);

  if (!user) return 0;
  const lastSeen = getLastSeen(ticketId, user.id);
  void tick;
  return messages.filter(
    (m) =>
      m.ticket_id === ticketId &&
      m.user_id !== user.id &&
      new Date(m.created_at).getTime() > lastSeen
  ).length;
};
