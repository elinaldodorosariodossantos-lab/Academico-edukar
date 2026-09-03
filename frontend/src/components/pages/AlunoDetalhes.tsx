import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiBookOpen, FiClock, FiMapPin, FiUser, FiUsers } from 'react-icons/fi';
import { Button, Card } from '../common';
import { useAlunos } from '../../hooks/useAlunos';
import { useTurmas } from '../../hooks/useTurmas';
import './AlunoDetalhes.css';

const valueOrFallback = (value?: string) => value?.trim() || 'Não informado';

const formatDate = (value?: string, includeTime = false) => {
  if (!value) return 'Não informado';
  const parsed = new Date(includeTime ? value : `${value.split('T')[0]}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', includeTime
    ? { dateStyle: 'short', timeStyle: 'short' }
    : { dateStyle: 'long' }).format(parsed);
};

export const AlunoDetalhes: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { alunos, isLoading } = useAlunos();
  const { turmas } = useTurmas();
  const aluno = alunos.find((item) => item.id === id);
  const turma = turmas.find((item) => item.nome === aluno?.turma);
  const horario = aluno?.horaInicio && aluno?.horaFim
    ? `${aluno.horaInicio} - ${aluno.horaFim}`
    : turma?.horaInicio && turma?.horaFim
      ? `${turma.horaInicio} - ${turma.horaFim}`
      : turma?.horario || 'Não informado';
  const dias = aluno?.diasAula?.length ? aluno.diasAula : turma?.diasSemana || [];

  if (isLoading) {
    return <div className="aluno-profile-state">Carregando dados do aluno...</div>;
  }

  if (!aluno) {
    return (
      <div className="aluno-profile-state">
        <FiUser size={34} />
        <strong>Aluno não encontrado</strong>
        <Button onClick={() => navigate('/alunos')}>Voltar para Alunos</Button>
      </div>
    );
  }

  return (
    <div className="aluno-profile-page">
      <div className="aluno-profile-header">
        <Button variant="secondary" icon={<FiArrowLeft />} onClick={() => navigate('/alunos')}>
          Voltar
        </Button>
        <div className="aluno-profile-identity">
          <span className="aluno-profile-avatar">{aluno.nome.charAt(0).toUpperCase()}</span>
          <div>
            <p>Perfil completo do aluno</p>
            <h1>{aluno.nome}</h1>
          </div>
        </div>
        <span className={`status-badge status-${(aluno.status || 'Ativo').toLowerCase()}`}>
          {aluno.status || 'Ativo'}
        </span>
      </div>

      <div className="aluno-profile-grid">
        <Card padding="lg" className="aluno-profile-card">
          <div className="aluno-profile-card-title"><FiUser /><div><h2>Dados do aluno</h2><p>Informações pessoais e cadastrais</p></div></div>
          <dl className="aluno-profile-fields">
            <div><dt>Nome completo</dt><dd>{aluno.nome}</dd></div>
            <div><dt>CPF</dt><dd>{valueOrFallback(aluno.cpf)}</dd></div>
            <div><dt>Data de nascimento</dt><dd>{formatDate(aluno.dataNascimento)}</dd></div>
            <div><dt>Data de início</dt><dd>{formatDate(aluno.dataInicio)}</dd></div>
            <div><dt>Status</dt><dd>{aluno.status || 'Ativo'}</dd></div>
            <div><dt>Cadastrado em</dt><dd>{formatDate(aluno.createdAt, true)}</dd></div>
            <div><dt>Última atualização</dt><dd>{formatDate(aluno.updatedAt, true)}</dd></div>
          </dl>
        </Card>

        <Card padding="lg" className="aluno-profile-card">
          <div className="aluno-profile-card-title"><FiUsers /><div><h2>Responsável</h2><p>Dados de identificação e contato</p></div></div>
          <dl className="aluno-profile-fields">
            <div><dt>Nome</dt><dd>{valueOrFallback(aluno.responsavel)}</dd></div>
            <div><dt>CPF</dt><dd>{valueOrFallback(aluno.cpfResponsavel)}</dd></div>
            <div><dt>Telefone</dt><dd>{valueOrFallback(aluno.telefone)}</dd></div>
            <div><dt>E-mail</dt><dd>{valueOrFallback(aluno.email)}</dd></div>
          </dl>
        </Card>

        <Card padding="lg" className="aluno-profile-card">
          <div className="aluno-profile-card-title"><FiBookOpen /><div><h2>Turma e aulas</h2><p>Vínculo acadêmico do aluno</p></div></div>
          <dl className="aluno-profile-fields">
            <div><dt>Turma</dt><dd>{valueOrFallback(aluno.turma)}</dd></div>
            <div><dt>Professor</dt><dd>{valueOrFallback(turma?.professor)}</dd></div>
            <div><dt>Sala</dt><dd>{valueOrFallback(turma?.sala)}</dd></div>
            <div><dt><FiClock /> Horário</dt><dd>{horario}</dd></div>
            <div className="profile-field-full"><dt>Dias de aula</dt><dd>{dias.length ? dias.join(', ') : 'Não informado'}</dd></div>
          </dl>
        </Card>

        <Card padding="lg" className="aluno-profile-card">
          <div className="aluno-profile-card-title"><FiMapPin /><div><h2>Endereço</h2><p>Localização do aluno e responsável</p></div></div>
          <dl className="aluno-profile-fields">
            <div className="profile-field-full"><dt>Endereço</dt><dd>{valueOrFallback(aluno.endereco)}</dd></div>
            <div><dt>Bairro</dt><dd>{valueOrFallback(aluno.bairro)}</dd></div>
            <div><dt>Cidade</dt><dd>{valueOrFallback(aluno.cidade)}</dd></div>
            <div><dt>Estado</dt><dd>{valueOrFallback(aluno.estado)}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
};
