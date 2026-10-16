import { useAuth } from '@/contexts/AuthContext';
import ReuniaoUsuario from '@/components/reunioes/ReuniaoUsuario';
import ReuniaoAdmin from '@/components/reunioes/ReuniaoAdmin';

const Reunioes = () => {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <ReuniaoUsuario formOnly />
        <ReuniaoAdmin />
      </div>
    );
  }

  return <ReuniaoUsuario />;
};

export default Reunioes;
