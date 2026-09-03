import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../common';
import { FiUsers, FiBook, FiClock, FiCheckCircle, FiCalendar, FiAlertCircle, FiActivity, FiArrowUpRight } from 'react-icons/fi';
import { useAlunos } from '../../hooks/useAlunos';
import { useTurmas } from '../../hooks/useTurmas';
import { useFrequencia } from '../../hooks/useFrequencia';
import './Dashboard.css';

interface StatCard {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  color: string;
  description: string;
}

const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const normalizarDia = (dia: string) => dia.toLocaleLowerCase('pt-BR').replace('-feira', '').trim();
const getHoraInicio = (horaInicio?: string, horario?: string) => horaInicio || horario?.match(/\d{1,2}:\d{2}/)?.[0] || '';
const getHoraFim = (horaFim?: string, horario?: string) => horaFim || horario?.match(/\d{1,2}:\d{2}/g)?.[1] || '';

export const Dashboard: React.FC = () => {
  const { alunos, isLoading: loadingAlunos } = useAlunos();
  const { turmas, isLoading: loadingTurmas } = useTurmas();
  const { frequencias } = useFrequencia();
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const proximasAulas = useMemo(() => {
    const ocorrencias = turmas.flatMap((turma) => {
      const horaInicio = getHoraInicio(turma.horaInicio, turma.horario);
      const horaFim = getHoraFim(turma.horaFim, turma.horario);
      if (!horaInicio || !turma.diasSemana?.length) return [];
      const [inicioHoras, inicioMinutos] = horaInicio.split(':').map(Number);

      for (let deslocamento = 0; deslocamento <= 7; deslocamento += 1) {
        const inicio = new Date(agora);
        inicio.setDate(agora.getDate() + deslocamento);
        inicio.setHours(inicioHoras, inicioMinutos, 0, 0);
        const dia = normalizarDia(diasSemana[inicio.getDay()]);
        if (!turma.diasSemana.some((item) => normalizarDia(item) === dia)) continue;

        const fim = new Date(inicio);
        if (horaFim) {
          const [fimHoras, fimMinutos] = horaFim.split(':').map(Number);
          fim.setHours(fimHoras, fimMinutos, 0, 0);
        } else {
          fim.setMinutes(fim.getMinutes() + 60);
        }

        const atual = deslocamento === 0 && agora >= inicio && agora < fim;
        if (atual || inicio > agora) return [{ turma, data: inicio, fim, atual }];
      }
      return [];
    });

    const atual = ocorrencias.filter((item) => item.atual).sort((a, b) => a.data.getTime() - b.data.getTime())[0];
    const posterior = ocorrencias.filter((item) => !item.atual).sort((a, b) => a.data.getTime() - b.data.getTime())[0];
    return [atual, posterior].filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [agora, turmas]);

  const aulasHoje = turmas.filter((turma) => turma.diasSemana?.some((dia) => normalizarDia(dia) === normalizarDia(diasSemana[agora.getDay()]))).length;
  const presencas = frequencias.filter((item) => String(item.presenca).toLowerCase() === 'presente').length;
  const faltas = frequencias.filter((item) => String(item.presenca).toLowerCase() === 'falta').length;
  const taxaPresenca = presencas + faltas ? Math.round((presencas / (presencas + faltas)) * 100) : 0;

  const alunosFaltosos = useMemo(() => {
    const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    const resumo = frequencias.filter((item) => item.data?.startsWith(mesAtual)).reduce<Record<string, { presencas: number; faltas: number }>>((acc, item) => {
      const atual = acc[item.aluno] || { presencas: 0, faltas: 0 };
      if (String(item.presenca).toLowerCase() === 'presente') atual.presencas += 1;
      if (String(item.presenca).toLowerCase() === 'falta') atual.faltas += 1;
      acc[item.aluno] = atual;
      return acc;
    }, {});

    return Object.entries(resumo).filter(([, dados]) => dados.faltas > 0).map(([nome, dados]) => {
      const total = dados.presencas + dados.faltas;
      return {
        nome,
        presenca: total ? Math.round((dados.presencas / total) * 100) : 0,
        falta: total ? Math.round((dados.faltas / total) * 100) : 0,
      };
    }).sort((a, b) => b.falta - a.falta).slice(0, 5);
  }, [agora, frequencias]);

  const ultimasAulas = useMemo(() => turmas.flatMap((turma) => {
    const horaInicio = getHoraInicio(turma.horaInicio, turma.horario);
    const horaFim = getHoraFim(turma.horaFim, turma.horario);
    if (!horaInicio || !turma.diasSemana?.length) return [];
    const [inicioHoras, inicioMinutos] = horaInicio.split(':').map(Number);

    for (let deslocamento = 0; deslocamento <= 7; deslocamento += 1) {
      const inicio = new Date(agora);
      inicio.setDate(agora.getDate() - deslocamento);
      inicio.setHours(inicioHoras, inicioMinutos, 0, 0);
      const dia = normalizarDia(diasSemana[inicio.getDay()]);
      if (!turma.diasSemana.some((item) => normalizarDia(item) === dia)) continue;
      const fim = new Date(inicio);
      if (horaFim) {
        const [fimHoras, fimMinutos] = horaFim.split(':').map(Number);
        fim.setHours(fimHoras, fimMinutos, 0, 0);
      } else fim.setMinutes(fim.getMinutes() + 60);
      if (fim <= agora) return [{ turma, inicio, fim }];
    }
    return [];
  }).sort((a, b) => b.fim.getTime() - a.fim.getTime()).slice(0, 5), [agora, turmas]);

  const stats = useMemo<StatCard[]>(() => [
      {
        icon: <FiUsers size={32} />,
        title: 'Total de Alunos',
        value: alunos.length,
        color: '#2563eb',
        description: 'alunos cadastrados',
      },
      {
        icon: <FiBook size={32} />,
        title: 'Total de Turmas',
        value: turmas.length,
        color: '#10b981',
        description: 'turmas em atividade',
      },
      {
        icon: <FiClock size={32} />,
        title: 'Aulas Hoje',
        value: aulasHoje,
        color: '#f59e0b',
        description: 'programadas para hoje',
      },
      {
        icon: <FiCheckCircle size={32} />,
        title: 'Taxa de Presença',
        value: `${taxaPresenca}%`,
        color: '#8b5cf6',
        description: 'média de participação',
      },
    ], [alunos.length, aulasHoje, taxaPresenca, turmas.length]);

  if (loadingAlunos || loadingTurmas) {
    return (
      <div className="dashboard-loading">
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <div>
            <span className="dashboard-eyebrow"><i aria-hidden="true" /> PAINEL EM TEMPO REAL</span>
            <h2>Acompanhamento acadêmico</h2>
            <p>Uma visão clara dos principais indicadores da sua instituição.</p>
        </div>
          <div className="dashboard-date"><span className="dashboard-date-icon"><FiCalendar aria-hidden="true" /></span><span><small>Última atualização</small><strong>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(agora)}</strong></span></div>
      </div>

      <div className="dashboard-stats">
        {stats.map((stat, index) => (
          <Card key={index} hoverable padding="lg" className="dashboard-stat-card">
            <div className="stat-card">
              <div className="stat-icon">
                {stat.icon}
              </div>
              <div className="stat-content">
                <h3>{stat.title}</h3>
                <p className="stat-value">{stat.value}</p>
                <small>{stat.description}</small>
              </div>
              <FiArrowUpRight className="stat-arrow" aria-hidden="true" />
            </div>
          </Card>
        ))}
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <Card padding="lg" className="dashboard-panel">
            <div className="dashboard-panel-heading"><span className="panel-icon blue"><FiCalendar /></span><div><h2>Próximas Aulas</h2><p>Agenda atualizada em tempo real</p></div></div>
            <div className="upcoming-classes">
              {proximasAulas.length ? proximasAulas.map(({ turma, data, fim, atual }) => <div className={`upcoming-class-item ${atual ? 'current' : 'next'}`} key={`${turma.id}-${data.toISOString()}`}>
                <div className="upcoming-time"><strong>{data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}–{fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong><span>{data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span></div>
                <div className="upcoming-info"><strong>{turma.nome}</strong><span>{turma.professor || 'Professor não informado'} · {turma.sala || 'Sala não definida'}</span></div>
                <span className={`upcoming-badge ${atual ? 'current' : ''}`}>{atual ? 'Agora' : 'Próxima'}</span>
              </div>) : <div className="dashboard-empty"><FiCalendar /><strong>Agenda livre</strong><p>Nenhuma aula futura encontrada.</p></div>}
            </div>
          </Card>
        </div>

        <div className="dashboard-section">
          <Card padding="lg" className="dashboard-panel">
            <div className="dashboard-panel-heading"><span className="panel-icon orange"><FiAlertCircle /></span><div><h2>Alunos Faltosos</h2><p>Acompanhamento de frequência</p></div></div>
            <div className="absent-students">
              {alunosFaltosos.length ? alunosFaltosos.map((aluno) => <div className="absent-student-item" key={aluno.nome}>
                <span>{aluno.nome.charAt(0)}</span>
                <div className="absent-student-info"><strong>{aluno.nome}</strong><div className="attendance-bar"><i style={{ width: `${aluno.presenca}%` }} /></div></div>
                <div className="attendance-percentages"><b className="presence">{aluno.presenca}% presença</b><b className="absence">{aluno.falta}% faltas</b></div>
              </div>) : <div className="dashboard-empty"><FiCheckCircle /><strong>Tudo em ordem</strong><p>Nenhum registro de faltas neste mês.</p></div>}
            </div>
          </Card>
        </div>
      </div>

      <div className="dashboard-footer">
        <Card padding="lg" className="dashboard-panel">
          <div className="dashboard-panel-heading"><span className="panel-icon purple"><FiActivity /></span><div><h2>Atividades Recentes</h2><p>Últimas cinco aulas realizadas</p></div></div>
          <div className="recent-activities">
            {ultimasAulas.length ? ultimasAulas.map(({ turma, inicio, fim }) => <div className="recent-activity-item" key={`${turma.id}-${inicio.toISOString()}`}><span className="present" /><div><strong>{turma.nome}</strong><p>{turma.professor || 'Professor não informado'} · {turma.sala || 'Sala não definida'}</p></div><time><strong>{inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}–{fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong><small>{inicio.toLocaleDateString('pt-BR')}</small></time></div>) : <div className="dashboard-empty compact"><FiActivity /><strong>Sem aulas recentes</strong><p>Nenhuma aula concluída encontrada na grade.</p></div>}
          </div>
        </Card>
      </div>
    </div>
  );
};
