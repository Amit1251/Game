(() => {
    'use strict';

    const config = window.HOUSE_RENTAL_SUPABASE_CONFIG || {};
    const supabaseClient = window.supabase && config.url && config.anonKey && !config.url.startsWith('YOUR_') && !config.anonKey.startsWith('YOUR_')
        ? window.supabase.createClient(config.url, config.anonKey)
        : null;
    const date = new Date();
    const currentMonthNumber = date.getMonth() + 1;
    const currentYear = date.getFullYear();
    const currentMonth = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(date);
    const currentDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
    const elements = {
        list: document.getElementById('tenant-list'), empty: document.getElementById('empty-state'), emptyTitle: document.getElementById('empty-title'), emptyCopy: document.getElementById('empty-copy'),
        form: document.getElementById('tenant-form'), modal: document.getElementById('tenant-modal'), error: document.getElementById('form-error'), toast: document.getElementById('toast'),
        search: document.getElementById('search'), filter: document.getElementById('status-filter'), sort: document.getElementById('sort-order'),
        totalTenants: document.getElementById('total-tenants'), totalRent: document.getElementById('total-rent'), totalPaid: document.getElementById('total-paid'), totalUnpaid: document.getElementById('total-unpaid'), tenantCount: document.getElementById('tenant-count')
    };
    let tenants = [];
    let busy = false;
    let toastTimer;

    document.getElementById('current-month').textContent = currentMonth;
    document.getElementById('current-date').textContent = currentDate;

    function money(value) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0); }
    function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
    function formatDate(value) { return value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : '—'; }
    function getDueDate(joiningDate) {
        if (!joiningDate) return null;
        const day = Number(joiningDate.slice(-2));
        const lastDay = new Date(currentYear, currentMonthNumber, 0).getDate();
        return `${currentYear}-${String(currentMonthNumber).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
    }
    function getWhatsAppLink(tenant) {
        const phone = tenant.phone.replace(/\D/g, '');
        if (!phone) return '';
        const dueDate = formatDate(getDueDate(tenant.joiningDate));
        const message = `Hi ${tenant.name}, your rent of ${money(tenant.rent)} for room ${tenant.room} was due on ${dueDate}. Please pay it at your earliest convenience.`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }
    function showToast(message) { clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add('visible'); toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 3000); }
    function setBusy(value) { busy = value; document.querySelectorAll('button').forEach(button => { button.disabled = value; }); }
    function showForm() { if (!supabaseClient) return; elements.modal.hidden = false; document.body.classList.add('modal-open'); document.getElementById('tenant-name').focus(); }
    function hideForm() { elements.modal.hidden = true; document.body.classList.remove('modal-open'); elements.form.reset(); elements.error.textContent = ''; }

    function showConfigurationMessage() {
        elements.empty.hidden = false;
        elements.emptyTitle.textContent = 'Supabase is not configured.';
        elements.emptyCopy.textContent = 'Add your Supabase URL and anon key in config.js, then reload this page.';
        document.getElementById('empty-add').hidden = true;
    }

    function normalizeTenant(row) {
        const payment = Array.isArray(row.rent_payments) ? row.rent_payments[0] : row.rent_payments;
        return { id: row.id, name: row.name, phone: row.phone || '', room: row.room_number, rent: Number(row.monthly_rent), joiningDate: row.joining_date, status: payment?.status === 'PAID' ? 'PAID' : 'UNPAID' };
    }

    async function loadTenants() {
        if (!supabaseClient) { showConfigurationMessage(); return; }
        setBusy(true);
        const result = await supabaseClient.from('tenants').select('id,name,phone,room_number,monthly_rent,joining_date,rent_payments(id,month,year,amount,status,payment_date)').eq('rent_payments.month', currentMonthNumber).eq('rent_payments.year', currentYear).order('name');
        setBusy(false);
        if (result.error) { showToast('Unable to load tenants. Please try again.'); return; }
        tenants = (result.data || []).map(normalizeTenant);
        render();
    }

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
                ${tenant.phone ? `<a class="whatsapp-button" href="${getWhatsAppLink(tenant)}" target="_blank" rel="noopener" aria-label="Send WhatsApp reminder to ${escapeHtml(tenant.name)}" title="Send WhatsApp reminder">WhatsApp</a>` : '<span class="whatsapp-button whatsapp-disabled" aria-label="No phone number available">WhatsApp</span>'}
        <button class="delete-button" data-action="delete" data-id="${tenant.id}" type="button">Delete</button>
      </article>`).join('');
        const noMatches = tenants.length > 0 && visible.length === 0;
        elements.empty.hidden = visible.length > 0;
        elements.emptyTitle.textContent = noMatches ? 'No matching tenants.' : 'No tenants added yet.';
        elements.emptyCopy.textContent = noMatches ? 'Try a different name or payment filter.' : 'Add your first tenant to start tracking monthly rent.';
        document.getElementById('empty-add').hidden = noMatches;
    }

    async function addTenant(event) {
        event.preventDefault();
        if (busy || !supabaseClient) return;
        const data = new FormData(elements.form);
        const name = data.get('name').trim();
        const room = data.get('room').trim();
        const rent = Number(data.get('rent'));
        const joiningDate = data.get('joiningDate');
        if (!name || !room || !joiningDate || !Number.isFinite(rent) || rent < 0) { elements.error.textContent = 'Please complete the required fields with a valid rent amount.'; return; }
        setBusy(true);
        const inserted = await supabaseClient.from('tenants').insert({ name, phone: data.get('phone').trim(), room_number: room, monthly_rent: rent, joining_date: joiningDate }).select('id').single();
        if (inserted.error) { setBusy(false); elements.error.textContent = 'Unable to save tenant. Please try again.'; return; }
        const payment = await supabaseClient.from('rent_payments').insert({ tenant_id: inserted.data.id, month: currentMonthNumber, year: currentYear, amount: rent, status: 'UNPAID' });
        setBusy(false);
        if (payment.error) { await supabaseClient.from('tenants').delete().eq('id', inserted.data.id); elements.error.textContent = 'Unable to create the rent record. Please try again.'; return; }
        hideForm(); await loadTenants(); showToast('Tenant added');
    }

    async function togglePayment(tenant) {
        if (busy || !supabaseClient) return;
        const status = tenant.status === 'PAID' ? 'UNPAID' : 'PAID';
        setBusy(true);
        const result = await supabaseClient.from('rent_payments').upsert({ tenant_id: tenant.id, month: currentMonthNumber, year: currentYear, amount: tenant.rent, status, payment_date: status === 'PAID' ? new Date().toISOString().slice(0, 10) : null }, { onConflict: 'tenant_id,month,year' });
        setBusy(false);
        if (result.error) { showToast('Unable to update payment. Please try again.'); return; }
        await loadTenants(); showToast(`Marked ${status.toLowerCase()}`);
    }

    async function deleteTenant(tenant) {
        if (busy || !supabaseClient || !window.confirm(`Delete ${tenant.name}?`)) return;
        setBusy(true);
        const result = await supabaseClient.from('tenants').delete().eq('id', tenant.id);
        setBusy(false);
        if (result.error) { showToast('Unable to delete tenant. Please try again.'); return; }
        await loadTenants(); showToast('Tenant deleted');
    }

    function exportData() {
        const file = new Blob([JSON.stringify(tenants, null, 2)], { type: 'application/json' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(file); link.download = `my-house-tenants-${currentYear}-${currentMonthNumber}.json`; link.click(); URL.revokeObjectURL(link.href);
    }

    document.getElementById('open-form').addEventListener('click', showForm);
    document.getElementById('empty-add').addEventListener('click', showForm);
    document.getElementById('close-form').addEventListener('click', hideForm);
    document.getElementById('cancel-form').addEventListener('click', hideForm);
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('import-data').hidden = true;
    elements.modal.addEventListener('click', event => { if (event.target === elements.modal) hideForm(); });
    [elements.search, elements.filter, elements.sort].forEach(control => control.addEventListener('input', render));
    elements.form.addEventListener('submit', addTenant);
    elements.list.addEventListener('click', event => { const action = event.target.closest('[data-action]'); if (!action) return; const tenant = tenants.find(item => item.id === action.dataset.id); if (!tenant) return; if (action.dataset.action === 'toggle') togglePayment(tenant); if (action.dataset.action === 'delete') deleteTenant(tenant); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !elements.modal.hidden) hideForm(); });

    render();
    loadTenants();
})();
