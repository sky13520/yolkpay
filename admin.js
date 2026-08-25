const loginView = document.querySelector('[data-admin-login]');
const dashboard = document.querySelector('[data-admin-dashboard]');

if (loginView && dashboard) {
  const requestForm = document.querySelector('[data-code-request]');
  const verifyForm = document.querySelector('[data-code-verify]');
  const rows = document.querySelector('[data-application-rows]');
  const empty = document.querySelector('[data-admin-empty]');
  const adminStatus = document.querySelector('[data-admin-status]');
  const drawerBackdrop = document.querySelector('[data-drawer-backdrop]');
  const drawerContent = document.querySelector('[data-drawer-content]');
  let searchTimer;

  function setStatus(element, message, error = false) {
    element.textContent = message;
    element.classList.toggle('error', error);
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || 'Request failed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function showLogin() {
    loginView.hidden = false;
    dashboard.hidden = true;
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboard.hidden = false;
    loadApplications();
  }

  requestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = requestForm.querySelector('button');
    button.disabled = true;
    setStatus(requestForm.querySelector('.form-status'), 'Sending verification code…');
    try {
      await api('/api/admin/request-code', { method: 'POST' });
      requestForm.hidden = true;
      verifyForm.hidden = false;
      verifyForm.querySelector('input').focus();
    } catch (error) {
      setStatus(requestForm.querySelector('.form-status'), error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  verifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = verifyForm.querySelector('[type="submit"]');
    button.disabled = true;
    setStatus(verifyForm.querySelector('.form-status'), 'Verifying…');
    try {
      await api('/api/admin/verify-code', { method: 'POST', body: new FormData(verifyForm) });
      verifyForm.reset();
      showDashboard();
    } catch (error) {
      setStatus(verifyForm.querySelector('.form-status'), error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('[data-resend]').addEventListener('click', () => {
    verifyForm.hidden = true;
    requestForm.hidden = false;
  });

  function statusLabel(status) {
    return {
      new: 'New',
      reviewing: 'Reviewing',
      approved: 'Approved',
      declined: 'Declined',
      more_info: 'More info needed'
    }[status] || status;
  }

  function addCell(row, text, className = '') {
    const cell = document.createElement('td');
    cell.textContent = text;
    if (className) cell.className = className;
    row.appendChild(cell);
  }

  async function loadApplications() {
    const query = new URLSearchParams({
      q: document.querySelector('[data-admin-search]').value.trim(),
      status: document.querySelector('[data-status-filter]').value
    });
    setStatus(adminStatus, 'Loading applications…');
    try {
      const data = await api(`/api/admin/applications?${query}`);
      rows.replaceChildren();
      document.querySelector('[data-total]').textContent = data.total;
      data.applications.forEach((application) => {
        const row = document.createElement('tr');
        addCell(row, new Date(application.created_at).toLocaleDateString('en-CA'));
        const business = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = application.legal_name;
        const ref = document.createElement('small');
        ref.textContent = application.id;
        business.append(strong, ref);
        row.appendChild(business);
        const contact = document.createElement('td');
        contact.textContent = application.principal_name;
        const email = document.createElement('small');
        email.textContent = application.principal_email;
        contact.appendChild(email);
        row.appendChild(contact);
        addCell(row, application.country);
        addCell(row, application.agent_slug || application.agent_id || 'Direct');
        const statusCell = document.createElement('td');
        const pill = document.createElement('span');
        pill.className = `status-pill status-${application.status}`;
        pill.textContent = statusLabel(application.status);
        statusCell.appendChild(pill);
        row.appendChild(statusCell);
        const action = document.createElement('td');
        const button = document.createElement('button');
        button.className = 'text-button';
        button.type = 'button';
        button.textContent = 'View →';
        button.addEventListener('click', () => openApplication(application.id));
        action.appendChild(button);
        row.appendChild(action);
        rows.appendChild(row);
      });
      empty.hidden = data.applications.length !== 0;
      setStatus(adminStatus, '');
    } catch (error) {
      if (error.status === 401) return showLogin();
      setStatus(adminStatus, error.message, true);
    }
  }

  function detailItem(label, value) {
    const item = document.createElement('div');
    item.className = 'drawer-detail';
    const small = document.createElement('small');
    small.textContent = label;
    const content = document.createElement('strong');
    content.textContent = value || '—';
    item.append(small, content);
    return item;
  }

  function applicationOwners(app) {
    try {
      const parsed = JSON.parse(app.owners_json || '[]');
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // Older records did not include structured owner data.
    }
    return [{
      name: app.principal_name,
      title: app.principal_title,
      ownership_percent: app.ownership_percent,
      phone: app.principal_phone,
      email: app.principal_email
    }];
  }

  async function openApplication(id) {
    drawerContent.replaceChildren();
    drawerBackdrop.hidden = false;
    drawerContent.textContent = 'Loading application…';
    try {
      const data = await api(`/api/admin/applications/${encodeURIComponent(id)}`);
      const app = data.application;
      drawerContent.replaceChildren();
      const eyebrow = document.createElement('div');
      eyebrow.className = 'kicker';
      eyebrow.textContent = app.id;
      const title = document.createElement('h2');
      title.textContent = app.legal_name;
      const date = document.createElement('p');
      date.className = 'muted';
      date.textContent = `Submitted ${new Date(app.created_at).toLocaleString('en-CA')}`;
      const statusField = document.createElement('label');
      statusField.className = 'drawer-status';
      statusField.innerHTML = '<span>Application status</span>';
      const select = document.createElement('select');
      ['new', 'reviewing', 'more_info', 'approved', 'declined'].forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = statusLabel(value);
        option.selected = value === app.status;
        select.appendChild(option);
      });
      select.addEventListener('change', async () => {
        try {
          const body = new FormData();
          body.set('status', select.value);
          await api(`/api/admin/applications/${encodeURIComponent(id)}/status`, { method: 'POST', body });
          loadApplications();
        } catch (error) {
          window.alert(error.message);
        }
      });
      statusField.appendChild(select);
      drawerContent.append(eyebrow, title, date, statusField);

      const owners = applicationOwners(app);
      const groups = [
        ['Partner attribution', [['Partner', app.partner || app.agent_slug || app.agent_id || 'Direct YolkPay registration'], ['Legacy Agent ID', app.agent_id || '—'], ['Legacy Agent slug', app.agent_slug || '—']]],
        ['Business', [['Country', app.country], ['Business type', app.business_type], ['Registration / tax ID', app.license_number], ['Address', app.business_address], ['Phone', app.business_phone], ['Email', app.business_email], ['Website', app.website], ['Established', app.established_date], ['Annual volume', app.annual_volume], ['Average transaction', app.average_transaction], ['Business activity', app.business_description]]],
        ...owners.map((owner, index) => [
          `Owner / controlling person ${index + 1}`,
          [['Name', owner.name], ['Title', owner.title], ['Ownership', `${owner.ownership_percent}%`], ['Phone', owner.phone], ['Email', owner.email]],
        ]),
        ['Banking', [['Account type', app.bank_type]]],
        ['Notification', [
          ['Email status', app.notification_status || 'Unknown'],
          ['Delivery detail', app.notification_error || (app.notification_status === 'sent' ? 'Notification sent to info@yolkpay.com' : '—')],
        ]],
      ];
      groups.forEach(([name, values]) => {
        const heading = document.createElement('h3');
        heading.textContent = name;
        const grid = document.createElement('div');
        grid.className = 'drawer-grid';
        values.forEach(([label, value]) => grid.appendChild(detailItem(label, value)));
        drawerContent.append(heading, grid);
      });

      const documentHeading = document.createElement('h3');
      documentHeading.textContent = 'Documents';
      const documents = document.createElement('div');
      documents.className = 'drawer-documents';
      data.documents.forEach((documentInfo) => {
        const link = document.createElement('a');
        link.href = `/api/admin/documents/${encodeURIComponent(documentInfo.id)}`;
        link.className = 'document-link';
        link.textContent = `${documentInfo.label}: ${documentInfo.filename}`;
        link.target = '_blank';
        documents.appendChild(link);
      });
      drawerContent.append(documentHeading, documents);
    } catch (error) {
      drawerContent.textContent = error.message;
    }
  }

  document.querySelector('[data-drawer-close]').addEventListener('click', () => { drawerBackdrop.hidden = true; });
  drawerBackdrop.addEventListener('click', (event) => { if (event.target === drawerBackdrop) drawerBackdrop.hidden = true; });
  document.querySelector('[data-refresh]').addEventListener('click', loadApplications);
  document.querySelector('[data-status-filter]').addEventListener('change', loadApplications);
  document.querySelector('[data-admin-search]').addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(loadApplications, 300);
  });
  document.querySelector('[data-logout]').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
    showLogin();
  });

  api('/api/admin/session').then(showDashboard).catch(showLogin);
}
