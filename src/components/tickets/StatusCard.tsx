import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: 'total' | 'open' | 'in_progress' | 'resolved' | 'critical' | 'pending';
}

const variantStyles = {
  total: 'glow-card border-primary/30',
  open: 'glow-card border-open/30',
  in_progress: 'glow-card-warning border-warning/30',
  resolved: 'glow-card-success border-success/30',
  critical: 'glow-card-critical border-critical/30',
  pending: 'glow-card border-muted-foreground/30',
};

const iconStyles = {
  total: 'text-primary bg-primary/10',
  open: 'text-open bg-open/10',
  in_progress: 'text-warning bg-warning/10',
  resolved: 'text-success bg-success/10',
  critical: 'text-critical bg-critical/10',
  pending: 'text-muted-foreground bg-muted/40',
};

const valueStyles = {
  total: 'text-primary',
  open: 'text-open',
  in_progress: 'text-warning',
  resolved: 'text-success',
  critical: 'text-critical',
  pending: 'text-foreground',
};

const StatusCard = ({ title, value, icon: Icon, variant }: StatusCardProps) => {
  return (
    <div className={cn(
      'bg-card rounded-xl p-6 border transition-all duration-300 card-hover-effect',
      variantStyles[variant]
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className={cn('text-3xl font-bold', valueStyles[variant])}>{value}</p>
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconStyles[variant])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default StatusCard;
