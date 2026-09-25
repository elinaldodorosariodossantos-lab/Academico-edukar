import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, SquarePen, Trash2, Save, Wallet, Receipt, BadgeCheck, Clock3, Calendar, Tag, Download, Zap, House, Wifi, BookOpen, Sparkles, Circle, Droplets, Monitor, Truck } from 'lucide-react';
import { Button, Card, Modal } from '../common';
import { useGastos } from '../../hooks/useGastos';
import { useAppStore } from '../../context/AppContext';
import type { Gasto, GastoInput } from '../../types/gastos';
import { categoriasGastos, filtrarGastos, resumoGastos } from '../../utils/gastos';
import { localDate, displayDate } from '../../utils/frequencia';
import './Gastos.css';
import { GastosRelatorio } from './GastosRelatorio';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const emptyForm = (): GastoInput => ({ descricao: '', valor: 0, data: localDate(), categoria: 'Outros', status: 'Pendente', recorrente: false });

const categoryIcons: Record<string, typeof Circle> = { Energia: Zap, Água: Droplets, Internet: Wifi, Aluguel: House, 'Material Didático': BookOpen, Equipamentos: Monitor, Limpeza: Sparkles, Transporte: Truck, Outros: Circle };
function CategoriaIcon({ categoria }: { categoria: GastoInput['categoria'] }) {
  const Icon = categoryIcons[categoria] || Circle;
  return <span className="gastos-category-icon"><Icon size={17} aria-hidden="true" /></span>;
}

