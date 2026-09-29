import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require=createRequire(resolve(process.argv[2],'package.json'));
const {chromium,expect}=require('@playwright/test');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
 const page=await browser.newPage();
 await page.route('**/rest/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 const base=process.argv[3]||'http://127.0.0.1:5188';
 await page.goto(base+'/financeiro?aba=gastos&teste=1');
 await expect(page).toHaveURL(base+'/financeiro/gastos?teste=1');
 await expect(page.getByRole('tab',{name:'Gastos',exact:true})).toHaveAttribute('aria-selected','true');
 await page.getByRole('tab',{name:'Perfil Financeiro',exact:true}).click();
 await expect(page).toHaveURL(base+'/financeiro/perfil?teste=1');
 await page.getByRole('button',{name:'Total de Gastos — abrir aba Gastos',exact:true}).click();
 await expect(page).toHaveURL(base+'/financeiro/gastos?teste=1');
 await page.goBack();
 await expect(page.getByRole('tab',{name:'Perfil Financeiro',exact:true})).toHaveAttribute('aria-selected','true');
 await page.goForward();
 await expect(page.getByRole('tab',{name:'Gastos',exact:true})).toHaveAttribute('aria-selected','true');
 await page.reload();
 await expect(page.getByRole('tab',{name:'Gastos',exact:true})).toHaveAttribute('aria-selected','true');
 await page.goto(base+'/gastos');await expect(page).toHaveURL(base+'/financeiro/gastos');
 for(const [name,path] of [['Gest. Curso','cursos'],['Mensalidades','mensalidades']]) {
   await page.getByRole('tab',{name,exact:true}).click();await expect(page).toHaveURL(base+'/financeiro/'+path);
 }
 console.log('OK: rotas, links antigos, parâmetros, card, recarga e histórico do navegador.');
} finally {await browser.close();}
