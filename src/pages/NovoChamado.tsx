import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { TicketCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Send } from 'lucide-react';
import { toast } from 'sonner';

const NovoChamado = () => {
  const { user, isAdmin } = useAuth();
  const { addTicket } = useData();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as TicketCategory | '',
    attachment: null as File | null,
  });

  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast.error('Selecione uma categoria');
      return;
    }

    addTicket({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      status: 'open',
      user_id: user.id,
      attachment_url: formData.attachment ? URL.createObjectURL(formData.attachment) : undefined,
    });

    toast.success('Chamado criado com sucesso!');
    navigate('/meus-chamados');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, attachment: file });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-xl p-6 border border-border glow-card">
        <h2 className="text-xl font-semibold text-foreground mb-6">Abrir Novo Chamado</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Título do Problema</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Computador não liga"
              className="bg-secondary/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select 
              value={formData.category} 
              onValueChange={(v) => setFormData({ ...formData, category: v as TicketCategory })}
            >
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="network">Rede</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição do Problema</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva detalhadamente o problema que está enfrentando..."
              className="bg-secondary/50 min-h-[150px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Anexo (opcional)</Label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors bg-secondary/30">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formData.attachment ? formData.attachment.name : 'Clique para anexar arquivo'}
                  </span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
              </label>
            </div>
          </div>

          <Button type="submit" variant="glow" className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Enviar Chamado
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NovoChamado;