export function Gastos() {
  const { gastos, isLoading, error, live, refetch, save, remove } = useGastos();
  const notify = useAppStore(s => s.addNotification);
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const [mes, setMes] = useState('');
  const [categoria, setCategoria] = useState('');
  const [status, setStatus] = useState('');
  const [dialog, setDialog] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Gasto>();
  const [form, setForm] = useState<GastoInput>(emptyForm);
  const [valor, setValor] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const statusLock = useRef(false);
  const marcarStatus = async (gasto: Gasto, novoStatus: GastoInput['status']) => {
    if (statusLock.current || gasto.status === novoStatus) return;
    statusLock.current = true;
    setUpdatingStatus(gasto.id);
    try {
      await save({ descricao: gasto.descricao, valor: gasto.valor, data: gasto.data, categoria: gasto.categoria, status: novoStatus, recorrente: gasto.recorrente ?? false }, gasto);
      notify(`Gasto marcado como ${novoStatus.toLowerCase()}!`, 'success');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Não foi possível atualizar o status.', 'error');
    } finally { statusLock.current = false; setUpdatingStatus(null); }
  };
  const resumo = useMemo(() => resumoGastos(gastos), [gastos]);
  const filtered = useMemo(() => filtrarGastos(gastos, mes, categoria, status).sort((a, b) => b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at)), [gastos, mes, categoria, status]);
  const categorias = useMemo(() => categoriasGastos(gastos), [gastos]);
  const currentYear = Number(localDate().slice(0, 4));
  const monthOptions = useMemo(() => {
    const periods = new Set(gastos.map(g => g.data.slice(0, 7)));
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      for (let month = 1; month <= 12; month++) periods.add(`${year}-${String(month).padStart(2, '0')}`);
    }
    if (mes) periods.add(mes);
    return [...periods].sort().reverse();
  }, [gastos, currentYear, mes]);
  const open = (mode: 'create' | 'edit' | 'delete', gasto?: Gasto) => {
    setSelected(gasto); setForm(gasto ? { descricao: gasto.descricao, valor: gasto.valor, data: gasto.data, categoria: gasto.categoria, status: gasto.status, recorrente: gasto.recorrente ?? false } : emptyForm());
    setValor(gasto ? String(gasto.valor).replace('.', ',') : ''); setFormError(''); setDialog(mode);
  };
  const close = () => { if (!lock.current) setDialog(null); };
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setFormError('');
    try {
      if (dialog === 'delete' && selected) {
        await remove(selected); notify('Gasto excluído com sucesso!', 'success');
      } else {
        if (!/^\d+(?:[.,]\d{1,2})?$/.test(valor.trim())) throw new Error('Informe o valor como 100,00, sem separador de milhares.');
        await save({ ...form, valor: Number(valor.trim().replace(',', '.')) }, selected);
        notify('Gasto salvo com sucesso!', 'success');
      }
      setDialog(null);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Não foi possível salvar a alteração.');
    } finally { lock.current = false; setBusy(false); }
  };
  return <div className="gastos-page">
    {relatorioAberto && <GastosRelatorio onClose={() => setRelatorioAberto(false)} />}
    <div className="gastos-heading"><div><span className="gastos-kicker"><Wallet size={15} aria-hidden="true" /> DESPESAS DA ESCOLA</span><h1><span className="gastos-title-icon"><Receipt size={27} aria-hidden="true" /></span>Gastos</h1><p>Organize as despesas e acompanhe seus pagamentos em tempo real.</p><small className={`gastos-sync ${live ? 'is-live' : ''}`}><span aria-hidden="true" />{live ? 'Atualização em tempo real conectada' : 'Atualização automática a cada 10 segundos'}</small></div><Button className="gastos-create" icon={<Plus size={19} />} onClick={() => open('create')}>Novo Gasto</Button></div>
    {error && <Card><p role="alert">{error instanceof Error ? error.message : 'Não foi possível carregar os gastos.'}</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></Card>}
    <div className="gastos-summary">
      {[{ label: 'Total de Gastos', description: 'Todas as despesas cadastradas', value: resumo.total, tone: 'blue', icon: <Wallet /> }, { label: 'Total Pago', description: 'Despesas com pagamento realizado', value: resumo.pago, tone: 'green', icon: <BadgeCheck /> }, { label: 'Total Pendente', description: 'Despesas que aguardam pagamento', value: resumo.pendente, tone: 'orange', icon: <Clock3 /> }].map(item => <Card key={item.label} className={`gastos-stat ${item.tone}`}><div className="gastos-stat-heading"><span className="gastos-stat-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></div><strong>{isLoading || (error && !gastos.length) ? '—' : money(item.value)}</strong><small><span className="gastos-stat-dot" aria-hidden="true" />{item.description}</small></Card>)}
    </div>
    <Card className="gastos-filter-card"><div className="gastos-filters"><label><span><Calendar size={15} aria-hidden="true" />Mês</span><select value={mes} onChange={e => setMes(e.target.value)}><option value="">Todos os meses</option>{monthOptions.map(period => <option key={period} value={period}>{new Date(`${period}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</option>)}</select></label><label><span><Tag size={15} aria-hidden="true" />Categoria</span><select value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas</option>{categoria && !categorias.includes(categoria) && <option value={categoria}>{categoria} (sem registros)</option>}{categorias.map(c => <option key={c}>{c}</option>)}</select></label><label><span><Clock3 size={15} aria-hidden="true" />Status</span><select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos</option><option>Pago</option><option>Pendente</option></select></label><Button className="gastos-clear" variant="outline" icon={<Download size={17} />} onClick={() => setRelatorioAberto(true)}>Baixar relatório de gastos</Button></div></Card>
    <Card className="gastos-list-card"><div className="gastos-list-heading"><div><span className="gastos-list-icon"><Receipt size={20} aria-hidden="true" /></span><h2>Despesas cadastradas</h2><span className="gastos-record-count">{filtered.length} registros</span></div></div><div className="gastos-table-wrap" tabIndex={0} role="region" aria-label="Lista de gastos"><table className="gastos-table"><thead><tr>{['Descrição', 'Categoria', 'Valor', 'Data', 'Status', 'Ações'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>
      {isLoading ? <tr><td className="gastos-empty" colSpan={6} role="status">Carregando gastos...</td></tr> : !filtered.length ? <tr><td className="gastos-empty" colSpan={6}><Receipt size={28} aria-hidden="true" /><p>{error ? 'Lista indisponível. Tente novamente.' : 'Nenhum gasto encontrado para os filtros selecionados.'}</p></td></tr> : filtered.map(g => <tr key={g.id}><td>{g.descricao}</td><td><span className="gastos-category"><CategoriaIcon categoria={g.categoria} />{g.categoria}</span></td><td className="gastos-money">{money(g.valor)}</td><td>{displayDate(g.data)}</td><td><span className={`gastos-badge ${g.status === 'Pago' ? 'paid' : 'pending'}`}>{g.status === 'Pago' ? <BadgeCheck size={15} aria-hidden="true" /> : <Clock3 size={15} aria-hidden="true" />}{g.status}</span></td><td><div className="gastos-actions" aria-busy={updatingStatus === g.id}><button type="button" className="gastos-payment-dot-button" data-status={g.status} aria-label={`Pagamento de ${g.descricao}`} aria-pressed={g.status === 'Pago'} title={g.status === 'Pago' ? 'Pago — clique para marcar como pendente' : 'Pendente — clique para marcar como pago'} disabled={updatingStatus !== null} onClick={() => void marcarStatus(g, g.status === 'Pago' ? 'Pendente' : 'Pago')}><span className="gastos-payment-dot" aria-hidden="true" /></button><Button variant="outline" size="sm" disabled={updatingStatus !== null} title="Editar" aria-label={`Editar ${g.descricao}`} icon={<SquarePen size={17} />} onClick={() => open('edit', g)}>{null}</Button><Button variant="danger" size="sm" disabled={updatingStatus !== null} title="Excluir" aria-label={`Excluir ${g.descricao}`} icon={<Trash2 size={17} />} onClick={() => open('delete', g)}>{null}</Button></div></td></tr>)}
    </tbody></table></div></Card>
    <Modal isOpen={dialog !== null} onClose={close} title={dialog === 'delete' ? 'Excluir gasto' : dialog === 'edit' ? 'Editar gasto' : 'Novo Gasto'} footer={<><Button variant="secondary" disabled={busy} onClick={close}>Cancelar</Button>{dialog === 'delete' ? <Button variant="danger" loading={busy} onClick={() => void submit()}>Excluir gasto</Button> : <Button type="submit" form="gastos-form" icon={<Save size={18} />} loading={busy}>Salvar gasto</Button>}</>}>
      {formError && <p className="gastos-error" role="alert">{formError}</p>}
      {dialog === 'delete' ? <p>Excluir <strong>{selected?.descricao}</strong>, no valor de <strong>{money(selected?.valor ?? 0)}</strong>? Esta ação não pode ser desfeita. {selected?.recorrente && 'A recorrência também será interrompida; as outras parcelas permanecerão no histórico.'}</p> : <form id="gastos-form" onSubmit={submit}><fieldset disabled={busy} className="gastos-form">
        <label className="gastos-full">Descrição do gasto<input autoFocus required maxLength={200} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Conta de energia de setembro" /></label>
        <label>Valor (R$)<input required inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="100,00" /></label>
        <label>Data<input required type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></label>
        <label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as GastoInput['status'] })}><option>Pago</option><option>Pendente</option></select></label>
        <div className="gastos-recurrence"><button type="button" role="switch" aria-checked={form.recorrente ?? false} aria-label="Gasto recorrente" title={form.recorrente ? 'Recorrente — clique para desativar' : 'Não recorrente — clique para ativar'} className="gastos-recurrence-switch" onClick={() => setForm({ ...form, recorrente: !form.recorrente })}><span aria-hidden="true" />Gasto recorrente</button></div>
      </fieldset></form>}
    </Modal>
  </div>;
}
