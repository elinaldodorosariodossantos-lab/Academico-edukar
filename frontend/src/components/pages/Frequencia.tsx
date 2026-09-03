import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../common';
import { FiBookOpen, FiCalendar, FiCheckCircle, FiClock, FiEdit3, FiMessageSquare, FiSave, FiUsers, FiXCircle } from 'react-icons/fi';
import { useFrequencia } from '../../hooks/useFrequencia';
import { useTurmas } from '../../hooks/useTurmas';
import { useAlunos } from '../../hooks/useAlunos';
import type { Frequencia as FrequenciaType } from '../../types';
import './Frequencia.css';

const formatTime = (time?: string) => (time ? `${time}h` : '');

const formatHorario = (
  horaInicio?: string,
  horaFim?: string
) => {
  if (horaInicio && horaFim) {
    return `${formatTime(
      horaInicio
    )} - ${formatTime(horaFim)}`;
  }

  if (horaInicio) {
    return formatTime(horaInicio);
  }

  if (horaFim) {
    return formatTime(horaFim);
  }

  return '';
};

const parseHorario = (horario?: string) => {
  if (!horario) {
    return {
      horaInicio: '',
      horaFim: '',
    };
  }

  const cleaned = horario
    .replace(/h/g, '')
    .trim();

  const parts = cleaned.split(
    /\s*[-–]\s*/
  );

  return {
    horaInicio: parts[0] || '',
    horaFim: parts[1] || '',
  };
};

const getHorarioDisplay = (
  horario?: string,
  horaInicio?: string,
  horaFim?: string
) => {
  const display = formatHorario(
    horaInicio,
    horaFim
  );

  if (display) return display;

  const parsed = parseHorario(horario);

  return formatHorario(
    parsed.horaInicio,
    parsed.horaFim
  );
};

