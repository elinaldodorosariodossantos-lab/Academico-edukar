import React, { useMemo, useRef, useState } from 'react';
import { FiCalendar, FiCheckCircle, FiEdit2, FiEye, FiSave, FiTrash2, FiUsers, FiXCircle } from 'react-icons/fi';
import { Button, Card, Modal } from '../common';
import { useFrequencia } from '../../hooks/useFrequencia';
import { useTurmas } from '../../hooks/useTurmas';
import { useAlunos } from '../../hooks/useAlunos';
import type { Frequencia } from '../../types';
import { displayDate, DUPLICATE_FREQUENCIA_MESSAGE, groupFrequencias, isAbsent, isPresent, localDate } from '../../utils/frequencia';
import type { FrequenciaGrupo } from '../../utils/frequencia';
import './FrequenciaHistorico.css';

interface Props { newOpen: boolean; onCloseNew: () => void }

export const FrequenciaHistorico: React.FC<Props> = ({ newOpen, onCloseNew }) => {
  const { frequencias, isLoading, error, fetchFrequencias, registrarMultipla, updateRegistro, deleteRegistro } = useFrequencia();
  const { turmas, isLoading: loadingTurmas, error: errorTurmas } = useTurmas();
  const { alunos, isLoading: loadingAlunos, error: errorAlunos } = useAlunos();
  const groups = useMemo(() => groupFrequencias(frequencias, turmas), [frequencias, turmas]);
  const currentMonth = localDate().slice(0, 7);
  const monthlyGroups = useMemo(() => groups.filter((group) => group.data?.slice(0, 7) === currentMonth), [groups, currentMonth]);
  const latest = useMemo(() => [...groups].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || (b.data || '').localeCompare(a.data || ''))[0], [groups]);
  const [selected, setSelected] = useState<FrequenciaGrupo | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [turmaId, setTurmaId] = useState('');
  const [date, setDate] = useState(localDate);
  const [statuses, setStatuses] = useState<Record<string, Frequencia['presenca']>>({});
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [contentChanged, setContentChanged] = useState(false);
  const [notesChanged, setNotesChanged] = useState(false);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const turma = turmas.find((item) => item.id === turmaId);
  const duplicate = groups.find((group) => group.turma === (newOpen ? turma?.nome : selected?.turma) && group.data === date && (newOpen || group.key !== selected?.key));
  const students = useMemo(() => alunos.filter((aluno) => turma && aluno.turma === turma.nome)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [alunos, turma]);
  const rows = newOpen ? students.map((aluno) => ({ id: aluno.id, name: aluno.nome }))
    : (selected?.registros || []).map((registro) => ({ id: registro.id, name: registro.aluno }));
  const presentes = rows.filter((row) => statuses[row.id] === 'Presente').length;
  const ausentes = rows.filter((row) => statuses[row.id] === 'Falta').length;
  const close = () => {
    if (busyRef.current) return;
    onCloseNew(); setSelected(null); setFormError(''); setStatuses({}); setTurmaId(''); setDate(localDate()); setContent(''); setNotes('');
  };
  const open = (group: FrequenciaGrupo, nextMode: typeof mode) => {
    onCloseNew(); setContent(group.registros[0]?.conteudoMinistrado || ''); setNotes(group.registros[0]?.observacoes || '');
    setContentChanged(false); setNotesChanged(false);
    setSelected(group); setMode(nextMode); setDate(group.data); setFormError('');
    setStatuses(Object.fromEntries(group.registros.filter((item) => isPresent(item.presenca) || isAbsent(item.presenca))
      .map((item) => [item.id, isPresent(item.presenca) ? 'Presente' : 'Falta'])));
  };
  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (busyRef.current) return;
    setFormError('');
    if (!date || (newOpen && !turma)) { setFormError('Selecione a turma e a data da frequência.'); return; }
    if (!rows.length) { setFormError('Não há alunos vinculados a esta turma.'); return; }
    if (rows.some((row) => !statuses[row.id])) { setFormError('Informe Presente ou Ausente para todos os alunos.'); return; }
    const targetTurma = newOpen ? turma!.nome : selected!.turma;
    if (groups.some((group) => group.turma === targetTurma && group.data === date && (newOpen || group.key !== selected?.key))) {
      setFormError(DUPLICATE_FREQUENCIA_MESSAGE); return;
    }
    busyRef.current = true; setBusy(true);
    let saved = false;
    try {
      if (newOpen) {
        await registrarMultipla(students.map((aluno) => ({ data: date, turma: turma!.nome, aluno: aluno.nome,
          presenca: statuses[aluno.id], conteudoMinistrado: content, observacoes: notes, professorResponsavel: turma!.professor || 'Professor' })));
      } else if (selected) {
        await updateRegistro(selected.registros, date, statuses, { ...(contentChanged ? { conteudoMinistrado: content } : {}), ...(notesChanged ? { observacoes: notes } : {}) });
      }
      saved = true;
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Não foi possível salvar a frequência.');
      void fetchFrequencias();
    } finally { busyRef.current = false; setBusy(false); }
    if (saved) close();
  };
  const remove = async () => {
    if (!selected || busyRef.current) return;
    busyRef.current = true; setBusy(true); setFormError('');
    let removed = false;
    try { await deleteRegistro(selected.registros); removed = true; }
    catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Não foi possível excluir a frequência.'); void fetchFrequencias(); }
    finally { busyRef.current = false; setBusy(false); }
    if (removed) close();
  };
  const editable = newOpen || mode === 'edit';

  return <section className="frequency-records" aria-label="Histórico de frequências">
    {isLoading ? <Card><p role="status">Carregando frequências...</p></Card> : error ? <Card><p role="alert">Não foi possível carregar o histórico de frequências.</p><Button variant="outline" onClick={() => void fetchFrequencias()}>Tentar novamente</Button></Card> : <>
      <Card padding="lg" className="frequency-latest">
        <div className="frequency-latest-header">
          <div className="frequency-record-heading"><div><small>Última Frequência Realizada</small><h2>{latest ? `Frequência do dia ${displayDate(latest.data)}` : 'Nenhuma frequência registrada'}</h2></div></div>
          {latest && <Button className="frequency-latest-edit" variant="outline" icon={<FiEdit2 />} aria-label="Editar última frequência" title="Editar frequência" onClick={() => open(latest, 'edit')}>{null}</Button>}
        </div>
        {!latest && <p>Use Nova Frequência para registrar a chamada da turma.</p>}
        {latest && <>
          <div className="frequency-latest-class">
            <span className="frequency-latest-label">Turma</span>
            <h3>{latest.turma}</h3>
            <div className="frequency-record-totals"><span className="frequency-count present"><FiCheckCircle aria-hidden="true" /><strong>{latest.presentes}</strong> Presentes</span><span className="frequency-count absent"><FiXCircle aria-hidden="true" /><strong>{latest.ausentes}</strong> Ausentes</span></div>
          </div>
          <div className="frequency-latest-subject">
            <h3 className="frequency-latest-label">Assunto</h3>
            <p>{[...new Set(latest.registros.map((item) => item.conteudoMinistrado).filter(Boolean))].join(' • ') || 'Não informado'}</p>
          </div>
          <table className="frequency-latest-table" aria-label="Alunos da última frequência">
            <thead><tr><th scope="col">Aluno</th><th scope="col">Status</th></tr></thead>
            <tbody>{latest.registros.map((item) => <tr key={item.id}>
              <td>{item.aluno}</td>
              <td><span className={`frequency-count ${isPresent(item.presenca) ? 'present' : isAbsent(item.presenca) ? 'absent' : ''}`}>
                {isPresent(item.presenca) ? <FiCheckCircle aria-hidden="true" /> : isAbsent(item.presenca) ? <FiXCircle aria-hidden="true" /> : null}
                {isPresent(item.presenca) ? 'Presente' : isAbsent(item.presenca) ? 'Ausente' : 'Não informado'}
              </span></td>
            </tr>)}</tbody>
          </table>
        </>}
      </Card>
      <Card padding="lg">
        <div className="frequency-record-heading"><span className="frequency-record-icon"><FiUsers /></span><div><h2>Histórico de frequências</h2><p>{monthlyGroups.length} {monthlyGroups.length === 1 ? 'chamada registrada' : 'chamadas registradas'} neste mês · {currentMonth.split('-').reverse().join('/')}</p></div></div>
        <div className="frequency-history-scroll" tabIndex={0} role="region" aria-label="Tabela de frequências">
          <table className="frequency-history-table"><thead><tr><th scope="col">Data</th><th scope="col">Turma</th><th scope="col">Presentes</th><th scope="col">Ausentes</th><th scope="col">Ações</th></tr></thead><tbody>
            {monthlyGroups.length === 0 ? <tr><td colSpan={5} className="frequency-empty">Nenhuma frequência registrada neste mês.</td></tr> : monthlyGroups.map((group) => <tr key={group.key}>
              <td>{displayDate(group.data)}</td><td><strong>{group.turma}</strong></td><td><span className="frequency-count present">{group.presentes}</span></td><td><span className="frequency-count absent">{group.ausentes}</span></td>
              <td><div className="frequency-row-actions"><Button size="sm" variant="outline" icon={<FiEye />} onClick={() => open(group, 'view')} title="Visualizar" aria-label={`Visualizar frequência de ${group.turma} em ${displayDate(group.data)}`}>{null}</Button><Button size="sm" variant="outline" icon={<FiEdit2 />} onClick={() => open(group, 'edit')} title="Editar" aria-label="Editar">{null}</Button><Button size="sm" variant="danger" icon={<FiTrash2 />} onClick={() => open(group, 'delete')} title="Excluir" aria-label="Excluir">{null}</Button></div></td>
            </tr>)}
          </tbody></table>
        </div>
      </Card>
    </>}
    <Modal isOpen={newOpen || selected !== null} onClose={close} size={mode === 'delete' && !newOpen ? 'md' : 'lg'} title={newOpen ? 'Nova Frequência' : mode === 'edit' ? 'Editar frequência' : mode === 'delete' ? 'Excluir frequência' : 'Visualizar frequência'}
      footer={<div className="frequency-modal-actions"><Button variant="secondary" disabled={busy} onClick={close}>{editable || mode === 'delete' ? 'Cancelar' : 'Fechar'}</Button>{editable ? <Button form="frequency-record-form" type="submit" icon={<FiSave />} loading={busy} disabled={!!duplicate || isLoading || !!error || (newOpen && (loadingAlunos || loadingTurmas || !!errorAlunos || !!errorTurmas))}>Salvar frequência</Button> : mode === 'delete' ? <Button variant="danger" icon={<FiTrash2 />} loading={busy} onClick={() => void remove()}>Excluir frequência</Button> : null}</div>}>
      <div className="frequency-record-modal">
        {(duplicate || formError) && <p className="frequency-form-error" role="alert">{duplicate ? DUPLICATE_FREQUENCIA_MESSAGE : formError}</p>}
        {duplicate && <Button variant="outline" disabled={busy} onClick={() => open(duplicate, 'edit')}>Abrir Frequência Existente</Button>}
        {mode === 'delete' && !newOpen ? <><p>Tem certeza que deseja excluir esta frequência? Esta ação não poderá ser desfeita.</p><p><strong>{selected?.turma}</strong> · {displayDate(selected?.data || '')}</p></> :
          <form id="frequency-record-form" onSubmit={submit}>
            <fieldset disabled={busy}>
              <div className="frequency-modal-fields">
                <div><label htmlFor="frequency-record-turma">Turma{newOpen ? ' *' : ''}</label>{newOpen ? <select id="frequency-record-turma" required value={turmaId} onChange={(event) => { setTurmaId(event.target.value); setStatuses({}); setFormError(''); }}><option value="">Selecione uma turma</option>{turmas.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select> : <p id="frequency-record-turma">{selected?.turma}</p>}</div>
                <div><label htmlFor="frequency-record-date">Data da frequência{editable ? ' *' : ''}</label>{editable ? <input id="frequency-record-date" type="date" required value={date} onChange={(event) => { setDate(event.target.value); setFormError(''); }} /> : <p id="frequency-record-date">{displayDate(selected?.data || '')}</p>}</div>
              </div>
              {newOpen && (loadingAlunos || loadingTurmas) ? <p role="status">Carregando turmas e alunos...</p> : newOpen && (errorAlunos || errorTurmas) ? <p role="alert">Não foi possível carregar turmas e alunos. Feche a janela e atualize a página para tentar novamente.</p> : <>
                {newOpen && turma && <p><strong>Professor:</strong> {turma.professor || 'Não informado'} · <strong>Horário:</strong> {turma.horario || [turma.horaInicio, turma.horaFim].filter(Boolean).join(' - ') || 'Não definido'}</p>}
                <div className="frequency-roster-heading"><h3>Alunos da turma</h3><span>{rows.length} alunos · {presentes} presentes · {ausentes} ausentes</span></div>
                {rows.length === 0 && <p className="frequency-empty">{newOpen && !turmaId ? 'Selecione uma turma para carregar os alunos.' : 'Nenhum aluno vinculado a esta turma.'}</p>}
                <ul className="frequency-roster">{rows.map((row) => <li key={row.id}><strong>{row.name}</strong>{editable ? <button type="button" className="frequency-status-control" data-status={statuses[row.id] || 'pending'} aria-label={`Presença de ${row.name}`} aria-pressed={statuses[row.id] === 'Presente'} title={statuses[row.id] === 'Presente' ? 'Marcar como ausente' : 'Marcar como presente'} onClick={() => setStatuses((current) => ({ ...current, [row.id]: current[row.id] === 'Presente' ? 'Falta' : 'Presente' }))}>
                  {statuses[row.id] === 'Presente' ? <FiCheckCircle aria-hidden="true" /> : statuses[row.id] === 'Falta' ? <FiXCircle aria-hidden="true" /> : null}
                  {statuses[row.id] === 'Presente' ? 'Presente' : statuses[row.id] === 'Falta' ? 'Ausente' : 'Marcar presença'}
                </button> : <span className={`frequency-count ${statuses[row.id] === 'Presente' ? 'present' : statuses[row.id] === 'Falta' ? 'absent' : ''}`}>{statuses[row.id] === 'Presente' ? 'Presente' : statuses[row.id] === 'Falta' ? 'Ausente' : 'Não informado'}</span>}</li>)}</ul>
              </>}
              {editable && <div className="frequency-modal-fields frequency-notes"><div><label htmlFor="frequency-record-content">Assunto da aula</label><textarea id="frequency-record-content" rows={3} value={content} onChange={(event) => { setContent(event.target.value); setContentChanged(true); }} /></div><div><label htmlFor="frequency-record-notes">Observações gerais</label><textarea id="frequency-record-notes" rows={3} value={notes} onChange={(event) => { setNotes(event.target.value); setNotesChanged(true); }} /></div></div>}
            </fieldset>
          </form>}
      </div>
    </Modal>
  </section>;
};
