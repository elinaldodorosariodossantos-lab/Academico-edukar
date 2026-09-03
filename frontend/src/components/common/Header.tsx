import React, { useEffect } from 'react';
import { FiMenu, FiMoon, FiSun, FiLogOut } from 'react-icons/fi';
import { useAppStore } from '../../context/AppContext';
import './Header.css';

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
  showMenu?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  title = 'Controle de Aulas',
  showMenu = true,
}) => {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const setIsDarkMode = useAppStore((state) => state.setIsDarkMode);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <header className="header">
      <div className="header-left">
        {showMenu && (
          <button className="header-menu-btn" onClick={onMenuClick} aria-label="Menu">
            <FiMenu size={24} />
          </button>
        )}
        <div className="header-title">
          <h1>{title}</h1>
        </div>
      </div>

      <div className="header-right">
        <button
          className="header-theme-btn"
          onClick={handleThemeToggle}
          aria-label="Alternar tema"
        >
          {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>

        <button className="header-logout-btn" aria-label="Sair">
          <FiLogOut size={20} />
        </button>
      </div>
    </header>
  );
};
