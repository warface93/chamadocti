import { useAuth } from '@/contexts/AuthContext';
import ReuniaoUsuario from '@/components/reunioes/ReuniaoUsuario';
import ReuniaoAdmin from '@/components/reunioes/ReuniaoAdmin';

const Reunioes = () => {
  const { isAdmin } = useAuth();

  return isAdmin ? <ReuniaoAdmin /> : <ReuniaoUsuario />;
};

export default Reunioes;
