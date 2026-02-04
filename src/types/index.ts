export type UserRole = 'admin' | 'user';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'critical' | 'pending';

export type TicketCategory = 'software' | 'hardware' | 'network' | 'other';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  sector_id: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Sector {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  user_id: string;
  attachment_url?: string;
  rating?: number;
  is_new?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}
