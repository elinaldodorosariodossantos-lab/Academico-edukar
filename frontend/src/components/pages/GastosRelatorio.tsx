import { useRef, useState } from 'react';
import { Download, CalendarDays, CalendarRange, FileSpreadsheet, FileText, Check, Info } from 'lucide-react';
import { Button, Modal } from '../common';
import { gastosService } from '../../services/gastos';
import { baixarGastosRelatorio } from '../../utils/gastosRelatorio';
import { localDate } from '../../utils/frequencia';
import './GastosRelatorio.css';
export function GastosRelatorio({ onClose }: {onClose:()=>void}) {
  const [geral,setGeral]=useState(false);
  const [mes,setMes]=useState(localDate().slice(5,7));
  const [ano,setAno]=useState(localDate().slice(0,4));
  const [formato,setFormato]=useState<'xlsx'|'pdf'>('xlsx');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const lock=useRef(false);
  const baixar=async()=>{
    if(lock.current)return;
    if(!geral && (!/^\d{4}$/.test(ano) || Number(ano)<1900 || Number(ano)>9999)){setError('Informe um ano válido.');return;}
    lock.current=true;setBusy(true);setError('');
    try { await baixarGastosRelatorio(await gastosService.list(),geral?'':ano+'-'+mes,formato); onClose(); }
    catch(e){setError(e instanceof Error?e.message:'Não foi possível baixar o relatório.');}
    finally {lock.current=false;setBusy(false);}
  };
  return <Modal isOpen onClose={()=>{if(!lock.current)onClose();}} title="Baixar relatório de gastos" footer={<><Button className="gastos-report-cancel" variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button><Button className="gastos-report-download" loading={busy} icon={<Download size={18}/>} onClick={()=>void baixar()}>Baixar relatório</Button></>}>
    <fieldset className="gastos-form gastos-report-form" disabled={busy}>
      <label className="gastos-full"><span className="gastos-report-label"><CalendarRange size={16} aria-hidden="true"/>Período</span><select value={geral?'geral':'mensal'} onChange={e=>setGeral(e.target.value==='geral')}><option value="mensal">Relatório mensal</option><option value="geral">Relatório geral — todos os registros</option></select></label>
      {!geral && <><label><span className="gastos-report-label"><CalendarDays size={16} aria-hidden="true"/>Mês</span><select aria-label="Mês" value={mes} onChange={e=>setMes(e.target.value)}>{Array.from({length:12},(_,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{new Date(2026,i,1).toLocaleDateString('pt-BR',{month:'long'})}</option>)}</select></label><label><span className="gastos-report-label"><CalendarDays size={16} aria-hidden="true"/>Ano</span><input type="number" min="1900" max="9999" value={ano} onChange={e=>setAno(e.target.value)}/></label></>}
      <div className="gastos-full"><span id="gastos-report-format-label" className="gastos-report-label">Formato</span><div className="gastos-report-formats" role="group" aria-labelledby="gastos-report-format-label">
        <button type="button" className="gastos-report-format" aria-pressed={formato==='xlsx'} onClick={()=>setFormato('xlsx')}><FileSpreadsheet size={23} aria-hidden="true"/><span>Excel<small>Planilha .xlsx</small></span>{formato==='xlsx' && <Check size={18} aria-hidden="true"/>}</button>
        <button type="button" className="gastos-report-format" aria-pressed={formato==='pdf'} onClick={()=>setFormato('pdf')}><FileText size={23} aria-hidden="true"/><span>PDF<small>Documento .pdf</small></span>{formato==='pdf' && <Check size={18} aria-hidden="true"/>}</button>
      </div></div>
    </fieldset>
    <p className="gastos-report-note"><Info size={18} aria-hidden="true"/><span>Inclui gastos pagos e pendentes, com totais e detalhes do período escolhido.</span></p>
    {error && <p role="alert" className="gastos-error">{error}</p>}
  </Modal>;
}
