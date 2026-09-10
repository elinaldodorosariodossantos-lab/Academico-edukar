import React from 'react';
import './Card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
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
  ...props
}) => {
  return (
    <div {...props} className={`card card-padding-${padding} ${hoverable ? 'card-hoverable' : ''} ${className}`}>
      {children}
    </div>
  );
};
