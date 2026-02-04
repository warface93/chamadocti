import React, { createContext, useContext, useState } from 'react';
import { User, Sector, Ticket, Message } from '@/types';

interface DataContextType {
  users: User[];
  sectors: Sector[];
  tickets: Ticket[];
  messages: Message[];
  addUser: (user: Omit<User, 'id' | 'created_at'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addSector: (sector: Omit<Sector, 'id' | 'created_at'>) => void;
  updateSector: (id: string, sector: Partial<Sector>) => void;
  deleteSector: (id: string) => void;
  addTicket: (ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>) => void;
  updateTicket: (id: string, ticket: Partial<Ticket>) => void;
  addMessage: (message: Omit<Message, 'id' | 'created_at'>) => void;
  markTicketAsRead: (id: string) => void;
  getNewTicketsCount: () => number;
  getCriticalTicketsCount: () => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Mock data
const initialSectors: Sector[] = [
  { id: '1', name: 'TI', icon: 'Monitor', active: true, created_at: new Date().toISOString() },
  { id: '2', name: 'RH', icon: 'Users', active: true, created_at: new Date().toISOString() },
  { id: '3', name: 'Financeiro', icon: 'DollarSign', active: true, created_at: new Date().toISOString() },
  { id: '4', name: 'Comercial', icon: 'ShoppingBag', active: true, created_at: new Date().toISOString() },
];

const initialUsers: User[] = [
  { id: '1', name: 'Administrador', username: 'admin', email: 'admin@empresa.com', sector_id: '1', role: 'admin', active: true, created_at: new Date().toISOString() },
  { id: '2', name: 'João Silva', username: 'joao', email: 'joao@empresa.com', sector_id: '2', role: 'user', active: true, created_at: new Date().toISOString() },
  { id: '3', name: 'Maria Santos', username: 'maria', email: 'maria@empresa.com', sector_id: '3', role: 'user', active: true, created_at: new Date().toISOString() },
];

const initialTickets: Ticket[] = [
  { id: '1', title: 'Computador não liga', description: 'Meu computador não está ligando desde ontem', category: 'hardware', status: 'critical', user_id: '2', is_new: true, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString() },
  { id: '2', title: 'Problema no sistema', description: 'Sistema de vendas está lento', category: 'software', status: 'in_progress', user_id: '3', is_new: false, created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date().toISOString() },
  { id: '3', title: 'Internet instável', description: 'A conexão cai frequentemente', category: 'network', status: 'open', user_id: '2', is_new: true, created_at: new Date(Date.now() - 1800000).toISOString(), updated_at: new Date().toISOString() },
  { id: '4', title: 'Impressora não funciona', description: 'Impressora do setor não imprime', category: 'hardware', status: 'resolved', user_id: '3', rating: 5, is_new: false, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: '5', title: 'Erro no email', description: 'Não consigo enviar emails', category: 'software', status: 'open', user_id: '2', is_new: true, created_at: new Date(Date.now() - 900000).toISOString(), updated_at: new Date().toISOString() },
];

const initialMessages: Message[] = [
  { id: '1', ticket_id: '1', user_id: '2', content: 'Já tentei reiniciar mas não funcionou', created_at: new Date().toISOString() },
  { id: '2', ticket_id: '1', user_id: '1', content: 'Vou verificar presencialmente', created_at: new Date().toISOString() },
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const addUser = (user: Omit<User, 'id' | 'created_at'>) => {
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (id: string, userData: Partial<User>) => {
    setUsers(users.map(u => u.id === id ? { ...u, ...userData } : u));
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const addSector = (sector: Omit<Sector, 'id' | 'created_at'>) => {
    const newSector: Sector = {
      ...sector,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setSectors([...sectors, newSector]);
  };

  const updateSector = (id: string, sectorData: Partial<Sector>) => {
    setSectors(sectors.map(s => s.id === id ? { ...s, ...sectorData } : s));
  };

  const deleteSector = (id: string) => {
    setSectors(sectors.filter(s => s.id !== id));
  };

  const addTicket = (ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>) => {
    const newTicket: Ticket = {
      ...ticket,
      id: Date.now().toString(),
      is_new: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTickets([newTicket, ...tickets]);
  };

  const updateTicket = (id: string, ticketData: Partial<Ticket>) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, ...ticketData, updated_at: new Date().toISOString() } : t));
  };

  const addMessage = (message: Omit<Message, 'id' | 'created_at'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setMessages([...messages, newMessage]);
  };

  const markTicketAsRead = (id: string) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, is_new: false } : t));
  };

  const getNewTicketsCount = () => tickets.filter(t => t.is_new).length;
  
  const getCriticalTicketsCount = () => tickets.filter(t => t.status === 'critical' && t.is_new).length;

  return (
    <DataContext.Provider value={{
      users,
      sectors,
      tickets,
      messages,
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
