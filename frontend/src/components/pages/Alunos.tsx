import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Modal } from '../common';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiEye,
} from 'react-icons/fi';

import { useAlunos } from '../../hooks/useAlunos';
import { useTurmas } from '../../hooks/useTurmas';

import type { Aluno } from '../../types';

import './Alunos.css';

const formatCpf = (value: string) => value
  .replace(/\D/g, '')
  .slice(0, 11)
  .replace(/^(\d{3})(\d)/, '$1.$2')
  .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
  .replace(/\.(\d{3})(\d)/, '.$1-$2');

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 10) return digits.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (digits.length > 6) return digits.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  if (digits.length > 2) return digits.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  return digits.length ? `(${digits}` : '';
};

export const Alunos: React.FC = () => {
  const navigate = useNavigate();
  const {
    alunos,
    isLoading,
    searchAlunos,
    createAluno,
    updateAluno,
    deleteAluno,
  } = useAlunos();

  const { turmas } = useTurmas();

  const getTurmaInfo = (nomeTurma?: string) =>
    turmas.find((turma) => turma.nome === nomeTurma) || null;

  const getHorarioTurma = (nomeTurma?: string) => {
    const turma = getTurmaInfo(nomeTurma);

    if (!turma) return 'Não definido';

    if (turma.horaInicio && turma.horaFim) {
      return `${turma.horaInicio} - ${turma.horaFim}`;
    }

    return turma.horario || 'Não definido';
  };

  const getHorarioDetalhadoAluno = (aluno: Aluno) => {
    const turma = getTurmaInfo(aluno.turma);

    const horario =
      aluno.horaInicio && aluno.horaFim
        ? `${aluno.horaInicio} - ${aluno.horaFim}`
        : turma?.horaInicio && turma?.horaFim
          ? `${turma.horaInicio} - ${turma.horaFim}`
          : turma?.horario || 'Horário não definido';
    const dias = aluno.diasAula?.length ? aluno.diasAula : turma?.diasSemana || [];

    if (!dias.length) {
      return horario;
    }

    const diasFormatados = dias.join(' - ');
    return `${diasFormatados}\n${horario}`;
  };

  const getDiasTurma = (nomeTurma?: string) => {
    const turma = getTurmaInfo(nomeTurma);

    if (!turma) return 'Não definido';

    return turma.diasSemana?.join(', ') || 'Não definido';
  };

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState('');

  const [editingAluno, setEditingAluno] =
    useState<Aluno | null>(null);

  const [formData, setFormData] =
    useState<Partial<Aluno>>({
      nome: '',
      cpf: '',
      dataNascimento: '',
      dataInicio: '',
      responsavel: '',
      cpfResponsavel: '',
      endereco: '',
      bairro: '',
      cidade: '',
      estado: '',
      email: '',
      telefone: '',
      turma: '',
      diasAula: [],
      status: 'Ativo',
    });

  const turmaSelecionada = formData.turma ? getTurmaInfo(formData.turma) : null;

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void searchAlunos(searchTerm);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchAlunos, searchTerm]);

  const handleOpenModal = (
    aluno?: Aluno
  ) => {
    if (aluno) {
      setEditingAluno(aluno);
      setFormData(aluno);
    } else {
      setEditingAluno(null);

      setFormData({
        nome: '',
        cpf: '',
        dataNascimento: '',
        dataInicio: '',
        responsavel: '',
        cpfResponsavel: '',
        endereco: '',
        bairro: '',
        cidade: '',
        estado: '',
        email: '',
        telefone: '',
        turma: '',
        diasAula: [],
        status: 'Ativo',
      });
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAluno(null);
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingAluno) {
        await updateAluno(
          editingAluno.id,
          formData
        );
      } else {
        await createAluno(
          formData as Omit<Aluno, 'id'>
        );
        setSearchTerm('');
      }

      handleCloseModal();
    } catch (error) {
      console.error(
        'Erro ao salvar aluno:',
        error
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (
    id: string
  ) => {
    if (
      window.confirm(
        'Tem certeza que deseja deletar este aluno?'
      )
    ) {
      try {
        await deleteAluno(id);
      } catch (error) {
        console.error(
          'Erro ao deletar aluno:',
          error
        );
      }
    }
  };

  const filteredAlunos = alunos.filter((aluno) => {
    const termo = searchTerm.toLowerCase();
    if (!termo) return true;

    const turmaInfo = getTurmaInfo(aluno.turma);
    const horarioTurma = getHorarioTurma(aluno.turma).toLowerCase();
    const diasTurma = getDiasTurma(aluno.turma).toLowerCase();
    const professorTurma = (turmaInfo?.professor || '').toLowerCase();

    return (
      (aluno.nome || '').toLowerCase().includes(termo) ||
      (aluno.responsavel || '').toLowerCase().includes(termo) ||
      (aluno.telefone || '').toLowerCase().includes(termo) ||
      (aluno.email || '').toLowerCase().includes(termo) ||
      (aluno.turma || '').toLowerCase().includes(termo) ||
      professorTurma.includes(termo) ||
      horarioTurma.includes(termo) ||
      diasTurma.includes(termo)
    );
  });

  return (
    <div className="alunos-container">
      <div className="alunos-header">
        <div>
          <h1>Alunos</h1>
          <p>
            Gerenciar cadastro de alunos
          </p>
        </div>

        <Button
          icon={<FiPlus size={20} />}
          onClick={() =>
            handleOpenModal()
          }
        >
          Novo Aluno
        </Button>
      </div>

      <Card padding="lg">
        <div className="search-bar">
          <FiSearch size={20} />

          <input
            type="text"
            placeholder="Buscar por nome ou turma..."
            value={searchTerm}
            onChange={(e) =>
              handleSearch(
                e.target.value
              )
            }
          />
        </div>

        <div className="alunos-table-wrapper">
          <table className="alunos-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Professor</th>
                <th>Horário</th>
                <th>Responsável</th>
                <th>Dias</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : filteredAlunos.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center text-muted"
                  >
                    Nenhum aluno encontrado
                  </td>
                </tr>
              ) : (
                filteredAlunos.map(
                  (aluno) => {
                    const turmaInfo = getTurmaInfo(aluno.turma);

                    return (
                      <tr key={aluno.id}>
                        <td className="aluno-name">
                          {aluno.nome}
                        </td>

                        <td>{aluno.turma || 'Não definida'}</td>

                        <td>
                          {turmaInfo?.professor || 'Não informado'}
                        </td>

                        <td>
                          {getHorarioDetalhadoAluno(aluno)}
                        </td>

                        <td>
                          <div className="responsavel-cell">
                            <strong>{aluno.responsavel || 'Não informado'}</strong>
                            {aluno.telefone && <span>{aluno.telefone}</span>}
                            {aluno.email && <span>{aluno.email}</span>}
                          </div>
                        </td>

                        <td>
                          {aluno.diasAula?.length ? aluno.diasAula.join(', ') : getDiasTurma(aluno.turma)}
                        </td>

                        <td>
                          <span
                            className={`status-badge status-${(
                              aluno.status || 'ativo'
                            ).toLowerCase()}`}
                          >
                            {aluno.status || 'Ativo'}
                          </span>
                        </td>

                        <td>
                          <div className="aluno-actions">
                            <button
                              type="button"
                              className="action-btn view-btn"
                              onClick={() => navigate(`/alunos/${aluno.id}`)}
                              title="Visualizar"
                              aria-label={`Visualizar dados de ${aluno.nome}`}
                            >
                              <FiEye size={18} />
                            </button>

                            <button
                              type="button"
                              className="action-btn edit-btn"
                              onClick={() =>
                                handleOpenModal(aluno)
                              }
                              title="Editar"
                              aria-label={`Editar dados de ${aluno.nome}`}
                            >
                              <FiEdit2 size={18} />
                            </button>

                            <button
                              type="button"
                              className="action-btn delete-btn"
                              onClick={() =>
                                handleDelete(aluno.id)
                              }
                              title="Deletar"
                              aria-label={`Excluir ${aluno.nome}`}
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) handleCloseModal();
        }}
        title={
          editingAluno
            ? 'Editar Aluno'
            : 'Novo Aluno'
        }
        size="lg"
        footer={
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={
                handleCloseModal
              }
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              {isSubmitting
                ? editingAluno
                  ? 'Atualizando...'
                  : 'Criando...'
                : editingAluno
                  ? 'Atualizar'
                  : 'Criar'}
            </Button>
          </div>
        }
      >
        <form
          className="aluno-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label>
              Nome Completo *
            </label>

            <input
              type="text"
              required
              value={
                formData.nome || ''
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  nome:
                    e.target.value,
                })
              }
            />
          </div>

          <div className="form-row form-row-student">
            <div className="form-group">
              <label>CPF do Aluno <span className="optional-label">(opcional)</span></label>
              <input type="text" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" value={formData.cpf || ''} onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })} />
            </div>

            <div className="form-group">
              <label>
                Data de Nascimento *
              </label>

              <input
                type="date"
                required
                value={
                  formData.dataNascimento ||
                  ''
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dataNascimento:
                      e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Data de início *</label>
              <input
                type="date"
                required
                value={formData.dataInicio || ''}
                onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
              />
            </div>

          </div>

          <div className="form-group">
              <label>
                Turma *
              </label>

              <select
                required
                value={
                  formData.turma ||
                  ''
                }
                onChange={(e) => {
                  const turmaSelecionada = turmas.find(
                    (turma) => turma.nome === e.target.value
                  );

                  setFormData({
                    ...formData,
                    turma: e.target.value,
                    diasAula:
                      turmaSelecionada?.diasSemana || [],
                  });
                }}
              >
                <option value="">
                  Selecione uma turma
                </option>

                {turmas.map(
                  (turma) => (
                    <option
                      key={turma.id}
                      value={
                        turma.nome
                      }
                    >
                      {turma.nome}
                    </option>
                  )
                )}
              </select>
          </div>

          <div className="form-group">
            <h3 className="form-section-title">Dados do responsável</h3>
          </div>

          <div className="form-row">
            <div className="form-group">
            <label>
              Responsável *
            </label>

            <input
              type="text"
              required
              value={
                formData.responsavel ||
                ''
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  responsavel:
                    e.target.value,
                })
              }
            />
            </div>

            <div className="form-group">
              <label>CPF do Responsável <span className="optional-label">(opcional)</span></label>
              <input type="text" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" value={formData.cpfResponsavel || ''} onChange={(e) => setFormData({ ...formData, cpfResponsavel: formatCpf(e.target.value) })} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Telefone *</label>
              <input type="tel" required placeholder="(99) 99999-9999" value={formData.telefone || ''} onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>E-mail *</label>
              <input type="email" required placeholder="responsavel@email.com" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label>Endereço *</label>
            <input type="text" required placeholder="Rua, avenida e número" value={formData.endereco || ''} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
          </div>

          <div className="form-row form-row-address">
            <div className="form-group">
              <label>Bairro *</label>
              <input type="text" required value={formData.bairro || ''} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Cidade *</label>
              <input type="text" required value={formData.cidade || ''} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Estado *</label>
              <input type="text" required maxLength={2} placeholder="UF" value={formData.estado || ''} onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} />
            </div>
          </div>

          {turmaSelecionada && (
            <div className="form-row">
              <div className="form-group">
                <label>Horário da Turma</label>
                <input
                  type="text"
                  value={getHorarioTurma(formData.turma)}
                  readOnly
                />
              </div>

              <div className="form-group">
                <label>Dias da Turma</label>
                <input
                  type="text"
                  value={getDiasTurma(formData.turma)}
                  readOnly
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Status</label>

            <select
              value={
                formData.status ||
                'Ativo'
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status:
                    e.target
                      .value as
                    | 'Ativo'
                    | 'Inativo',
                })
              }
            >
              <option value="Ativo">
                Ativo
              </option>

              <option value="Inativo">
                Inativo
              </option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};
