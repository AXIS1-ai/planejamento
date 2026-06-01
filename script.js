
const table=document.getElementById('clientTable');
const modal=document.getElementById('modal');
let clients=JSON.parse(localStorage.getItem('clients'))||[];
let editingIndex=null;
const days=['seg','ter','qua','qui','sex','sab'];

function saveStorage(){localStorage.setItem('clients',JSON.stringify(clients));}

function getTodayColumn(){
const map={1:'seg',2:'ter',3:'qua',4:'qui',5:'sex',6:'sab'};
return map[new Date().getDay()];
}

function updatePendingCount(){
const today=getTodayColumn();
let pending=0;
if(today){
clients.forEach(c=>{if(c.days[today]==='🟧') pending++;});
}
document.getElementById('pendingCount').innerText=`🔥 Faltam ${pending} artes hoje`;
}

function render(){
table.innerHTML='';
clients.forEach((client,index)=>{
let row=document.createElement('tr');
let html=`<td>${client.name}</td>`;
days.forEach(day=>{
html+=`<td><span class="status" onclick="toggleStatus(${index},'${day}')">${client.days[day]}</span></td>`;
});
html+=`<td>
<button class="action-btn edit" onclick="editClient(${index})">✏️</button>
<button class="action-btn delete" onclick="deleteClient(${index})">🗑️</button>
</td>`;
row.innerHTML=html;
table.appendChild(row);
});
highlightToday();
updatePendingCount();
updateDashboard();
}

function highlightToday(){
const map={seg:1,ter:2,qua:3,qui:4,sex:5,sab:6};
const idx=map[getTodayColumn()];
if(!idx) return;
document.querySelectorAll('tr').forEach(r=>{
if(r.children[idx]) r.children[idx].classList.add('today-column');
});
}

function toggleStatus(index,day){
let current=clients[index].days[day];
if(current==='⬛') return;
clients[index].days[day]=current==='🟧'?'🟢':'🟧';
  function updateDashboard(){

const today=getTodayColumn();

if(!today){
return;
}

let todayList=[];
let pendingList=[];
let completedList=[];

clients.forEach(client=>{

const status=client.days[today];

if(status!=="⬛"){

todayList.push(client.name);

if(status==="🟧"){
pendingList.push(client.name);
}

if(status==="🟢"){
completedList.push(client.name);
}

}

});

document.getElementById('todayClients').innerHTML=
todayList.length
? todayList.join('<br>')
: 'Nenhum cliente hoje';

document.getElementById('pendingClients').innerHTML=
pendingList.length
? pendingList.join('<br>')
: 'Nenhum pendente';

document.getElementById('completedClients').innerHTML=
completedList.length
? completedList.join('<br>')
: 'Nenhuma concluída';

}
saveStorage(); render();
}

function openModal(){modal.style.display='flex';}
function closeModal(){modal.style.display='none';}

document.getElementById('addClientBtn').onclick=()=>{
editingIndex=null;
document.getElementById('clientName').value='';
document.querySelectorAll('.days input').forEach(cb=>cb.checked=false);
openModal();
};

document.getElementById('cancelClient').onclick=closeModal;

document.getElementById('saveClient').onclick=()=>{
const name=document.getElementById('clientName').value;
if(!name) return;
const selectedDays={};
days.forEach(day=>{
selectedDays[day]=document.querySelector(`input[value="${day}"]`).checked?'🟧':'⬛';
});
if(editingIndex!==null){clients[editingIndex]={name,days:selectedDays};}
else{clients.push({name,days:selectedDays});}
saveStorage(); render(); closeModal();
};

function deleteClient(index){
if(!confirm('Excluir cliente?')) return;
clients.splice(index,1); saveStorage(); render();
}

function editClient(index){
editingIndex=index;
const client=clients[index];
document.getElementById('clientName').value=client.name;
days.forEach(day=>{
document.querySelector(`input[value="${day}"]`).checked=client.days[day]!=='⬛';
});
openModal();
}

document.getElementById('resetWeekBtn').onclick=()=>{
if(!confirm('Reiniciar semana?')) return;
clients.forEach(c=>days.forEach(d=>{if(c.days[d]==='🟢') c.days[d]='🟧';}));
saveStorage(); render();
};

document.getElementById('exportBtn').onclick=()=>{
const blob=new Blob([JSON.stringify(clients,null,2)],{type:'application/json'});
const a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='planejamento-axis1-backup.json';
a.click();
};

document.getElementById('importBtn').onclick=()=>{
document.getElementById('importFile').click();
};

document.getElementById('importFile').addEventListener('change',(e)=>{
const file=e.target.files[0];
if(!file) return;
const reader=new FileReader();
reader.onload=()=>{
clients=JSON.parse(reader.result);
saveStorage();
render();
alert('Backup importado com sucesso!');
};
reader.readAsText(file);
});

render();
