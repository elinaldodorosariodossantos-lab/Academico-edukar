import React from 'react';
import './Card.css';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  className = '',
  children,
  hoverable = false,
  padding = 'md',
}) => {
  return (
    <div className={`card card-padding-${padding} ${hoverable ? 'card-hoverable' : ''} ${className}`}>
      {children}
    </div>
  );
};
