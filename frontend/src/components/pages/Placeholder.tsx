import React, { useState } from 'react';
import { Card, Button } from '../common';
import './Configuracoes.css';

type FinanceiroConfiguracao = {
  turma: string;
  mensalidade: number;
  vencimento: number;
  ativo: boolean;
};

const configuracoes = [
  {
    title: 'Perfil da Escola',
    description: 'Informações institucionais, endereço e identidade da instituição.',
    status: 'Configurado',
  },
  {
    title: 'Perfil do Administrador',
    description: 'Dados de acesso, contato e permissões do responsável pelo sistema.',
    status: 'Atualizado',
  },
  {
    title: 'Financeiro',
    description: 'Gestão de planos, descontos, vencimentos e formas de pagamento.',
    status: '3 itens',
    children: [
      'Cursos e Valores',
      'Descontos',
      'Vencimentos',
      'Formas de Pagamento',
    ],
  },
  {
    title: 'Comunicação',
    description: 'E-mails, mensagens e canais de contato com alunos e responsáveis.',
    status: 'Ativo',
  },
  {
    title: 'Aparência',
    description: 'Temas, logotipo, cores e personalização da interface do sistema.',
    status: 'Tema claro',
  },
  {
    title: 'Notificações',
    description: 'Alertas, lembretes e preferências de envio para a equipe.',
    status: 'Habilitadas',
  },
  {
    title: 'Backup',
    description: 'Cópias de segurança, retenção de dados e recuperação do sistema.',
    status: 'Diário',
  },
];

export const Horarios: React.FC = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <Card padding="lg">
        <h1>Horários</h1>
        <p>Página em desenvolvimento...</p>
      </Card>
    </div>
  );
};

export const Relatorios: React.FC = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <Card padding="lg">
        <h1>Relatórios</h1>
        <p>Página em desenvolvimento...</p>
      </Card>
    </div>
  );
};

export const Configuracoes: React.FC = () => {
  const [financeiroConfiguracoes, setFinanceiroConfiguracoes] = useState<FinanceiroConfiguracao[]>([
    { turma: 'Robótica Kids', mensalidade: 250, vencimento: 5, ativo: true },
    { turma: 'Inglês', mensalidade: 320, vencimento: 10, ativo: true },
    { turma: 'Programação', mensalidade: 390, vencimento: 15, ativo: false },
    { turma: 'Design', mensalidade: 280, vencimento: 20, ativo: false },
  ]);

  const handleToggleStatus = (turma: string) => {
    setFinanceiroConfiguracoes((prev) =>
      prev.map((item) =>
        item.turma === turma ? { ...item, ativo: !item.ativo } : item
      )
    );
  };

  return (
    <div className="configuracoes-page">
      <div className="configuracoes-header">
        <div>
          <p className="eyebrow">Sistema</p>
          <h1>Configurações</h1>
        </div>
        <Button variant="primary">Salvar alterações</Button>
      </div>

      <div className="configuracoes-grid">
        {configuracoes.map((item) => (
          <Card key={item.title} padding="lg" className="config-card">
            <div className="config-card-header">
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <span className="config-status">{item.status}</span>
            </div>

            {item.children && (
              <ul className="config-subitems">
                {item.children.map((child) => (
                  <li key={child}>{child}</li>
                ))}
              </ul>
            )}

            <div className="config-card-footer">
              <span>Configuração rápida</span>
              <button type="button" className="config-link-btn">
                Abrir
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Card padding="lg" className="financeiro-config-card">
        <div className="financeiro-config-header">
          <div>
            <p className="eyebrow">Financeiro</p>
            <h2>Configurações financeiras</h2>
          </div>
        </div>

        <div className="financeiro-config-table-wrap">
          <table className="financeiro-config-table">
            <thead>
              <tr>
                <th>Turma</th>
                <th>Mensalidade</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {financeiroConfiguracoes.map((item) => (
                <tr key={item.turma}>
                  <td>{item.turma}</td>
                  <td>R$ {item.mensalidade.toFixed(2).replace('.', ',')}</td>
                  <td>Dia {item.vencimento}</td>
                  <td>
                    <span className={`status-badge status-${item.ativo ? 'ativo' : 'inativo'}`}>
                      <span className="status-dot" aria-hidden="true" />
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-switch ${item.ativo ? 'active' : ''}`}
                      onClick={() => handleToggleStatus(item.turma)}
                      aria-label={item.ativo ? 'Desativar turma' : 'Ativar turma'}
                      title={item.ativo ? 'Desativar' : 'Ativar'}
                    >
                      <span className="status-switch-thumb" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
