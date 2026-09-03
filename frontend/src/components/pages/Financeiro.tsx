import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeStatus, Button, Card } from '../common';
import { useAlunos } from '../../hooks/useAlunos';
import { useTurmas } from '../../hooks/useTurmas';
import { financeiroCursoService, financeiroPerfilService, financeiroService } from '../../services/api';
import type { FinanceiroAluno, FinanceiroCurso, FinanceiroModalidade, FinanceiroPerfil, FinanceiroStatus } from '../../types';
import './Financeiro.css';

type FinanceiroAba = 'perfil' | 'cursos' | 'mensalidades';

const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  .map((label, index) => ({ value: index + 1, label }));
const anos = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - 2 + index);
const statusOptions: FinanceiroStatus[] = ['Pago', 'Permuta', 'Pendente'];
const modalidadeOptions: FinanceiroModalidade[] = ['Boleto', 'Permuta'];
const FINANCEIRO_QUERY_KEY = ['financeiro', 'mensalidades'] as const;
const FINANCEIRO_PERFIS_QUERY_KEY = ['financeiro', 'perfis'] as const;
const FINANCEIRO_CURSOS_QUERY_KEY = ['financeiro', 'cursos'] as const;

const getDefaultRow = (aluno: any, mes: number, ano: number, modalidade: FinanceiroModalidade, valorMensalidade = 0): FinanceiroAluno => ({
  alunoId: aluno.id,
  alunoNome: aluno.nome,
  curso: aluno.turma || 'Sem curso',
  turma: aluno.turma || 'Sem turma',
  valorMensalidade,
  mesReferencia: mes,
  anoReferencia: ano,
  boletoEmitido: 'Não',
  statusPagamento: modalidade === 'Permuta' ? 'Permuta' : 'Pendente',
  observacoes: '',
});

