import type { Gasto } from '../types/gastos';
import { resumoGastos } from './gastos';
import { displayDate } from './frequencia';

export function selecionarGastosRelatorio(gastos: Gasto[], periodo: string) {
  return gastos.filter(g => !periodo || g.data.startsWith(periodo + '-')).sort((a,b) => a.data.localeCompare(b.data) || a.descricao.localeCompare(b.descricao, 'pt-BR'));
}
const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export async function baixarGastosRelatorio(gastos: Gasto[], periodo: string, formato: 'xlsx' | 'pdf') {
  const rows = selecionarGastosRelatorio(gastos, periodo);
  if (!rows.length) throw new Error('Não há gastos registrados no período escolhido.');
  const resumo = resumoGastos(rows);
  const titulo = periodo ? new Date(periodo + '-01T12:00:00').toLocaleDateString('pt-BR', {month:'long', year:'numeric'}) : 'Relatório geral';
  const nome = 'EdukarXP-gastos-' + (periodo || 'geral');
  const emitido = new Date().toLocaleString('pt-BR');
  const headers = ['Descrição', 'Categoria', 'Valor', 'Data', 'Status', 'Recorrente'];
  if (formato === 'xlsx') {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EdukarXP';
    const sheet = workbook.addWorksheet('Gastos', { views: [{state:'frozen', ySplit:7}], pageSetup:{orientation:'landscape', paperSize:9, fitToPage:true, fitToWidth:1, fitToHeight:0} });
    sheet.columns = [{width:48},{width:36},{width:20},{width:16},{width:18},{width:16}];
    sheet.mergeCells('A1:F1'); sheet.getCell('A1').value = 'EDUKARXP | RELATÓRIO DE GASTOS';
    sheet.getRow(1).height = 36;
    sheet.getCell('A1').font = {bold:true, size:18, color:{argb:'FFFFFFFF'}};
    sheet.getCell('A1').fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF1E3A8A'}};
    sheet.mergeCells('A2:F2'); sheet.getCell('A2').value = titulo;
    sheet.mergeCells('A3:F3'); sheet.getCell('A3').value = 'Emitido em ' + emitido + ' • ' + rows.length + ' registros';
    sheet.addRow(['Total de gastos', resumo.total, 'Total pago', resumo.pago, 'Total pendente', resumo.pendente]);
    for (const col of [2,4,6]) sheet.getRow(4).getCell(col).numFmt = '"R$" #,##0.00';
    sheet.getRow(4).height = 30; sheet.getRow(4).font = {bold:true, color:{argb:'FF1E3A8A'}};
    sheet.getRow(4).fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FFEFF6FF'}};
    sheet.getRow(7).values = headers; sheet.getRow(7).height=26;
    sheet.getRow(7).font = {bold:true, color:{argb:'FFFFFFFF'}};
    sheet.getRow(7).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF2563EB'}};
    rows.forEach((g,i) => {
      const row=sheet.getRow(i+8);
      row.values=[g.descricao,g.categoria,g.valor,new Date(g.data+'T00:00:00Z'),g.status,g.recorrente?'Sim':'Não'];
      row.height=Math.max(30, Math.ceil(Math.max(g.descricao.length/44,g.categoria.length/32))*16);
      row.alignment={vertical:'middle',wrapText:true};
      row.fill={type:'pattern',pattern:'solid',fgColor:{argb:i%2?'FFF1F5F9':'FFFFFFFF'}};
      row.getCell(3).numFmt='"R$" #,##0.00'; row.getCell(4).numFmt='dd/mm/yyyy';
      row.getCell(5).font={bold:true,color:{argb:g.status==='Pago'?'FF047857':'FFB45309'}};
    });
    sheet.autoFilter={from:'A7',to:'F'+(rows.length+7)};
    sheet.pageSetup.printTitlesRow='1:7';
    const buffer=await workbook.xlsx.writeBuffer();
    const url=URL.createObjectURL(new Blob([new Uint8Array(buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    const link=document.createElement('a'); link.href=url; link.download=nome+'.xlsx'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000);
  } else {
    const [{jsPDF},{default:autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
    const doc=new jsPDF({orientation:'landscape'});
    doc.setFillColor(30,58,138); doc.rect(0,0,297,27,'F'); doc.setTextColor(255,255,255); doc.setFontSize(18); doc.text('EDUKARXP | Relatório de gastos',14,17);
    doc.setTextColor(51,65,85); doc.setFontSize(12); doc.text(titulo,14,37); doc.setFontSize(9); doc.text('Emitido em '+emitido+' | '+rows.length+' registros',14,44);
    doc.text('Total: '+moeda(resumo.total)+'     Pago: '+moeda(resumo.pago)+'     Pendente: '+moeda(resumo.pendente),14,53);
    autoTable(doc,{startY:61,head:[headers],body:rows.map(g=>[g.descricao,g.categoria,moeda(g.valor),displayDate(g.data),g.status,g.recorrente?'Sim':'Não']),styles:{fontSize:9,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:[37,99,235]},alternateRowStyles:{fillColor:[241,245,249]},margin:{bottom:18},didParseCell: data=>{if(data.section==='body' && data.column.index===4) data.cell.styles.textColor=data.cell.raw==='Pago'?[4,120,87]:[180,83,9];}});
    for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.setTextColor(100,116,139);doc.text('EdukarXP • '+page+' / '+doc.getNumberOfPages(),14,203);}
    doc.save(nome+'.pdf');
  }
}
