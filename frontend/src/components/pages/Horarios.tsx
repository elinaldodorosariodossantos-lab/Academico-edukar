import React from 'react';
import { Card } from '../common';
import { useTurmas } from '../../hooks/useTurmas';
import './Horarios.css';

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export const Horarios: React.FC = () => {
  const { turmas, isLoading } = useTurmas();

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Horário semanal</h1>
          <p>Visualize os horários das turmas durante a semana</p>
        </div>
      </div>

      <Card padding="lg">
        {isLoading ? (
          <p className="text-muted">Carregando horários...</p>
        ) : turmas.length === 0 ? (
          <p className="text-muted">Nenhuma turma cadastrada.</p>
        ) : (
          <div className="horarios-table-wrap">
            <table className="horarios-week-table">
              <thead>
                <tr>
                  <th>Turma</th>
                  {DIAS_SEMANA.map((dia) => <th key={dia}>{dia}</th>)}
                </tr>
              </thead>
              <tbody>
                {turmas.map((turma) => (
                  <tr key={turma.id}>
                    <td className="horarios-turma-cell">
                      {turma.nome}
                      <div>{turma.professor || 'Sem professor'}</div>
                    </td>
                    {DIAS_SEMANA.map((dia) => {
                      const temAula = turma.diasSemana?.includes(dia);
                      const horario = turma.horaInicio && turma.horaFim
                        ? `${turma.horaInicio} - ${turma.horaFim}`
                        : turma.horario || 'Horário não definido';

                      return (
                        <td key={`${turma.id}-${dia}`} className={temAula ? 'horarios-aula-cell active' : 'horarios-aula-cell'}>
                          {temAula ? (
                            <div className="horarios-aula-info">
                              <strong>{horario}</strong>
                              <span>{turma.sala || 'Sala não definida'}</span>
                            </div>
                          ) : <span className="horarios-no-aula">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
