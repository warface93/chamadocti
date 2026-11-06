import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PendingReturn {
  id: string; meeting_id: string; quantity: number; reason: string; created_at: string;
  requested_by_name: string | null; equipment_label: string; meeting_theme: string | null;
}

/** Pending equipment return requests (admin only), kept live via realtime; one entry per request. */
export function usePendingReturns() {
  const { isAdmin, user } = useAuth();
  const [pending, setPending] = useState<PendingReturn[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('return_requests')
      .select('id, meeting_id, quantity, reason, created_at, requested_by_name, equipment_inventory(type, brand), meeting_admin_items(description), meetings(theme)')
      .eq('status', 'pendente').order('created_at', { ascending: false });
    setPending((data || []).map((r: any) => ({
      id: r.id, meeting_id: r.meeting_id, quantity: r.quantity, reason: r.reason, created_at: r.created_at,
      requested_by_name: r.requested_by_name,
      equipment_label: r.equipment_inventory ? `${r.equipment_inventory.type} ${r.equipment_inventory.brand}` : r.meeting_admin_items?.description || 'equipamento',
      meeting_theme: r.meetings?.theme || null,
    })));
  }, []);

  useEffect(() => {
    if (!isAdmin || !user) { setPending([]); return; }
    load();
    const ch = supabase.channel(`pending-returns-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'return_requests' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin, user?.id, load]);

  return pending;
}
