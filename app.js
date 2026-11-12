'use strict';
const $ = id => document.getElementById(id);
const modules = [
  ['bandeja','Conversaciones','Organiza tus fichas de conversación con pestañas personalizadas.'],
  ['whatsapp','WhatsApp de prueba','Revisa los mensajes de texto recibidos desde el celular autorizado.'],
  ['contactos','Contactos','Registra y consulta los contactos del CRM.'],
  ['etapas','Embudo Kanban','Crea las etapas que utilice tu equipo y asigna contactos.'],
  ['notas','Notas internas','Registra el seguimiento dentro del CRM.'],
  ['recordatorios','Recordatorios','Consulta los avisos internos en hora de Lima.'],
  ['cronograma','Mensajes programados','Prepara mensajes con fecha y hora. El envío requiere WhatsApp.'],
  ['respuestas','Respuestas rápidas','Guarda textos reutilizables para copiar o incorporar a un mensaje.'],
  ['campanas','Campañas','Prepara el texto y los destinatarios. El envío requiere WhatsApp.'],
  ['flujos','Chatbot y automatización','Configura reglas y prueba sus respuestas en el CRM.'],
  ['ia','Modo IA','Prepara el contexto y las instrucciones. La ejecución requiere un proveedor de IA.'],
  ['ayuda','Guía de operación','Consulta el alcance de la aplicación y del canal WhatsApp.'],
];
const field = (key,label,type='text',required=true) => ({key,label,type,required});
const schemas = {
  contactos:[field('nombre','Nombre'),field('telefono','Teléfono','tel',false),field('tipo','Tipo','tipo'),field('etapa','Etapa','etapas',false)],
  etapas:[field('nombre','Nombre de la etapa')],
  pestanas:[field('nombre','Título'),field('detalle','Detalles','textarea',false)],
  asignaciones:[field('contacto','Contacto','contactos'),field('pestana','Pestaña','pestanas')],
  notas:[field('contacto','Contacto','contactos'),field('tema','Tema'),field('texto','Nota interna','textarea')],
  recordatorios:[field('contacto','Contacto','contactos'),field('tema','Tema'),field('fecha','Fecha y hora (Lima)','datetime-local')],
  cronograma:[field('contacto','Contacto','contactos'),field('texto','Mensaje','textarea'),field('fecha','Fecha y hora (Lima)','datetime-local')],
  respuestas:[field('nombre','Nombre'),field('texto','Texto de la respuesta','textarea')],
  campanas:[field('nombre','Nombre'),field('texto','Mensaje','textarea'),field('fecha','Fecha y hora prevista (Lima)','datetime-local',false)],
  destinatarios:[field('campana','Campaña','campanas'),field('contacto','Contacto','contactos')],
  flujos:[field('nombre','Nombre del flujo'),field('clave','Palabra clave'),field('coincidencia','Coincidencia','coincidencia'),field('texto','Respuesta','textarea'),field('opciones','Opciones de lista (una por línea)','textarea',false)],
  ia:[field('nombre','Nombre de la configuración'),field('modelo','Modelo previsto','text',false),field('contexto','Contexto institucional','textarea',false),field('instrucciones','Instrucciones del sistema','textarea',false)]
};
let data, page='bandeja', tab='', contact='', currentForm;

