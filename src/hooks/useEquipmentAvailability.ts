import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PHYSICAL_EQUIPMENT } from '@/lib/meetingOptions';

/** Only availability is exposed to requesters; loan records remain protected. */
export function useEquipmentAvailability() {
  const [available, setAvailable] = useState<Record<string, number>>({});
  const refresh = useCallback(async () => {
    const entries = await Promise.all(PHYSICAL_EQUIPMENT.map(async ({ id }) => {
      const { data, error } = await supabase.rpc('equipment_type_available', { _option: id });
      return [id, error ? 0 : Number(data) || 0] as const;
    }));
    setAvailable(Object.fromEntries(entries));
  }, []);
  useEffect(() => {
    void refresh();
    const channel = supabase.channel(`equipment-availability-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_inventory' }, refresh)
      .subscribe();
    window.addEventListener('focus', refresh);
    return () => { void supabase.removeChannel(channel); window.removeEventListener('focus', refresh); };
  }, [refresh]);
  return { available, refresh };
}