import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Gastos } from './Gastos';
import { useGastos } from '../../hooks/useGastos';
import { resumoCaixa } from '../../utils/caixa';
import { periodoFinanceiroPermitido, periodoGastosPermitido } from '../../utils/periodoFinanceiro';
import { mensagemErroFinanceiro } from '../../utils/erroFinanceiro';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeStatus, Button, Card } from '../common';
import { useAlunos } from '../../hooks/useAlunos';
import { useTurmas } from '../../hooks/useTurmas';
import { financeiroService } from '../../services/api';
import type { FinanceiroAluno, FinanceiroModalidade, FinanceiroStatus } from '../../types';
import './Financeiro.css';

type FinanceiroAba = 'mensalidades' | 'gastos';

const TotalGastosCard: React.FC<{ onOpen: () => void; valor: string }> = ({ onOpen, valor }) => {
  return <Card padding="lg" className="financeiro-stat-card orange financeiro-gastos-link" role="button" tabIndex={0} aria-label="Total de Gastos — abrir aba Gastos" title="Abrir Gastos — total de despesas pagas e pendentes" onClick={onOpen} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }}>
    <span className="financeiro-stat-label">Total de Gastos</span>
    <strong className="financeiro-stat-value" aria-live="polite">{valor}</strong>
  </Card>;
};

const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  .map((label, index) => ({ value: index + 1, label }));
const anos = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - 2 + index);
const statusOptions: FinanceiroStatus[] = ['Pago', 'Permuta', 'Pendente'];
const FINANCEIRO_QUERY_KEY = ['financeiro', 'mensalidades'] as const;

const getDefaultRow = (aluno: any, mes: number, ano: number, modalidade: FinanceiroModalidade, valorMensalidade = 0): FinanceiroAluno => ({
  alunoId: aluno.id,
  alunoNome: aluno.nome,
  curso: aluno.turma || 'Sem curso',
  turma: aluno.turma || 'Sem turma',
  valorMensalidade,
  modalidade,
  mesReferencia: mes,
  anoReferencia: ano,
  boletoEmitido: 'Não',
  statusPagamento: modalidade === 'Permuta' ? 'Permuta' : 'Pendente',
  observacoes: '',
});