export const Frequencia: React.FC = () => {
  const navigate = useNavigate();
  const { registrarMultipla } =
    useFrequencia();

  const { turmas } = useTurmas();

  const { alunos } = useAlunos();

  const [selectedData, setSelectedData] =
    useState(
      new Date()
        .toISOString()
        .split('T')[0]
    );

  const [
    selectedTurma,
    setSelectedTurma,
  ] = useState('');

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    frequenciaData,
    setFrequenciaData,
  ] = useState<
    Record<
      string,
      {
        presenca:
          | 'Presente'
          | 'Falta';
        conteudo: string;
        observacoes: string;
      }
    >
  >({});

  const [
    conteudoGeral,
    setConteudoGeral,
  ] = useState('');

  const [
    observacoesGeral,
    setObservacoesGeral,
  ] = useState('');

  const turmaAtual = React.useMemo(
    () =>
      turmas.find(
        (t) => t.id === selectedTurma
      ),
    [turmas, selectedTurma]
  );

  const alunosDaTurma =
    React.useMemo(() => {
      if (!turmaAtual?.nome)
        return [];

      return alunos.filter(
        (aluno) =>
          aluno.turma ===
          turmaAtual.nome
      );
    }, [alunos, turmaAtual]);

  const totalPresentes = alunosDaTurma.filter(
    (aluno) => (frequenciaData[aluno.id]?.presenca || 'Presente') === 'Presente'
  ).length;
  const totalFaltas = alunosDaTurma.length - totalPresentes;

  useEffect(() => {
    const newData: typeof frequenciaData =
      {};

    alunosDaTurma.forEach((aluno) => {
      newData[aluno.id] =
        frequenciaData[aluno.id] || {
          presenca: 'Presente',
          conteudo: conteudoGeral,
          observacoes:
            observacoesGeral,
        };
    });

    setFrequenciaData(newData);
  }, [selectedTurma, alunosDaTurma]);

  const handleTogglePresenca = (
    alunoId: string
  ) => {
    const alunoAtual =
      frequenciaData[alunoId] || {
        presenca: 'Presente',
        conteudo: '',
        observacoes: '',
      };

    setFrequenciaData({
      ...frequenciaData,

      [alunoId]: {
        ...alunoAtual,

        presenca:
          alunoAtual.presenca ===
          'Presente'
            ? 'Falta'
            : 'Presente',
      },
    });
  };

  const handleSalvarFrequencia =
    async () => {
      if (isSaving) return;

      if (!selectedTurma) {
        alert(
          'Selecione uma turma'
        );

        return;
      }

      if (alunosDaTurma.length === 0) {
        alert('Não há alunos vinculados a esta turma.');
        return;
      }

      setIsSaving(true);
      try {
        const frequencias: Omit<
          FrequenciaType,
          'id'
        >[] = alunosDaTurma.map(
          (aluno) => ({
            data: selectedData,

            turma:
              turmaAtual?.nome ||
              selectedTurma,

            aluno: aluno.nome,

            presenca:
              frequenciaData[
                aluno.id
              ]?.presenca ||
              'Presente',

            conteudoMinistrado:
              frequenciaData[
                aluno.id
              ]?.conteudo ||
              conteudoGeral,

            observacoes:
              frequenciaData[
                aluno.id
              ]?.observacoes ||
              observacoesGeral,

            professorResponsavel:
              turmaAtual?.professor ||
              'Professor',
          })
        );

        const registrosSalvos = await registrarMultipla(
          frequencias
        );

        if (registrosSalvos.length !== frequencias.length) return;

        navigate('/');
      } catch (error) {
        console.error(
          'Erro ao salvar frequência:',
          error
        );
      } finally {
        setIsSaving(false);
      }
    };

  return (
    <div className="frequencia-container">
      <div className="frequencia-header">
        <div>
          <span className="frequencia-eyebrow">REGISTRO DE AULA</span>
          <h1>
            Controle de Frequência
          </h1>

          <p>
            Registrar presença e
            conteúdo das aulas
          </p>
        </div>
      </div>

      <div className="frequencia-filters">
        <Card padding="lg">
          <div className="frequencia-filter-heading">
            <span><FiCalendar /></span>
            <div><h2>Selecione a aula</h2><p>Informe a data e a turma para registrar a chamada.</p></div>
          </div>
          <div className="frequencia-filter-fields">
          <div className="filter-group">
            <label><FiCalendar /> Data</label>

            <input
              type="date"
              value={
                selectedData
              }
              onChange={(e) =>
                setSelectedData(
                  e.target.value
                )
              }
            />
          </div>

          <div className="filter-group">
            <label><FiUsers /> Turma</label>

            <select
              value={
                selectedTurma
              }
              onChange={(e) =>
                setSelectedTurma(
                  e.target.value
                )
              }
            >
              <option value="">
                Selecione uma
                turma
              </option>

              {turmas.map(
                (turma) => (
                  <option
                    key={turma.id}
                    value={
                      turma.id
                    }
                  >
                    {turma.nome}
                  </option>
                )
              )}
            </select>
          </div>
          </div>
        </Card>
      </div>

      {selectedTurma &&
        turmaAtual && (
          <div className="frequencia-content">
            <Card padding="lg">
              <div className="turma-info-header">
                <div className="turma-info-main">
                  <span className="turma-info-icon"><FiBookOpen /></span>
                  <div>
                  <h2>
                    {
                      turmaAtual.nome
                    }
                  </h2>

                  <p>
                    <strong>Professor:</strong>{' '}
                    {
                      turmaAtual.professor
                    }
                  </p>

                  <p>
                    <FiClock /> <strong>Horário:</strong>{' '}
                    {getHorarioDisplay(
                      turmaAtual.horario,
                      turmaAtual.horaInicio,
                      turmaAtual.horaFim
                    ) ||
                      'Não definido'}
                  </p>
                  </div>
                </div>

                <div className="frequencia-live-summary">
                  <div className="total"><FiUsers /><strong>{alunosDaTurma.length}</strong><span>Alunos</span></div>
                  <div className="present"><FiCheckCircle /><strong>{totalPresentes}</strong><span>Presentes</span></div>
                  <div className="absent"><FiXCircle /><strong>{totalFaltas}</strong><span>Faltas</span></div>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <div className="frequencia-section-heading"><span><FiUsers /></span><div><h3>Frequência dos Alunos</h3><p>Clique no status para alternar entre presença e falta.</p></div></div>

              <div className="alunos-lista">
                <div className="alunos-header">
                  <div className="aluno-col">
                    Aluno
                  </div>

                  <div className="presenca-col">
                    Presença
                  </div>
                </div>

                {alunosDaTurma.length ===
                0 ? (
                  <p className="text-muted">
                    Nenhum aluno
                    vinculado a esta
                    turma.
                  </p>
                ) : (
                  alunosDaTurma.map(
                    (aluno) => (
                      <div
                        key={
                          aluno.id
                        }
                        className="aluno-row"
                      >
                        <div className="aluno-col">
                          <span className="aluno-nome">
                            {
                              aluno.nome
                            }
                          </span>
                        </div>

                        <div className="presenca-col">
                          <button
                            type="button"
                            className={`presenca-btn ${
                              (
                                frequenciaData[
                                  aluno
                                    .id
                                ]
                                  ?.presenca ||
                                'Presente'
                              ) ===
                              'Presente'
                                ? 'presente'
                                : 'falta'
                            }`}
                            onClick={() =>
                              handleTogglePresenca(
                                aluno.id
                              )
                            }
                          >
                            {(
                              frequenciaData[
                                aluno
                                  .id
                              ]
                                ?.presenca ||
                              'Presente'
                            ) ===
                            'Presente'
                              ? '✓ Presente'
                              : '✗ Falta'}
                          </button>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </Card>

            <Card padding="lg" className="frequencia-content-card">
              <div className="frequencia-content-heading">
                <div className="frequencia-section-heading"><span><FiBookOpen /></span><div><h3>Conteúdo da Aula</h3><p>Registre de forma clara o que foi trabalhado com a turma.</p></div></div>
                <div className="frequencia-class-context"><span><FiCalendar /> {new Date(`${selectedData}T12:00:00`).toLocaleDateString('pt-BR')}</span><span><FiUsers /> {turmaAtual.nome}</span></div>
              </div>

              <div className="frequencia-content-fields">
                <div className="content-field topic-field">
                  <div className="content-field-label"><span><FiEdit3 /></span><div><label htmlFor="tema-aula">Tema da aula</label><small>Assunto principal apresentado aos alunos</small></div></div>
                  <input
                    id="tema-aula"
                    type="text"
                    placeholder="Ex.: Introdução à programação e lógica"
                    value={conteudoGeral}
                    onChange={(e) => setConteudoGeral(e.target.value)}
                  />
                  <span className="content-field-counter">{conteudoGeral.length} caracteres</span>
                </div>

                <div className="content-field notes-field">
                  <div className="content-field-label"><span><FiMessageSquare /></span><div><label htmlFor="observacoes-aula">Observações gerais</label><small>Anotações importantes sobre o desenvolvimento da aula</small></div></div>
                  <textarea
                    id="observacoes-aula"
                    placeholder="Ex.: Participação da turma, atividades realizadas e pontos para a próxima aula"
                    value={observacoesGeral}
                    onChange={(e) => setObservacoesGeral(e.target.value)}
                    rows={4}
                  />
                  <span className="content-field-counter">{observacoesGeral.length} caracteres</span>
                </div>
              </div>
            </Card>

            <div className="frequencia-actions">
              <Button
                variant="success"
                size="lg"
                icon={
                  <FiSave
                    size={20}
                  />
                }
                onClick={
                  handleSalvarFrequencia
                }
                loading={isSaving}
              >
                {isSaving ? 'Salvando...' : 'Salvar Frequência'}
              </Button>
            </div>
          </div>
        )}

      {!selectedTurma && (
        <Card padding="lg">
          <p className="text-muted text-center">
            Selecione uma turma
            para registrar
            frequência
          </p>
        </Card>
      )}
    </div>
  );
};
