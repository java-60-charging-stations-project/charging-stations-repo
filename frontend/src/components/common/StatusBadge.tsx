import { useI18n } from '@/i18n/I18nContext';
import { STATUS_COLORS } from '@/utils/constants';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();
  const colorClass = (STATUS_COLORS as Record<string, string>)[status] || 'bg-gray-100 text-gray-800';
  const label = t(`status.${status}`) !== `status.${status}` ? t(`status.${status}`) : status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