export const Financeiro: React.FC = () => {
  const queryClient = useQueryClient();
  const { alunos, isLoading: loadingAlunos, updateAluno } = useAlunos();
  const { turmas, isLoading: loadingTurmas } = useTurmas();
  const hoje = new Date();
  const location = useLocation();
  const navigate = useNavigate();
  const { aba: abaRota } = useParams();
  const abaParam = abaRota || new URLSearchParams(location.search).get('aba');
  const abaAtiva: FinanceiroAba = abaParam === 'gastos' ? 'gastos' : 'mensalidades';
  const conteudoAbaRef = useRef<HTMLDivElement>(null);
  const [solicitacaoRolagem, setSolicitacaoRolagem] = useState(0);
  useEffect(() => {
    if (!solicitacaoRolagem) return;
    const frame = requestAnimationFrame(() => conteudoAbaRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    }));
    return () => cancelAnimationFrame(frame);
  }, [abaAtiva, solicitacaoRolagem]);
  const gastosQuery = useGastos(abaAtiva !== 'gastos');
  const setAbaAtiva = (aba: FinanceiroAba) => {
    setSolicitacaoRolagem(prev => prev + 1);
    const params = new URLSearchParams(location.search);
    params.delete('aba');
    navigate({ pathname: '/financeiro/' + aba, search: params.toString(), hash: location.hash });
  };
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('aba') || (abaRota && !['mensalidades','gastos'].includes(abaRota))) {
      params.delete('aba');
      navigate({ pathname: '/financeiro/' + abaAtiva, search: params.toString(), hash: location.hash }, { replace: true });
    }
  }, [abaRota, abaAtiva, location.search, location.hash, navigate]);
  const [registros, setRegistros] = useState<FinanceiroAluno[]>([]);
  const [mesFiltro, setMesFiltro] = useState(hoje.getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState(hoje.getFullYear());
  const periodoPermitido = periodoFinanceiroPermitido(mesFiltro, anoFiltro);
  const gastosPermitidos = periodoGastosPermitido(mesFiltro, anoFiltro);
  const [cursoFiltro, setCursoFiltro] = useState('Todos');
  const [statusFiltro, setStatusFiltro] = useState<'Todos' | FinanceiroStatus>('Todos');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erroFinanceiro, setErroFinanceiro] = useState('');
  const [rascunhos, setRascunhos] = useState<Record<string, Partial<FinanceiroAluno>>>({});
  const [valoresEditados, setValoresEditados] = useState<Record<string, string>>({});
  const periodoAtual = mesFiltro === hoje.getMonth() + 1 && anoFiltro === hoje.getFullYear();
  const chaveLinha = (alunoId: string) => `${alunoId}-${mesFiltro}-${anoFiltro}`;
  const registrosQuery = useQuery({ queryKey: FINANCEIRO_QUERY_KEY, queryFn: async () => {
    try { await financeiroService.gerarMensalidades(); setErroFinanceiro(''); }
    catch (error) { setErroFinanceiro(mensagemErroFinanceiro(error)); }
    return financeiroService.getAll();
  }, refetchInterval: 60000 });
  const caixa = useMemo(() => resumoCaixa((registrosQuery.data ?? []).filter(registro =>
    periodoPermitido && registro.mesReferencia === mesFiltro && registro.anoReferencia === anoFiltro &&
    (cursoFiltro === 'Todos' || registro.curso === cursoFiltro)
  ), gastosPermitidos ? gastosQuery.gastos : []), [registrosQuery.data, gastosQuery.gastos, mesFiltro, anoFiltro, cursoFiltro, periodoPermitido, gastosPermitidos]);
  const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const valorGastos = (valor: number) => !gastosPermitidos ? moeda(0) : gastosQuery.isLoading ? 'Carregando...' : gastosQuery.error ? 'Indisponível' : moeda(valor);
  const valorCaixa = (valor: number) => !periodoPermitido ? moeda(0) : registrosQuery.isLoading || (gastosPermitidos && gastosQuery.isLoading) ? 'Carregando...' : registrosQuery.error || (gastosPermitidos && gastosQuery.error) ? 'Indisponível' : moeda(valor);

  useEffect(() => {
    if (registrosQuery.data) setRegistros(registrosQuery.data);
  }, [registrosQuery.data]);

  const alunosAtivos = useMemo(() => [...alunos]
    .filter((aluno) => aluno.status === 'Ativo')
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')), [alunos]);
  const cursosDisponiveis = useMemo(() => Array.from(new Set(
    [...turmas.map((turma) => turma.nome), ...alunosAtivos.map((aluno) => aluno.turma)].filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'pt-BR')), [alunosAtivos, turmas]);

  const alunosFinanceiros = useMemo(() => {
    if (!periodoPermitido) return [];
    const doPeriodo = new Map(registros
      .filter((item) => item.mesReferencia === mesFiltro && item.anoReferencia === anoFiltro)
      .map((item) => [item.alunoId, item]));
    const linhas = alunosAtivos.map(aluno => {
      const registro = doPeriodo.get(aluno.id) ?? getDefaultRow(aluno, mesFiltro, anoFiltro, aluno.mensalidadePermuta ? 'Permuta' : 'Boleto', aluno.mensalidade ?? 0);
      return { ...registro, ...rascunhos[chaveLinha(aluno.id)] };
    });
    const ids = new Set(linhas.map(linha => linha.alunoId));
    return [...linhas, ...[...doPeriodo.values()].filter(linha => !ids.has(linha.alunoId))]
      .sort((a, b) => a.alunoNome.localeCompare(b.alunoNome, 'pt-BR'));
  }, [alunosAtivos, anoFiltro, mesFiltro, registros, rascunhos, periodoPermitido]);

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
      receitaPendente: base.filter((item) => item.statusPagamento === 'Pendente').reduce((total, item) => total + Number(item.valorMensalidade || 0), 0),
    };
  }, [alunosFinanceiros, linhasFiltradas]);

  const handleFieldChange = (alunoId: string, field: 'statusPagamento', value: FinanceiroStatus) => {
    setRascunhos(prev => ({ ...prev, [chaveLinha(alunoId)]: { ...prev[chaveLinha(alunoId)], [field]: value } }));
    if (value === 'Permuta' && periodoAtual) setValoresEditados(prev => ({ ...prev, [alunoId]: '0' }));
  };

  const handleSalvarMensalidade = async (linha: FinanceiroAluno) => {
    setSavingId(linha.alunoId);
    setErroFinanceiro('');
    try {
      if (!periodoPermitido) throw new Error('Os registros de mensalidades começam em setembro de 2026.');
      const existente = await financeiroService.getByAlunoMesAno(linha.alunoId, mesFiltro, anoFiltro);
      let aluno = alunos.find(item => item.id === linha.alunoId);
      const valorEditado = periodoAtual && linha.statusPagamento === 'Permuta' ? '0' : valoresEditados[linha.alunoId];
      if (valorEditado !== undefined && periodoAtual) {
        const valor = Number(valorEditado);
        if (!valorEditado.trim() || !Number.isFinite(valor) || valor < 0) {
          throw new Error('Informe um valor de mensalidade válido, maior ou igual a zero.');
        }
        aluno = await updateAluno(linha.alunoId, { mensalidade: valor });
        setValoresEditados(prev => { const next = { ...prev }; delete next[linha.alunoId]; return next; });
        // Alterar o cadastro não regrava a parcela que já existe.
        if (existente && !rascunhos[chaveLinha(linha.alunoId)]?.statusPagamento && linha.statusPagamento !== 'Permuta') return;
      }
      if (!existente && aluno?.mensalidade == null) throw new Error('Cadastre a mensalidade no cadastro do aluno antes de registrar o pagamento.');
      const salvo = await financeiroService.upsert({
        ...linha,
        valorMensalidade: periodoAtual && (linha.statusPagamento === 'Permuta' || existente?.statusPagamento === 'Permuta')
          ? linha.statusPagamento === 'Permuta' ? 0 : Number(aluno?.mensalidade)
          : existente?.valorMensalidade ?? Number(aluno?.mensalidade),
        mesReferencia: mesFiltro,
        anoReferencia: anoFiltro,
        boletoEmitido: existente?.boletoEmitido ?? 'Não',
      });
      setRascunhos(prev => { const next = { ...prev }; delete next[chaveLinha(linha.alunoId)]; return next; });
      setRegistros((prev) => [salvo, ...prev.filter((item) => !(item.alunoId === salvo.alunoId && item.mesReferencia === salvo.mesReferencia && item.anoReferencia === salvo.anoReferencia))]);
      queryClient.setQueryData<FinanceiroAluno[]>(FINANCEIRO_QUERY_KEY, (current = []) => [
        salvo,
        ...current.filter((item) => !(item.alunoId === salvo.alunoId && item.mesReferencia === salvo.mesReferencia && item.anoReferencia === salvo.anoReferencia)),
      ]);
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
    } catch (error) { setErroFinanceiro(mensagemErroFinanceiro(error)); } finally { setSavingId(null); }
  };

  if (abaAtiva !== 'gastos' && (loadingAlunos || loadingTurmas)) return <div className="financeiro-loading">Carregando financeiro...</div>;

  return (
    <div className="financeiro-page">
      {(erroFinanceiro || registrosQuery.error) && <p role="alert">{erroFinanceiro || mensagemErroFinanceiro(registrosQuery.error)}</p>}
      <div className="financeiro-summary-grid">
        <Card padding="lg" className="financeiro-stat-card blue"><span className="financeiro-stat-label">Total de alunos</span><strong className="financeiro-stat-value">{resumo.totalAlunos}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card green"><span className="financeiro-stat-label">Total pago</span><strong className="financeiro-stat-value">{resumo.totalPagos}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card orange"><span className="financeiro-stat-label">Total pendente</span><strong className="financeiro-stat-value">{resumo.totalPendentes}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card purple"><span className="financeiro-stat-label">Total de permuta</span><strong className="financeiro-stat-value">{resumo.totalPermutas}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card blue-soft"><span className="financeiro-stat-label">Receita prevista</span><strong className="financeiro-stat-value">R$ {resumo.receitaPrevista.toFixed(2).replace('.', ',')}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card green-soft"><span className="financeiro-stat-label">Receita recebida</span><strong className="financeiro-stat-value" aria-live="polite">{!periodoPermitido ? moeda(0) : registrosQuery.isLoading ? 'Carregando...' : registrosQuery.error ? 'Indisponível' : moeda(caixa.receitaRecebida)}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card red-soft"><span className="financeiro-stat-label">Receita pendente</span><strong className="financeiro-stat-value">R$ {resumo.receitaPendente.toFixed(2).replace('.', ',')}</strong></Card>
        <TotalGastosCard onOpen={() => setAbaAtiva('gastos')} valor={valorGastos(caixa.gastos.total)} />
        <Card padding="lg" className="financeiro-stat-card green"><span className="financeiro-stat-label">Total de gastos pagos</span><strong className="financeiro-stat-value" aria-live="polite">{valorGastos(caixa.gastos.pago)}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card orange"><span className="financeiro-stat-label">Total de gastos pendentes</span><strong className="financeiro-stat-value" aria-live="polite">{valorGastos(caixa.gastos.pendente)}</strong></Card>
        <Card padding="lg" className="financeiro-stat-card blue"><span className="financeiro-stat-label">Dinheiro em caixa</span><strong className="financeiro-stat-value" aria-live="polite">{valorCaixa(caixa.dinheiroEmCaixa)}</strong></Card>
      </div>

      <div className="financeiro-tabs" role="tablist" aria-label="Seções do financeiro">
        <button type="button" role="tab" aria-selected={abaAtiva === 'mensalidades'} className={abaAtiva === 'mensalidades' ? 'active' : ''} onClick={() => setAbaAtiva('mensalidades')}>Mensalidades</button>
        <button type="button" role="tab" aria-selected={abaAtiva === 'gastos'} className={abaAtiva === 'gastos' ? 'active' : ''} onClick={() => setAbaAtiva('gastos')}>Gastos</button>
      </div>

      <div ref={conteudoAbaRef} className="financeiro-conteudo-aba">
      {abaAtiva === 'gastos' ? <Gastos periodoBloqueado={!gastosPermitidos} mesInicial={!gastosPermitidos ? `${anoFiltro}-${String(mesFiltro).padStart(2, '0')}` : ''} onPeriodoChange={periodo => { setAnoFiltro(periodo ? Number(periodo.slice(0, 4)) : hoje.getFullYear()); setMesFiltro(periodo ? Number(periodo.slice(5, 7)) : hoje.getMonth() + 1); }} /> : <>
        <Card padding="lg" className="financeiro-filters-card"><div className="financeiro-filters">
          <label>Mês<select value={mesFiltro} onChange={(event) => setMesFiltro(Number(event.target.value))}>{meses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Ano<select value={anoFiltro} onChange={(event) => setAnoFiltro(Number(event.target.value))}>{anos.map((ano) => <option key={ano} value={ano}>{ano}</option>)}</select></label>
          <label>Curso / Turma<select value={cursoFiltro} onChange={(event) => setCursoFiltro(event.target.value)}><option value="Todos">Todos</option>{cursosDisponiveis.map((curso) => <option key={curso} value={curso}>{curso}</option>)}</select></label>
          <label>Status<select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value as 'Todos' | FinanceiroStatus)}><option value="Todos">Todos</option>{statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div></Card>
        <Card padding="lg" className="financeiro-table-card"><div className="financeiro-table-wrap"><table className="financeiro-table">
          <thead><tr><th>Aluno</th><th>Curso / Turma</th><th>Mensalidade (R$)</th><th>Mês</th><th>Ano</th><th>Situação</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>{linhasFiltradas.length === 0 ? <tr><td colSpan={8} className="financeiro-empty-row">{periodoPermitido ? 'Nenhum aluno encontrado para os filtros selecionados.' : 'Sem registros neste período. As mensalidades começam em setembro de 2026.'}</td></tr> : linhasFiltradas.map((linha) => <tr key={`${linha.alunoId}-${mesFiltro}-${anoFiltro}`}>
            <td>{linha.alunoNome}</td><td><div className="financeiro-curso-cell"><span>{linha.curso}</span>{linha.turma && linha.turma !== linha.curso && <small>{linha.turma}</small>}</div></td>
            <td><input type="number" min="0" step="0.01" inputMode="decimal" className="financeiro-value-input" aria-label={`Mensalidade de ${linha.alunoNome}`} title="Valor individual para as próximas mensalidades. Para editar uma permuta, selecione Pendente." readOnly={!periodoAtual} disabled={savingId === linha.alunoId || linha.statusPagamento === 'Permuta'} value={periodoAtual ? valoresEditados[linha.alunoId] ?? alunos.find(a => a.id === linha.alunoId)?.mensalidade ?? linha.valorMensalidade : linha.valorMensalidade} onChange={event => setValoresEditados(prev => ({ ...prev, [linha.alunoId]: event.target.value }))} />{!linha.id && alunos.find(a => a.id === linha.alunoId)?.mensalidade == null && <small>Mensalidade não cadastrada</small>}{periodoAtual && linha.id && alunos.find(a => a.id === linha.alunoId)?.mensalidade != null && alunos.find(a => a.id === linha.alunoId)?.mensalidade !== linha.valorMensalidade && <small>Parcela gerada: {linha.valorMensalidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</small>}</td>
            <td>{meses.find((item) => item.value === mesFiltro)?.label}</td><td>{anoFiltro}</td><td><BadgeStatus status={linha.statusPagamento} /></td>
            <td><select aria-label={`Status de ${linha.alunoNome}`} disabled={savingId === linha.alunoId} value={linha.statusPagamento} onChange={(event) => handleFieldChange(linha.alunoId, 'statusPagamento', event.target.value as FinanceiroStatus)}>{(['Pendente', 'Pago', 'Permuta'] as FinanceiroStatus[]).map((item) => <option key={item} value={item}>{item}</option>)}</select></td>
            <td><Button type="button" variant="primary" size="sm" loading={savingId === linha.alunoId} onClick={() => handleSalvarMensalidade(linha)}>Salvar</Button></td>
          </tr>)}</tbody>
        </table></div></Card>
      </>}
      </div>
    </div>
  );
};
