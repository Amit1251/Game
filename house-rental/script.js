(() => {
    'use strict';

    const storageKey = 'house-rental-tenants-v1';
    const monthKey = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit' }).format(new Date());
    const currentMonth = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(new Date());
    const currentDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date());
    const elements = {
        list: document.getElementById('tenant-list'), empty: document.getElementById('empty-state'), emptyTitle: document.getElementById('empty-title'), emptyCopy: document.getElementById('empty-copy'),
        form: document.getElementById('tenant-form'), modal: document.getElementById('tenant-modal'), error: document.getElementById('form-error'), toast: document.getElementById('toast'),
        search: document.getElementById('search'), filter: document.getElementById('status-filter'), sort: document.getElementById('sort-order'),
        totalTenants: document.getElementById('total-tenants'), totalRent: document.getElementById('total-rent'), totalPaid: document.getElementById('total-paid'), totalUnpaid: document.getElementById('total-unpaid'), tenantCount: document.getElementById('tenant-count'), importFile: document.getElementById('import-file')
    };

    let tenants = loadTenants();
    let toastTimer;
    document.getElementById('current-month').textContent = currentMonth;
    document.getElementById('current-date').textContent = currentDate;

    function loadTenants() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            return [];
        }
    }

    function saveTenants() { localStorage.setItem(storageKey, JSON.stringify(tenants)); }
    function money(value) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0); }
    function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }

    function getVisibleTenants() {
        const query = elements.search.value.trim().toLowerCase();
        const filter = elements.filter.value;
        return tenants.filter(tenant => tenant.name.toLowerCase().includes(query) && (filter === 'ALL' || tenant.status === filter)).sort((first, second) => {
            if (elements.sort.value === 'room') return first.room.localeCompare(second.room, undefined, { numeric: true });
            if (elements.sort.value === 'rent-high') return second.rent - first.rent;
            return first.name.localeCompare(second.name);
        });
    }

    function updateDashboard() {
        const totalRent = tenants.reduce((sum, tenant) => sum + tenant.rent, 0);
        const paid = tenants.filter(tenant => tenant.status === 'PAID').reduce((sum, tenant) => sum + tenant.rent, 0);
        elements.totalTenants.textContent = tenants.length;
        elements.totalRent.textContent = money(totalRent);
        elements.totalPaid.textContent = money(paid);
        elements.totalUnpaid.textContent = money(totalRent - paid);
        elements.tenantCount.textContent = `${tenants.length} ${tenants.length === 1 ? 'tenant' : 'tenants'}`;
    }

    function render() {
        updateDashboard();
        const visible = getVisibleTenants();
        elements.list.innerHTML = visible.map(tenant => `
      <article class="tenant-row">
        <div><span class="tenant-label">Tenant</span><div class="tenant-name">${escapeHtml(tenant.name)}</div><div class="tenant-phone">${escapeHtml(tenant.phone || 'No phone added')}</div></div>
        <div class="tenant-detail"><span class="tenant-label">Room</span><strong>${escapeHtml(tenant.room)}</strong></div>
        <div class="tenant-detail"><span class="tenant-label">Monthly rent</span><strong>${money(tenant.rent)}</strong></div>
        <div class="tenant-detail"><span class="tenant-label">Joined</span><strong>${formatDate(tenant.joiningDate)}</strong></div>
        <div><span class="tenant-label">${currentMonth}</span><button class="status-button ${tenant.status === 'PAID' ? 'status-paid' : 'status-unpaid'}" data-action="toggle" data-id="${tenant.id}" type="button">${tenant.status}</button></div>
        <button class="delete-button" data-action="delete" data-id="${tenant.id}" type="button">Delete</button>
      </article>`).join('');
        const noMatches = tenants.length > 0 && visible.length === 0;
        elements.empty.hidden = visible.length > 0;
        elements.emptyTitle.textContent = noMatches ? 'No matching tenants.' : 'No tenants added yet.';
        elements.emptyCopy.textContent = noMatches ? 'Try a different name or payment filter.' : 'Add your first tenant to start tracking monthly rent.';
        document.getElementById('empty-add').hidden = noMatches;
    }

    function formatDate(value) { return value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : '—'; }
    function showForm() { elements.modal.hidden = false; document.body.classList.add('modal-open'); document.getElementById('tenant-name').focus(); }
    function hideForm() { elements.modal.hidden = true; document.body.classList.remove('modal-open'); elements.form.reset(); elements.error.textContent = ''; }
    function showToast(message) { clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add('visible'); toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2400); }

    function exportData() {
        const file = new Blob([JSON.stringify(tenants, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = `my-house-tenants-${monthKey}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('JSON backup downloaded');
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const imported = JSON.parse(reader.result);
                if (!Array.isArray(imported) || imported.some(item => !item || typeof item.name !== 'string' || typeof item.room !== 'string' || !Number.isFinite(Number(item.rent)))) throw new Error('invalid format');
                tenants = imported.map(item => ({ ...item, rent: Number(item.rent), status: item.status === 'PAID' ? 'PAID' : 'UNPAID' }));
                saveTenants(); render(); showToast(`${tenants.length} tenant records imported`);
            } catch (error) {
                showToast('Import failed: invalid JSON file');
            }
        };
        reader.readAsText(file);
    }

    document.getElementById('open-form').addEventListener('click', showForm);
    document.getElementById('empty-add').addEventListener('click', showForm);
    document.getElementById('close-form').addEventListener('click', hideForm);
    document.getElementById('cancel-form').addEventListener('click', hideForm);
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('import-data').addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', event => { if (event.target.files[0]) importData(event.target.files[0]); event.target.value = ''; });
    elements.modal.addEventListener('click', event => { if (event.target === elements.modal) hideForm(); });
    [elements.search, elements.filter, elements.sort].forEach(control => control.addEventListener('input', render));

    elements.form.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(elements.form);
        const name = data.get('name').trim();
        const room = data.get('room').trim();
        const rent = Number(data.get('rent'));
        const joiningDate = data.get('joiningDate');
        if (!name || !room || !joiningDate || !Number.isFinite(rent) || rent < 0) {
            elements.error.textContent = 'Please complete the required fields with a valid rent amount.';
            return;
        }
        tenants.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name, phone: data.get('phone').trim(), room, rent, joiningDate, status: 'UNPAID', month: monthKey });
        saveTenants(); render(); hideForm(); showToast('Tenant added');
    });

    elements.list.addEventListener('click', event => {
        const action = event.target.closest('[data-action]');
        if (!action) return;
        const tenant = tenants.find(item => item.id === action.dataset.id);
        if (!tenant) return;
        if (action.dataset.action === 'toggle') {
            tenant.status = tenant.status === 'PAID' ? 'UNPAID' : 'PAID';
            saveTenants(); render(); showToast(`Marked ${tenant.status.toLowerCase()}`);
        } else if (action.dataset.action === 'delete' && window.confirm(`Delete ${tenant.name}?`)) {
            tenants = tenants.filter(item => item.id !== tenant.id); saveTenants(); render(); showToast('Tenant deleted');
        }
    });

    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !elements.modal.hidden) hideForm(); });
    render();
})();