import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Sector, Ticket, Message, TicketCategory, TicketStatus } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DataContextType {
  users: User[];
  sectors: Sector[];
  tickets: Ticket[];
  messages: Message[];
  loading: boolean;
  addUser: (user: Omit<User, 'id' | 'created_at'> & { password: string }) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addSector: (sector: Omit<Sector, 'id' | 'created_at'>) => Promise<void>;
  updateSector: (id: string, sector: Partial<Sector>) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;
  addTicket: (ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTicket: (id: string, ticket: Partial<Ticket>) => Promise<void>;
  addMessage: (message: Omit<Message, 'id' | 'created_at'>) => Promise<void>;
  markTicketAsRead: (id: string) => Promise<void>;
  getNewTicketsCount: () => number;
  getCriticalTicketsCount: () => number;
  refetchMessages: (ticketId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
    
    // Set up realtime subscriptions
    const ticketsChannel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTicket = payload.new as Ticket;
            setTickets(prev => [newTicket, ...prev.filter(t => t.id !== newTicket.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedTicket = payload.new as Ticket;
            setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
          } else if (payload.eventType === 'DELETE') {
            const deletedTicket = payload.old as { id: string };
            setTickets(prev => prev.filter(t => t.id !== deletedTicket.id));
          }
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            setMessages(prev => [...prev.filter(m => m.id !== newMessage.id), newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      ticketsChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchUsers(),
        fetchSectors(),
        fetchTickets(),
        fetchMessages(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return;
    }

    const usersWithRoles: User[] = (profiles || []).map(profile => {
      const userRole = roles?.find(r => r.user_id === profile.id);
      return {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email || undefined,
        sector_id: profile.sector_id || '',
        role: userRole?.role || 'user',
        active: profile.active ?? true,
        created_at: profile.created_at || new Date().toISOString(),
      };
    });

    setUsers(usersWithRoles);
  };

  const fetchSectors = async () => {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching sectors:', error);
      return;
    }

    setSectors(data || []);
  };

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return;
    }

    // Cast the data to Ticket type
    const typedTickets = (data || []).map(t => ({
      ...t,
      category: t.category as TicketCategory,
      status: t.status as TicketStatus,
    })) as Ticket[];

    setTickets(typedTickets);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const refetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(prev => {
      const otherMessages = prev.filter(m => m.ticket_id !== ticketId);
      return [...otherMessages, ...(data || [])];
    });
  };

  const addUser = async (userData: Omit<User, 'id' | 'created_at'> & { password: string }) => {
    try {
      const email = userData.email || `${userData.username}@sistema.local`;
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: userData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: userData.name,
            username: userData.username,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Wait for trigger to create profile and role
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update profile with sector_id
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            sector_id: userData.sector_id,
            active: userData.active 
          })
          .eq('id', authData.user.id);

        if (profileError) console.error('Error updating profile:', profileError);

        // Set role - always update to ensure correct role is set
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: userData.role || 'user' })
          .eq('user_id', authData.user.id);

        if (roleError) {
          console.error('Error updating role:', roleError);
          // If update failed, try to insert (in case trigger didn't create it)
          if (roleError.code === 'PGRST116') {
            await supabase
              .from('user_roles')
              .insert({ user_id: authData.user.id, role: userData.role || 'user' });
          }
        }

        await fetchUsers();
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      throw error;
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          username: userData.username,
          email: userData.email,
          sector_id: userData.sector_id,
          active: userData.active,
        })
        .eq('id', id);

      if (profileError) throw profileError;

      // Update role if changed
      if (userData.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: userData.role })
          .eq('user_id', id);

        if (roleError) throw roleError;
      }

      await fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // Delete from profiles (will cascade to user_roles)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const addSector = async (sectorData: Omit<Sector, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('sectors')
        .insert([sectorData]);

      if (error) throw error;

      await fetchSectors();
    } catch (error) {
      console.error('Error adding sector:', error);
      throw error;
    }
  };

  const updateSector = async (id: string, sectorData: Partial<Sector>) => {
    try {
      const { error } = await supabase
        .from('sectors')
        .update(sectorData)
        .eq('id', id);

      if (error) throw error;

      await fetchSectors();
    } catch (error) {
      console.error('Error updating sector:', error);
      throw error;
    }
  };

  const deleteSector = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sectors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchSectors();
    } catch (error) {
      console.error('Error deleting sector:', error);
      throw error;
    }
  };

  const addTicket = async (ticketData: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .insert([{
          ...ticketData,
          is_new: true,
        }]);

      if (error) throw error;

      // No need to manually fetch - realtime will handle it
    } catch (error) {
      console.error('Error adding ticket:', error);
      throw error;
    }
  };

  const updateTicket = async (id: string, ticketData: Partial<Ticket>) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          ...ticketData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // No need to manually fetch - realtime will handle it
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };

  const addMessage = async (messageData: Omit<Message, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;

      // Add message locally immediately for better UX
      if (data) {
        setMessages(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  };

  const markTicketAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ is_new: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking ticket as read:', error);
    }
  };

  const getNewTicketsCount = () => tickets.filter(t => t.is_new).length;
  
  const getCriticalTicketsCount = () => tickets.filter(t => t.status === 'critical' && t.is_new).length;

  return (
    <DataContext.Provider value={{
      users,
      sectors,
      tickets,
      messages,
      loading,
      addUser,
      updateUser,
      deleteUser,
      addSector,
      updateSector,
      deleteSector,
      addTicket,
      updateTicket,
      addMessage,
      markTicketAsRead,
      getNewTicketsCount,
      getCriticalTicketsCount,
      refetchMessages,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
