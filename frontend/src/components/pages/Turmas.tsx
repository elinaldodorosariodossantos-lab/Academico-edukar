import React, { useState } from 'react';
import { Card, Button, Modal } from '../common';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useTurmas } from '../../hooks/useTurmas';
import type { Turma } from '../../types';
import './Turmas.css';

const DIAS_SEMANA = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];

export const Turmas: React.FC = () => {
  const {
    turmas,
    isLoading,
    createTurma,
    updateTurma,
    deleteTurma,
  } = useTurmas();

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingTurma, setEditingTurma] =
    useState<Turma | null>(null);

  const [formData, setFormData] = useState<
    Partial<Turma>
  >({
    nome: '',
    professor: '',
    horario: '',
    horaInicio: '',
    horaFim: '',
    diasSemana: [],
    quantidadeAlunos: 0,
    sala: '',
  });

  const handleOpenModal = (turma?: Turma) => {
    if (turma) {
      setEditingTurma(turma);

      setFormData({
        ...turma,
        horaInicio: turma.horaInicio || '',
        horaFim: turma.horaFim || '',
      });
    } else {
      setEditingTurma(null);

      setFormData({
        nome: '',
        professor: '',
        horario: '',
        horaInicio: '',
        horaFim: '',
        diasSemana: [],
        quantidadeAlunos: 0,
        sala: '',
      });
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTurma(null);
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      const horarioCompleto = `${formData.horaInicio} - ${formData.horaFim}`;

      const dadosTurma = {
        ...formData,
        horario: horarioCompleto,
      };

      if (editingTurma) {
        await updateTurma(
          editingTurma.id,
          dadosTurma
        );
      } else {
        await createTurma(
          dadosTurma as Omit<Turma, 'id'>
        );
      }

      handleCloseModal();
    } catch (error) {
      console.error(
        'Erro ao salvar turma:',
        error
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        'Tem certeza que deseja deletar esta turma?'
      )
    ) {
      try {
        await deleteTurma(id);
      } catch (error) {
        console.error(
          'Erro ao deletar turma:',
          error
        );
      }
    }
  };

  const toggleDia = (dia: string) => {
    setFormData({
      ...formData,
      diasSemana: formData.diasSemana?.includes(dia)
        ? formData.diasSemana.filter(
            (d) => d !== dia
          )
        : [
            ...(formData.diasSemana || []),
            dia,
          ],
    });
  };

  return (
    <div className="turmas-container">
      <div className="turmas-header">
        <div>
          <h1>Turmas</h1>
          <p>
            Gerenciar cadastro de turmas
          </p>
        </div>

        <Button
          icon={<FiPlus size={20} />}
          onClick={() => handleOpenModal()}
        >
          Nova Turma
        </Button>
      </div>

      <div className="turmas-grid">
        {isLoading ? (
          <p className="text-muted">
            Carregando turmas...
          </p>
        ) : turmas.length === 0 ? (
          <p className="text-muted">
            Nenhuma turma cadastrada
          </p>
        ) : (
          turmas.map((turma) => (
            <Card
              key={turma.id}
              hoverable
              padding="lg"
              className="turma-card"
            >
              <div className="turma-card-header">
                <div>
                  <h3>{turma.nome}</h3>

                  <p className="text-muted">
                    {turma.professor}
                  </p>
                </div>

                <div className="turma-actions">
                  <button
                    className="action-btn"
                    onClick={() =>
                      handleOpenModal(turma)
                    }
                    title="Editar"
                  >
                    <FiEdit2 size={18} />
                  </button>

                  <button
                    className="action-btn delete-btn"
                    onClick={() =>
                      handleDelete(turma.id)
                    }
                    title="Deletar"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>


              <div className="turma-card-body">
                <div className="turma-info">
                  <p className="text-small">
                    <strong>Dias:</strong>{' '}
                    {turma.diasSemana?.join(
                      ', '
                    ) || 'Não definido'}
                  </p>
                  
                  <p>
                    <strong>Horário:</strong>{' '}
                    {turma.horario}
                  </p>

                  <p>
                    <strong>Sala:</strong>{' '}
                    {turma.sala ||
                      'Não definida'}
                  </p>

                  <p>
                    <strong>Alunos:</strong>{' '}
                    {turma.quantidadeAlunos}
                  </p>
                </div>

              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          editingTurma
            ? 'Editar Turma'
            : 'Nova Turma'
        }
        size="md"
        footer={
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={handleCloseModal}
            >
              Cancelar
            </Button>

            <Button onClick={handleSubmit}>
              {editingTurma
                ? 'Atualizar'
                : 'Criar'}
            </Button>
          </div>
        }
      >
        <form
          className="turma-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label>
              Nome da Turma *
            </label>

            <input
              type="text"
              required
              value={formData.nome || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  nome: e.target.value,
                })
              }
            />
          </div>

          <div className="form-group">
            <label>Professor *</label>

            <input
              type="text"
              required
              value={
                formData.professor || ''
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  professor:
                    e.target.value,
                })
              }
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Horário de Início *
              </label>

              <input
                type="time"
                required
                value={
                  formData.horaInicio || ''
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    horaInicio:
                      e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>
                Horário de Término *
              </label>

              <input
                type="time"
                required
                value={
                  formData.horaFim || ''
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    horaFim:
                      e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Sala</label>

              <input
                type="text"
                value={formData.sala || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sala: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              Dias da Semana
            </label>

            <div className="dias-checkbox">
              {DIAS_SEMANA.map((dia) => (
                <label
                  key={dia}
                  className="checkbox-label"
                >
                  <input
                    type="checkbox"
                    checked={
                      formData.diasSemana?.includes(
                        dia
                      ) || false
                    }
                    onChange={() =>
                      toggleDia(dia)
                    }
                  />

                  <span>{dia}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};