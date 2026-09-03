import React, { useState } from 'react';
import { Header, Sidebar, Notification } from './common';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title = 'Controle de Aulas' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="layout-content">
        <Header
          title={title}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="layout-main">
          {children}
        </main>
      </div>

      <Notification />
    </div>
  );
};
