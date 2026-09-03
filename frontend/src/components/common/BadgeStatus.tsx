import React from 'react';
import type { FinanceiroStatus } from '../../types';
import './BadgeStatus.css';

interface BadgeStatusProps {
  status: FinanceiroStatus;
}

const statusConfig: Record<FinanceiroStatus, { icon: string; className: string }> = {
  Pago: { icon: '🟢', className: 'pago' },
  Permuta: { icon: '🟡', className: 'permuta' },
  Pendente: { icon: '🔴', className: 'pendente' },
};

export const BadgeStatus: React.FC<BadgeStatusProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <span className={`badge-status badge-status--${config.className}`}>
      <span aria-hidden="true">{config.icon}</span>
      {status}
    </span>
  );
};
