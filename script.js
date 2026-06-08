const table = document.getElementById('clientTable');
const modal = document.getElementById('modal');
let clients = JSON.parse(localStorage.getItem('clients')) || [];
let editingIndex = null;

const days = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const dayLabels = {
    seg: 'Seg',
    ter: 'Ter',
    qua: 'Qua',
    qui: 'Qui',
    sex: 'Sex',
    sab: 'Sab',
    dom: 'Dom'
};

const statusConfig = {
    none: { label: 'Sem pedido', short: 'Sem pedido', className: 'sem-pedido' },
    pedidoDia: { label: 'Pedido do dia', short: 'Do dia', className: 'pedido-dia' },
    fazendo: { label: 'Pedido sendo feito', short: 'Fazendo', className: 'pedido-fazendo' },
    realizado: { label: 'Pedido realizado', short: 'Realizado', className: 'pedido-realizado' }
};

function saveStorage() {
    localStorage.setItem('clients', JSON.stringify(clients));
}

function normalizeStatus(status) {
    const oldStatusMap = {
        '⬛': 'none',
        '🟧': 'pedidoDia',
        '🟢': 'realizado'
    };

    return oldStatusMap[status] || status || 'none';
}

function normalizeClients() {
    let changed = false;

    clients = clients.map(client => {
        const normalizedDays = {};

        days.forEach(day => {
            normalizedDays[day] = normalizeStatus(client.days && client.days[day]);
            if (!client.days || client.days[day] !== normalizedDays[day]) {
                changed = true;
            }
        });

        return { ...client, days: normalizedDays };
    });

    if (changed) saveStorage();
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getWeekDates() {
    const today = new Date();
    const monday = new Date(today);
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    return days.map((dayKey, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return { dayKey, date };
    });
}

function formatDate(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
    });
}

function getTodayColumn() {
    const map = { 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab', 0: 'dom' };
    return map[new Date().getDay()];
}

function renderWeekCalendar() {
    const todayKey = getTodayColumn();
    const calendar = document.getElementById('weekCalendar');

    calendar.innerHTML = getWeekDates().map(({ dayKey, date }) => `
        <div class="calendar-day ${dayKey === todayKey ? 'active' : ''}">
            <span>${dayLabels[dayKey]}</span>
            <strong>${formatDate(date)}</strong>
        </div>
    `).join('');

    getWeekDates().forEach(({ dayKey, date }) => {
        const header = document.querySelector(`[data-day-header="${dayKey}"]`);
        if (!header) return;
        header.innerHTML = `<span>${dayLabels[dayKey]}</span><small>${formatDate(date)}</small>`;
    });
}

function updatePendingCount() {
    const today = getTodayColumn();
    let pending = 0;

    clients.forEach(client => {
        const status = client.days[today];
        if (status === 'pedidoDia' || status === 'fazendo') pending++;
    });

    document.getElementById('pendingCount').innerText = `Faltam ${pending} pedidos hoje`;
}

function render() {
    normalizeClients();
    renderWeekCalendar();
    table.innerHTML = '';

    clients.forEach((client, index) => {
        const row = document.createElement('tr');
        let html = `<td>${escapeHTML(client.name)}</td>`;

        days.forEach(day => {
            const status = statusConfig[client.days[day]] || statusConfig.none;
            html += `
                <td>
                    <button class="status ${status.className}" onclick="toggleStatus(${index},'${day}')" title="${status.label}">
                        ${status.short}
                    </button>
                </td>
            `;
        });

        html += `<td>
            <button class="action-btn edit" onclick="editClient(${index})" title="Editar">Editar</button>
            <button class="action-btn delete" onclick="deleteClient(${index})" title="Excluir">Excluir</button>
        </td>`;

        row.innerHTML = html;
        table.appendChild(row);
    });

    highlightToday();
    updatePendingCount();
    updateDashboard();
}

function highlightToday() {
    const map = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 7 };
    const idx = map[getTodayColumn()];

    document.querySelectorAll('.today-column').forEach(cell => {
        cell.classList.remove('today-column');
    });

    document.querySelectorAll('tr').forEach(row => {
        if (row.children[idx]) row.children[idx].classList.add('today-column');
    });
}

function toggleStatus(index, day) {
    const current = clients[index].days[day];
    const nextStatus = {
        pedidoDia: 'fazendo',
        fazendo: 'realizado',
        realizado: 'pedidoDia'
    };

    if (current === 'none') return;

    clients[index].days[day] = nextStatus[current] || 'pedidoDia';
    saveStorage();
    render();
}

function formatClientStatus(client, day) {
    const status = statusConfig[client.days[day]];
    return `${escapeHTML(client.name)} <small>${status.label}</small>`;
}

function updateDashboard() {
    const today = getTodayColumn();
    const todayList = [];
    const doingList = [];
    const completedList = [];

    clients.forEach(client => {
        const status = client.days[today];

        if (status !== 'none') todayList.push(formatClientStatus(client, today));
        if (status === 'fazendo') doingList.push(escapeHTML(client.name));
        if (status === 'realizado') completedList.push(escapeHTML(client.name));
    });

    document.getElementById('todayClients').innerHTML =
        todayList.length ? todayList.join('<br>') : 'Nenhum cliente hoje';

    document.getElementById('pendingClients').innerHTML =
        doingList.length ? doingList.join('<br>') : 'Nenhum pedido sendo feito';

    document.getElementById('completedClients').innerHTML =
        completedList.length ? completedList.join('<br>') : 'Nenhum pedido realizado';
}

function openModal() {
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

document.getElementById('addClientBtn').onclick = () => {
    editingIndex = null;
    document.getElementById('clientName').value = '';
    document.querySelectorAll('.days input').forEach(checkbox => {
        checkbox.checked = false;
    });
    openModal();
};

document.getElementById('cancelClient').onclick = closeModal;

document.getElementById('saveClient').onclick = () => {
    const name = document.getElementById('clientName').value.trim();
    if (!name) return;

    const selectedDays = {};
    days.forEach(day => {
        const isChecked = document.querySelector(`input[value="${day}"]`).checked;
        const previousStatus = editingIndex !== null ? clients[editingIndex].days[day] : 'none';
        selectedDays[day] = isChecked ? (previousStatus === 'none' ? 'pedidoDia' : previousStatus) : 'none';
    });

    if (editingIndex !== null) {
        clients[editingIndex] = { name, days: selectedDays };
    } else {
        clients.push({ name, days: selectedDays });
    }

    saveStorage();
    render();
    closeModal();
};

function deleteClient(index) {
    if (!confirm('Excluir cliente?')) return;
    clients.splice(index, 1);
    saveStorage();
    render();
}

function editClient(index) {
    editingIndex = index;
    const client = clients[index];
    document.getElementById('clientName').value = client.name;

    days.forEach(day => {
        document.querySelector(`input[value="${day}"]`).checked = client.days[day] !== 'none';
    });

    openModal();
}

document.getElementById('resetWeekBtn').onclick = () => {
    if (!confirm('Reiniciar semana?')) return;

    clients.forEach(client => {
        days.forEach(day => {
            if (client.days[day] !== 'none') client.days[day] = 'pedidoDia';
        });
    });

    saveStorage();
    render();
};

document.getElementById('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(clients, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'planejamento-axis1-backup.json';
    link.click();
};

document.getElementById('importBtn').onclick = () => {
    document.getElementById('importFile').click();
};

document.getElementById('importFile').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        clients = JSON.parse(reader.result);
        normalizeClients();
        saveStorage();
        render();
        alert('Backup importado com sucesso!');
    };
    reader.readAsText(file);
});

render();
