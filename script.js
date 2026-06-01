const table=document.getElementById('clientTable');
const modal=document.getElementById('modal');

let clients=JSON.parse(localStorage.getItem('clients'))||[];
let editingIndex=null;

const days=['seg','ter','qua','qui','sex','sab'];

function saveStorage(){
localStorage.setItem('clients',JSON.stringify(clients));
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
}

function toggleStatus(index,day){
let current=clients[index].days[day];
if(current==='⬛') return;

clients[index].days[day]=current==='🟧'?'🟢':'🟧';

saveStorage();
render();
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
const checked=document.querySelector(`input[value="${day}"]`).checked;
selectedDays[day]=checked?'🟧':'⬛';
});

if(editingIndex!==null){
clients[editingIndex]={name,days:selectedDays};
}else{
clients.push({name,days:selectedDays});
}

saveStorage();
render();
closeModal();
};

function deleteClient(index){
if(!confirm('Excluir cliente?')) return;
clients.splice(index,1);
saveStorage();
render();
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

render();