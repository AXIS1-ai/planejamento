const table = document.getElementById('clientTable');
const modal = document.getElementById('modal');
let clients = loadClients();
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

function loadClients() {
    try {
        const storedClients = JSON.parse(localStorage.getItem('clients'));
        return Array.isArray(storedClients) ? storedClients : [];
    } catch (error) {
        alert('Nao foi possivel carregar os dados salvos neste navegador.');
        return [];
    }
}

function parseBackup(content) {
    const parsed = JSON.parse(content.replace(/^\uFEFF/, ''));

    if (!Array.isArray(parsed)) {
        throw new Error('O arquivo precisa ser um backup JSON exportado pelo planejamento.');
    }

    return parsed;
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
        const normalizedStatus = client.clientStatus === 'pausado' ? 'pausado' : 'ativo';
        const normalizedMonthlyValue = Number(client.monthlyValue) || 0;

        days.forEach(day => {
            normalizedDays[day] = normalizeStatus(client.days && client.days[day]);
            if (!client.days || client.days[day] !== normalizedDays[day]) {
                changed = true;
            }
        });

        if (client.clientStatus !== normalizedStatus || client.monthlyValue !== normalizedMonthlyValue) {
            changed = true;
        }

        return {
            ...client,
            clientStatus: normalizedStatus,
            monthlyValue: normalizedMonthlyValue,
            days: normalizedDays
        };
    });

    if (changed) saveStorage();
}

function isClientActive(client) {
    return client.clientStatus !== 'pausado';
}

function formatCount(value) {
    return String(value).padStart(2, '0');
}

function getStatusCounts() {
    const counts = {
        weekOrders: 0,
        pending: 0,
        completed: 0,
        noOrder: 0,
        createdMonth: 0,
        progressTotal: 0,
        progressCompleted: 0,
        todayOrders: 0,
        todayCompleted: 0,
        todayPending: 0
    };
    const today = getTodayColumn();

    clients.filter(isClientActive).forEach(client => {
        counts.createdMonth += Number(client.monthlyValue) || 0;

        days.forEach(day => {
            const status = client.days[day];

            if (status === 'none') counts.noOrder++;
            if (status !== 'none') counts.weekOrders++;
            if (status === 'pedidoDia' || status === 'fazendo') counts.pending++;
            if (status === 'realizado') counts.completed++;

            if (status === 'pedidoDia' || status === 'realizado') counts.progressTotal++;
            if (status === 'realizado') counts.progressCompleted++;
        });

        const todayStatus = client.days[today];
        if (todayStatus !== 'none') counts.todayOrders++;
        if (todayStatus === 'realizado') counts.todayCompleted++;
        if (todayStatus === 'pedidoDia' || todayStatus === 'fazendo') counts.todayPending++;
    });

    return counts;
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

    clients.filter(isClientActive).forEach(client => {
        const status = client.days[today];
        if (status === 'pedidoDia' || status === 'fazendo') pending++;
    });

    document.getElementById('pendingCount').innerText = `Faltam ${pending} pedidos hoje`;
}

function updateTopIndicators() {
    const counts = getStatusCounts();
    const progressPercent = counts.progressTotal
        ? Math.round((counts.progressCompleted / counts.progressTotal) * 100)
        : 0;

    document.getElementById('totalWeekOrders').innerText = formatCount(counts.weekOrders);
    document.getElementById('totalPendingOrders').innerText = formatCount(counts.pending);
    document.getElementById('totalCompletedOrders').innerText = formatCount(counts.completed);
    document.getElementById('totalNoOrders').innerText = formatCount(counts.noOrder);
    document.getElementById('totalCreatedMonth').innerText = formatCount(counts.createdMonth);

    document.getElementById('todayOrderTotal').innerText = `${formatCount(counts.todayOrders)} pedidos`;
    document.getElementById('todayOrderBreakdown').innerText =
        `${formatCount(counts.todayCompleted)} realizados | ${formatCount(counts.todayPending)} pendentes`;

    document.getElementById('weekProgressPercent').innerText = `${progressPercent}%`;
    document.getElementById('weekProgressBar').style.width = `${progressPercent}%`;
    document.getElementById('weekProgressText').innerText =
        `${counts.progressCompleted} de ${counts.progressTotal} entregas concluídas`;
}

function render() {
    normalizeClients();
    renderWeekCalendar();
    table.innerHTML = '';

    const orderedClients = clients
        .map((client, index) => ({ client, index }))
        .sort((a, b) => {
            if (isClientActive(a.client) === isClientActive(b.client)) return a.index - b.index;
            return isClientActive(a.client) ? -1 : 1;
        });

    orderedClients.forEach(({ client, index }) => {
        const row = document.createElement('tr');
        if (!isClientActive(client)) row.classList.add('paused-client');

        let html = `
            <td class="client-cell">
                <strong>${escapeHTML(client.name)}</strong>
                <span>${isClientActive(client) ? 'Ativo' : 'Pausado'} | ${formatCount(Number(client.monthlyValue) || 0)} criadas</span>
            </td>
        `;

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
            <button class="action-btn pause" onclick="toggleClientStatus(${index})" title="Alterar status">${isClientActive(client) ? 'Pausar' : 'Ativar'}</button>
            <button class="action-btn delete" onclick="deleteClient(${index})" title="Excluir">Excluir</button>
        </td>`;

        row.innerHTML = html;
        table.appendChild(row);
    });

    highlightToday();
    updatePendingCount();
    updateTopIndicators();
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

    clients.filter(isClientActive).forEach(client => {
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
    document.getElementById('monthlyValue').value = '';
    document.getElementById('clientStatus').value = 'ativo';
    document.querySelectorAll('.days input').forEach(checkbox => {
        checkbox.checked = false;
    });
    openModal();
};

document.getElementById('cancelClient').onclick = closeModal;

document.getElementById('saveClient').onclick = () => {
    const name = document.getElementById('clientName').value.trim();
    const monthlyValue = Number(document.getElementById('monthlyValue').value) || 0;
    const clientStatus = document.getElementById('clientStatus').value;
    if (!name) return;

    const selectedDays = {};
    days.forEach(day => {
        const isChecked = document.querySelector(`input[value="${day}"]`).checked;
        const previousStatus = editingIndex !== null ? clients[editingIndex].days[day] : 'none';
        selectedDays[day] = isChecked ? (previousStatus === 'none' ? 'pedidoDia' : previousStatus) : 'none';
    });

    if (editingIndex !== null) {
        clients[editingIndex] = { name, monthlyValue, clientStatus, days: selectedDays };
    } else {
        clients.push({ name, monthlyValue, clientStatus, days: selectedDays });
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
    document.getElementById('monthlyValue').value = client.monthlyValue || '';
    document.getElementById('clientStatus').value = client.clientStatus || 'ativo';

    days.forEach(day => {
        document.querySelector(`input[value="${day}"]`).checked = client.days[day] !== 'none';
    });

    openModal();
}

function toggleClientStatus(index) {
    clients[index].clientStatus = isClientActive(clients[index]) ? 'pausado' : 'ativo';
    saveStorage();
    render();
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
    const importFile = document.getElementById('importFile');
    importFile.value = '';
    importFile.click();
};

document.getElementById('importFile').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            clients = parseBackup(reader.result);
            normalizeClients();
            saveStorage();
            render();
            alert(`Backup importado com sucesso! ${clients.length} clientes carregados.`);
        } catch (error) {
            alert(`Nao foi possivel importar o backup. ${error.message}`);
        }
    };
    reader.onerror = () => {
        alert('Nao foi possivel ler o arquivo selecionado.');
    };
    reader.readAsText(file);
});

render();