function el(tag, text, cls) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (cls) element.className = cls;
  return element;
}
function button(text, callback, cls) {
  const element = el('button', text, cls);
  element.type = 'button';
  element.onclick = async () => {
    try { await callback(); } catch(error) { $('aviso').textContent = error.message; }
  };
  return element;
}
function get(table,id) { return data[table].find(row => row.id === id); }
function label(table,id) { return get(table,id)?.nombre || ''; }
function panel(title) {
  const element=el('section','','panel');
  if(title) element.append(el('h2',title));
  return element;
}
function empty(text) { return el('div',text,'empty'); }
async function fetchJson(url, options) {
  const response = await fetch(url,options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
async function refresh() {
  data = await fetchJson('/api/datos');
  render();
}
async function write(table, item) {
  return fetchJson('/api/'+table,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});
}
function options(type) {
  if(type === 'tipo') return ['Cara a cara','Grupos'].map(value=>[value,value]);
  if(type === 'coincidencia') return ['Exacta','Contiene'].map(value=>[value,value]);
  return data[type]?.map(row=>[row.id,row.nombre]);
}
function select(choices) {
  const input = el('select');
  for(const [value,text] of choices) input.add(new Option(text,value));
  return input;
}
function edit(table, row={}) {
  currentForm = {table,id:row.id};
  $('formTitle').textContent = row.id ? 'Editar registro' : 'Agregar registro';
  $('error').textContent = '';
  $('fields').replaceChildren();
  for(const f of schemas[table]) {
    const choices = options(f.type);
    const input = choices ? select([['',f.required ? 'Seleccionar…' : 'Sin asignar'],...choices]) : el(f.type==='textarea' ? 'textarea' : 'input');
    if(input.tagName==='INPUT') input.type=f.type;
    input.name=f.key;
    input.required=f.required;
    input.value=row[f.key] || '';
    const label=el('label',f.label);
    label.append(input);
    $('fields').append(label);
    if(f.key==='texto' && ['cronograma','campanas'].includes(table) && data.respuestas.length) {
      const templates=select([['','Insertar respuesta rápida…'],...options('respuestas')]);
      templates.setAttribute('aria-label','Respuesta rápida');
      templates.onchange=()=>{ if(templates.value) input.value += (input.value ? '\n' : '')+get('respuestas',templates.value).texto; templates.value=''; };
      $('fields').append(templates);
    }
  }
  $('editor').showModal();
}
$('cerrar').onclick=()=>$('editor').close();
$('form').onsubmit=async event=>{
  event.preventDefault();
  const {table,id}=currentForm;
  const values=Object.fromEntries([...new FormData(event.currentTarget)].map(([key,value])=>[key,value.trim()]));
  const submit=event.currentTarget.querySelector('button.primary');
  submit.disabled=true;
  try {
    await write(table,{...values,id});
    $('editor').close();
    await refresh();
  } catch(error) { $('error').textContent=error.message; }
  finally { submit.disabled=false; }
};
function itemRow(table,item,actions=[]) {
  const row=el('div','','row'), content=el('div'), buttons=el('div','','bar');
  const detail=schemas[table].filter(f=>!['nombre','tema'].includes(f.key)).map(f=>{
    const value=item[f.key];
    if(!value) return '';
    if(data[f.type]) return label(f.type,value);
    return f.type==='datetime-local' ? value.replace('T',' ') : value;
  }).filter(Boolean).join(' · ');
  content.append(el('strong',item.nombre||item.tema||label('contactos',item.contacto)),el('div',detail,'muted'));
  buttons.append(...actions,button('Editar',()=>edit(table,item)),button('Eliminar',async()=>{
    if(!confirm('¿Eliminar este registro y sus vínculos dependientes?')) return;
    await write(table,{id:item.id,borrar:true});
    await refresh();
  }));
  row.append(content,buttons);
  return row;
}
function list(table,title,rows,defaults={}) {
  const view=panel(title);
  view.append(button('Agregar',()=>edit(table,defaults)));
  if(!rows.length) view.append(empty('Aún no hay registros.'));
  for(const item of rows) view.append(itemRow(table,item));
  return view;
}
function inbox(view) {
  const tabs=el('div','','tabs');
  for(const [id,name] of [['','Todo'],['Cara a cara','Cara a cara'],['Grupos','Grupos'],...options('pestanas')]) {
    tabs.append(button(name,()=>{tab=id;contact='';render();},tab===id?'selected':''));
  }
  tabs.append(button('Añadir pestaña',()=>edit('pestanas')));
  view.append(tabs);
  const split=el('div','','split'), left=panel('Conversaciones'), right=panel('Ficha CRM');
  const rows=data.contactos.filter(row=>!tab||row.tipo===tab||data.asignaciones.some(link=>link.pestana===tab&&link.contacto===row.id));
  if(!rows.length) left.append(empty('No hay contactos en esta vista.'));
  for(const row of rows) left.append(button(row.nombre,()=>{contact=row.id;render();},'contact'));
  const activeTab=get('pestanas',tab);
  if(activeTab) left.append(itemRow('pestanas',activeTab));
  const selected=get('contactos',contact);
  if(!selected) right.append(empty('Selecciona un contacto para abrir su ficha.'));
  else {
    right.append(itemRow('contactos',selected),el('p','El historial y los filtros de mensajes requieren una conexión con WhatsApp.'));
    for(const [table,title] of [['asignaciones','Pestañas'],['cronograma','Cronograma'],['notas','Notas'],['recordatorios','Recordatorios']]) {
      right.append(list(table,title,data[table].filter(item=>item.contacto===contact),{contacto:contact}));
    }
  }
  split.append(left,right);
  view.append(split);
}
function board(view) {
  const grid=el('div','','kanban');
  for(const stage of [{id:'',nombre:'Sin etapa asignada'},...data.etapas]) {
    const column=panel(stage.nombre);
    if(stage.id) column.append(itemRow('etapas',stage));
    column.ondragover=event=>event.preventDefault();
    column.ondrop=async event=>{
      event.preventDefault();
      const row=get('contactos',event.dataTransfer.getData('text/plain'));
      if(!row) return;
      try { await write('contactos',{...row,etapa:stage.id}); await refresh(); }
      catch(error) { $('aviso').textContent=error.message; }
    };
    const cards=data.contactos.filter(row=>(row.etapa||'')===stage.id);
    if(!cards.length) column.append(empty('Sin contactos.'));
    for(const card of cards) {
      const node=button(card.nombre,()=>edit('contactos',card),'contact');
      node.draggable=true;
      node.ondragstart=event=>event.dataTransfer.setData('text/plain',card.id);
      column.append(node);
    }
    grid.append(column);
  }
  view.append(grid);
}
function exportContacts() {
  const csv=value=>'"'+String(value??'').replace(/^[\s]*[=+\-@]/,"'$&").replaceAll('"','""')+'"';
  const rows=[['Nombre','Teléfono','Tipo','Etapa'],...data.contactos.map(row=>[row.nombre,row.telefono,row.tipo,label('etapas',row.etapa)])];
  const blob=new Blob(['\ufeff',rows.map(row=>row.map(csv).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const link=el('a');
  link.download='contactos-von-braun.csv';
  link.href=URL.createObjectURL(blob);
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
function chatbot(view) {
  const box=panel('Prueba local');
  const input=el('input'), result=el('p','','muted');
  input.placeholder='Escribe un mensaje de prueba';
  input.setAttribute('aria-label','Mensaje de prueba');
  box.append(input,button('Probar',()=>{
    const query=input.value.trim().toLocaleLowerCase('es');
    const matches=data.flujos.filter(row=>{
      const keyword=row.clave.trim().toLocaleLowerCase('es');
      return row.coincidencia==='Exacta' ? query===keyword : query.includes(keyword);
    });
    result.textContent=matches.map(row=>[row.nombre,row.texto,row.opciones].filter(Boolean).join('\n')).join('\n\n')||'Sin coincidencias.';
  }),result);
  view.append(box);
}
function render() {
  $('aviso').textContent='';
  $('nav').replaceChildren(...modules.map(([id,title])=>{
    const item=button(title,()=>{page=id;render();});
    if(id===page) item.setAttribute('aria-current','page');
    return item;
  }));
  const view=$('vista'), heading=el('div','','heading'), title=el('div'), actions=el('div','','bar');
  const [,name,desc]=modules.find(([id])=>id===page);
  title.append(el('h1',name),el('p',desc));
  if(page==='contactos') actions.append(button('Exportar CSV',exportContacts));
  if(page==='bandeja') actions.append(button('Agregar contacto',()=>edit('contactos'),'primary'));
  else if(schemas[page]) actions.append(button(page==='etapas'?'Crear etapa':'Agregar',()=>edit(page),'primary'));
  heading.append(title,actions);
  view.replaceChildren(heading);
  if(page==='bandeja') return inbox(view);
  if(page==='whatsapp') {
    const box=panel('Mensajes entrantes');
    const messages=el('div');
    async function loadMessages() {
      messages.replaceChildren(empty('Cargando mensajes…'));
      try {
        const result=await fetchJson('/api/whatsapp');
        messages.replaceChildren();
        if(!result.configurado) messages.append(empty('Completa la configuración del webhook en Render.'));
        else if(!result.mensajes.length) messages.append(empty('Todavía no hay mensajes de prueba.'));
        for(const item of result.mensajes) {
          const time=new Date(Number(item.fecha)*1000);
          const row=el('article','','row');
          const text=el('div');
          text.append(el('strong','+'+item.remitente),el('div',item.texto,'muted'));
          row.append(text,el('span',Number.isNaN(time.valueOf())?'':time.toLocaleString('es-PE',{timeZone:'America/Lima'}),'muted'));
          messages.append(row);
        }
      } catch(error) { messages.replaceChildren(empty('No se pudo consultar la bandeja de WhatsApp.')); }
    }
    box.append(button('Actualizar',loadMessages),messages);
    view.append(box);
    loadMessages();
    return;
  }
  if(page==='etapas') return board(view);
  if(page==='ayuda') {
    const guide=panel('Operación local');
    guide.append(el('p','Registra un contacto, asígnalo a una pestaña y agrega una nota o un recordatorio desde la ficha CRM. Crea tus etapas desde el embudo.'),el('p','Los mensajes programados, las campañas y las reglas se guardan en este equipo. La conexión oficial de WhatsApp es necesaria para recibir conversaciones y ejecutar envíos.'),el('p','El modo IA guarda configuración local. Para responder requiere un proveedor de IA y, para conversar por WhatsApp, la conexión del canal.'));
    view.append(guide);
    return;
  }
  if(page==='flujos') chatbot(view);
  const entries=panel();
  const rows=page==='recordatorios' ? [...data[page]].sort((a,b)=>a.fecha.localeCompare(b.fecha)) : data[page];
  if(!rows.length) entries.append(empty('Aún no hay registros.'));
  if(page==='contactos') {
    const search=el('input');
    search.type='search';
    search.placeholder='Buscar por nombre o teléfono';
    search.setAttribute('aria-label','Buscar contactos');
    search.oninput=()=>{
      const query=search.value.trim().toLocaleLowerCase('es');
      for(const node of entries.querySelectorAll('[data-search]')) node.hidden=!node.dataset.search.includes(query);
    };
    entries.append(search);
  }
  for(const row of rows) {
    const extras=page==='respuestas' ? [button('Copiar',async()=>navigator.clipboard.writeText(row.texto))] : [];
    const item=itemRow(page,row,extras);
    if(page==='contactos') {
      item.dataset.search=(row.nombre+' '+(row.telefono||'')).toLocaleLowerCase('es');
    }
    entries.append(item);
    if(page==='campanas') entries.append(list('destinatarios','Destinatarios',data.destinatarios.filter(item=>item.campana===row.id),{campana:row.id}));
  }
  view.append(entries);
}
refresh().catch(error=>{$('aviso').textContent=error.message;});