export const Financeiro: React.FC = () => {
  const queryClient = useQueryClient();
  const { alunos, isLoading: loadingAlunos } = useAlunos();
  const { turmas, isLoading: loadingTurmas } = useTurmas();
  const hoje = new Date();
  const [abaAtiva, setAbaAtiva] = useState<FinanceiroAba>('perfil');
  const [registros, setRegistros] = useState<FinanceiroAluno[]>([]);
  const [perfis, setPerfis] = useState<FinanceiroPerfil[]>([]);
  const [cursosFinanceiros, setCursosFinanceiros] = useState<FinanceiroCurso[]>([]);
  const [mesFiltro, setMesFiltro] = useState(hoje.getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState(hoje.getFullYear());
  const [cursoFiltro, setCursoFiltro] = useState('Todos');
  const [statusFiltro, setStatusFiltro] = useState<'Todos' | FinanceiroStatus>('Todos');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingPerfis, setSavingPerfis] = useState(false);
  const [savingCursos, setSavingCursos] = useState(false);
  const registrosQuery = useQuery({ queryKey: FINANCEIRO_QUERY_KEY, queryFn: () => financeiroService.getAll() });
  const perfisQuery = useQuery({ queryKey: FINANCEIRO_PERFIS_QUERY_KEY, queryFn: () => financeiroPerfilService.getAll() });
  const cursosQuery = useQuery({ queryKey: FINANCEIRO_CURSOS_QUERY_KEY, queryFn: () => financeiroCursoService.getAll() });

  useEffect(() => {
    if (registrosQuery.data) setRegistros(registrosQuery.data);
  }, [registrosQuery.data]);

  useEffect(() => {
    if (perfisQuery.data) setPerfis(perfisQuery.data);
  }, [perfisQuery.data]);

  useEffect(() => {
    if (cursosQuery.data) setCursosFinanceiros(cursosQuery.data);
  }, [cursosQuery.data]);

  const alunosAtivos = useMemo(() => [...alunos]
    .filter((aluno) => aluno.status === 'Ativo')
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')), [alunos]);
  const modalidadesPorAluno = useMemo(() => new Map(perfis.map((perfil) => [perfil.alunoId, perfil.modalidade])), [perfis]);
  const mensalidadesPorTurma = useMemo(() => new Map(cursosFinanceiros.map((curso) => [curso.turmaNome, curso.valorMensalidade])), [cursosFinanceiros]);
  const cursosDisponiveis = useMemo(() => Array.from(new Set(
    [...turmas.map((turma) => turma.nome), ...alunosAtivos.map((aluno) => aluno.turma)].filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'pt-BR')), [alunosAtivos, turmas]);

  const alunosFinanceiros = useMemo(() => {
    const doPeriodo = new Map(registros
      .filter((item) => item.mesReferencia === mesFiltro && item.anoReferencia === anoFiltro)
      .map((item) => [item.alunoId, item]));
    return alunosAtivos.map((aluno) => {
      const modalidade = modalidadesPorAluno.get(aluno.id) ?? 'Boleto';
      const salvo = doPeriodo.get(aluno.id);
      const registro = salvo ?? getDefaultRow(aluno, mesFiltro, anoFiltro, modalidade, mensalidadesPorTurma.get(aluno.turma) ?? 0);
      return {
        ...registro,
        alunoNome: aluno.nome,
        curso: aluno.turma || 'Sem curso',
        turma: aluno.turma || 'Sem turma',
      };
    });
  }, [alunosAtivos, anoFiltro, mensalidadesPorTurma, mesFiltro, modalidadesPorAluno, registros]);

  const linhasFiltradas = useMemo(() => alunosFinanceiros.filter((linha) =>
    (cursoFiltro === 'Todos' || linha.curso === cursoFiltro) &&
    (statusFiltro === 'Todos' || linha.statusPagamento === statusFiltro)
  ), [alunosFinanceiros, cursoFiltro, statusFiltro]);

  const resumo = useMemo(() => {
    const base = linhasFiltradas.length ? linhasFiltradas : alunosFinanceiros;
    return {
      totalAlunos: base.length,
      totalPagos: base.filter((item) => item.statusPagamento === 'Pago').length,
      totalPendentes: base.filter((item) => item.statusPagamento === 'Pendente').length,
      totalPermutas: base.filter((item) => item.statusPagamento === 'Permuta').length,
      receitaPrevista: base.reduce((total, item) => total + Number(item.valorMensalidade || 0), 0),
      receitaRecebida: base.filter((item) => item.statusPagamento === 'Pago').reduce((total, item) => total + Number(item.valorMensalidade || 0), 0),
      receitaPendente: base.filter((item) => item.statusPagamento === 'Pendente').reduce((total, item) => total + Number(item.valorMensalidade || 0), 0),
    };
  }, [alunosFinanceiros, linhasFiltradas]);

  const handleModalidadeChange = (alunoId: string, modalidade: FinanceiroModalidade) => {
    setPerfis((prev) => prev.some((perfil) => perfil.alunoId === alunoId)
      ? prev.map((perfil) => perfil.alunoId === alunoId ? { ...perfil, modalidade } : perfil)
      : [...prev, { alunoId, modalidade }]);
    setRegistros((prev) => prev.map((registro) =>
      registro.alunoId === alunoId && registro.mesReferencia === mesFiltro && registro.anoReferencia === anoFiltro
        ? { ...registro, statusPagamento: modalidade === 'Permuta' ? 'Permuta' : 'Pendente' }
        : registro));
  };

  const handleSalvarPerfis = async () => {
    setSavingPerfis(true);
    try {
      const configuracoes = alunosAtivos.map((aluno) => ({
        alunoId: aluno.id,
        modalidade: modalidadesPorAluno.get(aluno.id) ?? 'Boleto' as FinanceiroModalidade,
      }));
      const perfisSalvos = await financeiroPerfilService.upsertMany(configuracoes);
      const registrosDoPeriodo = new Map(
        registros
          .filter((item) => item.mesReferencia === mesFiltro && item.anoReferencia === anoFiltro)
          .map((item) => [item.alunoId, item])
      );
      const mensalidadesSalvas = await Promise.all(alunosAtivos.map((aluno) => {
        const modalidade = modalidadesPorAluno.get(aluno.id) ?? 'Boleto';
        const existente = registrosDoPeriodo.get(aluno.id);
        const valorCurso = mensalidadesPorTurma.get(aluno.turma) ?? 0;
        const linha = existente ?? getDefaultRow(aluno, mesFiltro, anoFiltro, modalidade, valorCurso);
        const statusPagamento: FinanceiroStatus = modalidade === 'Permuta'
          ? 'Permuta'
          : linha.statusPagamento === 'Permuta' ? 'Pendente' : linha.statusPagamento;

        return financeiroService.upsert({
          ...linha,
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          curso: aluno.turma || 'Sem curso',
          turma: aluno.turma || 'Sem turma',
          mesReferencia: mesFiltro,
          anoReferencia: anoFiltro,
          boletoEmitido: 'Não',
          valorMensalidade: valorCurso,
          statusPagamento,
        });
      }));

      setPerfis(perfisSalvos);
      setRegistros((prev) => [
        ...mensalidadesSalvas,
        ...prev.filter((item) => item.mesReferencia !== mesFiltro || item.anoReferencia !== anoFiltro),
      ]);
      queryClient.setQueryData(FINANCEIRO_PERFIS_QUERY_KEY, perfisSalvos);
      queryClient.setQueryData<FinanceiroAluno[]>(FINANCEIRO_QUERY_KEY, (current = []) => [
        ...mensalidadesSalvas,
        ...current.filter((item) => item.mesReferencia !== mesFiltro || item.anoReferencia !== anoFiltro),
      ]);
      setAbaAtiva('mensalidades');
    } finally { setSavingPerfis(false); }
  };

  const handleCursoValueChange = (turmaId: string, turmaNome: string, valor: number) => {
    setCursosFinanceiros((prev) => prev.some((curso) => curso.turmaId === turmaId)
      ? prev.map((curso) => curso.turmaId === turmaId ? { ...curso, turmaNome, valorMensalidade: valor } : curso)
      : [...prev, { turmaId, turmaNome, valorMensalidade: valor }]);
  };

  const handleSalvarCursos = async () => {
    setSavingCursos(true);
    try {
      const cursosSalvos = await financeiroCursoService.upsertMany(turmas.map((turma) => ({
        turmaId: turma.id,
        turmaNome: turma.nome,
        valorMensalidade: cursosFinanceiros.find((curso) => curso.turmaId === turma.id)?.valorMensalidade ?? 0,
      })));
      setCursosFinanceiros(cursosSalvos);
      queryClient.setQueryData(FINANCEIRO_CURSOS_QUERY_KEY, cursosSalvos);
      setAbaAtiva('perfil');
    } finally { setSavingCursos(false); }
  };

  const handleFieldChange = (alunoId: string, field: 'valorMensalidade' | 'statusPagamento', value: string | number) => {
    setRegistros((prev) => {
      const index = prev.findIndex((item) => item.alunoId === alunoId && item.mesReferencia === mesFiltro && item.anoReferencia === anoFiltro);
      const finalValue = field === 'valorMensalidade' ? (value === '' ? 0 : Number(value)) : value;
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: finalValue } as FinanceiroAluno;
        return updated;
      }
      const aluno = alunosAtivos.find((item) => item.id === alunoId);
      if (!aluno) return prev;
      return [...prev, { ...getDefaultRow(aluno, mesFiltro, anoFiltro, modalidadesPorAluno.get(alunoId) ?? 'Boleto', mensalidadesPorTurma.get(aluno.turma) ?? 0), [field]: finalValue } as FinanceiroAluno];
    });
  };

  const handleSalvarMensalidade = async (linha: FinanceiroAluno) => {
    setSavingId(linha.alunoId);
    try {
      const salvo = await financeiroService.upsert({
        ...linha,
        mesReferencia: mesFiltro,
        anoReferencia: anoFiltro,
        boletoEmitido: 'Não',
      });
      setRegistros((prev) => [salvo, ...prev.filter((item) => !(item.alunoId === salvo.alunoId && item.mesReferencia === salvo.mesReferencia && item.anoReferencia === salvo.anoReferencia))]);
      queryClient.setQueryData<FinanceiroAluno[]>(FINANCEIRO_QUERY_KEY, (current = []) => [
        salvo,
        ...current.filter((item) => !(item.alunoId === salvo.alunoId && item.mesReferencia === salvo.mesReferencia && item.anoReferencia === salvo.anoReferencia)),
      ]);
    } finally { setSavingId(null); }
  };

  if (loadingAlunos || loadingTurmas) return <div className="financeiro-loading">Carregando financeiro...</div>;

  return (
    <div className="financeiro-page">
      <div className="financeiro-summary-grid">
        <Card padding="lg" className="financeiro-stat-card blue"><span className="financeiro-stat-label">Total de alunos</span><strong className="financeiro-stat-value">{resumo.totalAlunos}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card green"><span className="financeiro-stat-label">Total pago</span><strong className="financeiro-stat-value">{resumo.totalPagos}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card orange"><span className="financeiro-stat-label">Total pendente</span><strong className="financeiro-stat-value">{resumo.totalPendentes}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card purple"><span className="financeiro-stat-label">Total de permuta</span><strong className="financeiro-stat-value">{resumo.totalPermutas}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card blue-soft"><span className="financeiro-stat-label">Receita prevista</span><strong className="financeiro-stat-value">R$ {resumo.receitaPrevista.toFixed(2).replace('.', ',')}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card green-soft"><span className="financeiro-stat-label">Receita recebida</span><strong className="financeiro-stat-value">R$ {resumo.receitaRecebida.toFixed(2).replace('.', ',')}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card red-soft"><span className="financeiro-stat-label">Receita pendente</span><strong className="financeiro-stat-value">R$ {resumo.receitaPendente.toFixed(2).replace('.', ',')}</strong></Card>
      </div>

      <div className="financeiro-tabs" role="tablist" aria-label="Seções do financeiro">
        <button type="button" role="tab" aria-selected={abaAtiva === 'perfil'} className={abaAtiva === 'perfil' ? 'active' : ''} onClick={() => setAbaAtiva('perfil')}>Perfil Financeiro</button>
        <button type="button" role="tab" aria-selected={abaAtiva === 'cursos'} className={abaAtiva === 'cursos' ? 'active' : ''} onClick={() => setAbaAtiva('cursos')}>Gest. Curso</button>
        <button type="button" role="tab" aria-selected={abaAtiva === 'mensalidades'} className={abaAtiva === 'mensalidades' ? 'active' : ''} onClick={() => setAbaAtiva('mensalidades')}>Mensalidades</button>
      </div>

      {abaAtiva === 'perfil' ? (
        <Card padding="lg" className="financeiro-table-card">
          <div className="financeiro-section-heading"><h2>Perfil Financeiro</h2><p>Defina se cada aluno paga por boleto ou participa por permuta.</p></div>
          <div className="financeiro-table-wrap"><table className="financeiro-table financeiro-profile-table">
            <thead><tr><th>Aluno</th><th>Curso / Turma</th><th>Modalidade</th></tr></thead>
            <tbody>{alunosAtivos.map((aluno) => <tr key={aluno.id}>
              <td>{aluno.nome}</td><td>{aluno.turma || 'Sem turma'}</td>
              <td>
                <div className="financeiro-modalidade-options" role="radiogroup" aria-label={`Modalidade financeira de ${aluno.nome}`}>
                  {modalidadeOptions.map((modalidade) => (
                    <label key={modalidade} className="financeiro-modalidade-option">
                      <input
                        type="radio"
                        name={`modalidade-${aluno.id}`}
                        value={modalidade}
                        checked={(modalidadesPorAluno.get(aluno.id) ?? 'Boleto') === modalidade}
                        onChange={() => handleModalidadeChange(aluno.id, modalidade)}
                      />
                      <span>{modalidade}</span>
                    </label>
                  ))}
                </div>
              </td>
            </tr>)}</tbody>
          </table></div>
          <div className="financeiro-profile-actions">
            <Button type="button" variant="primary" loading={savingPerfis} onClick={handleSalvarPerfis}>Salvar</Button>
          </div>
        </Card>
      ) : abaAtiva === 'cursos' ? (
        <Card padding="lg" className="financeiro-table-card">
          <div className="financeiro-section-heading"><h2>Gestão de Cursos</h2><p>Defina o valor padrão da mensalidade de cada turma.</p></div>
          <div className="financeiro-table-wrap"><table className="financeiro-table financeiro-profile-table">
            <thead><tr><th>Curso / Turma</th><th>Valor da mensalidade</th></tr></thead>
            <tbody>{turmas.map((turma) => <tr key={turma.id}>
              <td>{turma.nome}</td>
              <td>
                <div className="financeiro-course-value-field">
                  <span className="financeiro-course-value-prefix">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    aria-label={`Mensalidade de ${turma.nome}`}
                    value={cursosFinanceiros.find((curso) => curso.turmaId === turma.id)?.valorMensalidade ?? 0}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => handleCursoValueChange(turma.id, turma.nome, Number(event.target.value))}
                  />
                  <span className="financeiro-course-value-period">/ mês</span>
                </div>
              </td>
            </tr>)}</tbody>
          </table></div>
          <div className="financeiro-profile-actions"><Button type="button" variant="primary" loading={savingCursos} onClick={handleSalvarCursos}>Salvar</Button></div>
        </Card>
      ) : <>
        <Card padding="lg" className="financeiro-filters-card"><div className="financeiro-filters">
          <label>Mês<select value={mesFiltro} onChange={(event) => setMesFiltro(Number(event.target.value))}>{meses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Ano<select value={anoFiltro} onChange={(event) => setAnoFiltro(Number(event.target.value))}>{anos.map((ano) => <option key={ano} value={ano}>{ano}</option>)}</select></label>
          <label>Curso / Turma<select value={cursoFiltro} onChange={(event) => setCursoFiltro(event.target.value)}><option value="Todos">Todos</option>{cursosDisponiveis.map((curso) => <option key={curso} value={curso}>{curso}</option>)}</select></label>
          <label>Status<select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value as 'Todos' | FinanceiroStatus)}><option value="Todos">Todos</option>{statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div></Card>
        <Card padding="lg" className="financeiro-table-card"><div className="financeiro-table-wrap"><table className="financeiro-table">
          <thead><tr><th>Aluno</th><th>Curso / Turma</th><th>Valor da mensalidade</th><th>Mês</th><th>Ano</th><th>Situação</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>{linhasFiltradas.length === 0 ? <tr><td colSpan={8} className="financeiro-empty-row">Nenhum aluno encontrado para os filtros selecionados.</td></tr> : linhasFiltradas.map((linha) => <tr key={`${linha.alunoId}-${mesFiltro}-${anoFiltro}`}>
            <td>{linha.alunoNome}</td><td><div className="financeiro-curso-cell"><span>{linha.curso}</span><small>{linha.turma}</small></div></td>
            <td><input type="number" min="0" step="0.01" inputMode="decimal" className="financeiro-value-input" value={linha.valorMensalidade} onChange={(event) => handleFieldChange(linha.alunoId, 'valorMensalidade', event.target.value)} /></td>
            <td>{meses.find((item) => item.value === mesFiltro)?.label}</td><td>{anoFiltro}</td><td><BadgeStatus status={linha.statusPagamento} /></td>
            <td><select value={linha.statusPagamento} onChange={(event) => handleFieldChange(linha.alunoId, 'statusPagamento', event.target.value as FinanceiroStatus)}>{statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></td>
            <td><Button type="button" variant="primary" size="sm" loading={savingId === linha.alunoId} onClick={() => handleSalvarMensalidade(linha)}>Salvar</Button></td>
          </tr>)}</tbody>
        </table></div></Card>
      </>}
    </div>
  );
};
