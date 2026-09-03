import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiUsers,
  FiBook,
  FiClock,
  FiBarChart,
  FiFileText,
  FiDollarSign,
} from 'react-icons/fi';
import './Sidebar.css';
import edukarLogo from '../../../EDUKARXP-horizontal.png';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const menuItems = [
    { icon: FiHome, label: 'Dashboard', path: '/' },
    { icon: FiUsers, label: 'Alunos', path: '/alunos' },
    { icon: FiBook, label: 'Turmas', path: '/turmas' },
    { icon: FiClock, label: 'Horários', path: '/horarios' },
    { icon: FiBarChart, label: 'Frequência', path: '/frequencia' },
    { icon: FiFileText, label: 'Relatórios', path: '/relatorios' },
    { icon: FiDollarSign, label: 'Financeiro', path: '/financeiro' },
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={edukarLogo} alt="Edukar XP" className="sidebar-brand-image" />
            <span className="sidebar-brand-subtitle">Sistema Acadêmico Escolar</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="sidebar-nav-icon">
                  <Icon size={19} />
                </span>
                <span className="sidebar-nav-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-info">
            <p className="text-small text-muted">Versão 1.0.0</p>
            <p className="text-small text-muted">© 2026 Edukar XP</p>
          </div>
        </div>
      </aside>
    </>
  );
};
