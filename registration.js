const registrationForm = document.querySelector('[data-registration-form]');

if (registrationForm) {
  const panels = [...registrationForm.querySelectorAll('[data-form-step]')];
  const indicators = [...document.querySelectorAll('[data-step-indicator]')];
  const successPanel = registrationForm.querySelector('[data-registration-success]');
  const review = registrationForm.querySelector('[data-review]');
  const status = registrationForm.querySelector('.application-status');
  const ownersList = registrationForm.querySelector('[data-owners-list]');
  const ownerTemplate = registrationForm.querySelector('[data-owner-template]');
  const ownerCount = registrationForm.querySelector('[data-owner-count]');
  const addOwnerButton = registrationForm.querySelector('[data-add-owner]');
  const ownershipStatus = registrationForm.querySelector('[data-ownership-status]');
  const referral = new URLSearchParams(window.location.search);
  const partner = (referral.get('partner') || '').trim();
  const agentId = (referral.get('agent_id') || '').trim();
  const agentSlug = (referral.get('agent_slug') || '').trim();
  const safePartner = /^[A-Za-z0-9:_-]{1,100}$/.test(partner) ? partner : '';
  const safeAgentId = /^[A-Za-z0-9:_-]{1,100}$/.test(agentId) ? agentId : '';
  const safeAgentSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agentSlug) ? agentSlug : '';
  registrationForm.elements.namedItem('partner').value = safePartner || safeAgentSlug || safeAgentId;
  registrationForm.elements.namedItem('agent_id').value = safeAgentId;
  registrationForm.elements.namedItem('agent_slug').value = safeAgentSlug;
  let currentStep = 1;

  const labels = {
    country: 'Country',
    business_type: 'Business type',
    legal_name: 'Legal business name',
    license_number: 'Registration / licence',
    business_address: 'Business address',
    business_phone: 'Business phone',
    business_email: 'Business email',
    website: 'Website',
    established_date: 'Established',
    annual_volume: 'Annual card volume',
    average_transaction: 'Average transaction',
    business_description: 'Business activity',
    business_document: 'Business document',
    bank_type: 'Bank account',
    void_cheque: 'Settlement document'
  };

  function ownerCards() {
    return [...ownersList.querySelectorAll('[data-owner-card]')];
  }

  function ownershipTotal() {
    return ownerCards().reduce((total, card) => {
      const field = card.querySelector('[data-owner-field="ownership_percent"]');
      const value = Number(field?.value || 0);
      return total + (Number.isFinite(value) ? Math.round(value * 100) : 0);
    }, 0);
  }

  function updateOwnershipState() {
    const total = ownershipTotal();
    const remaining = 10000 - total;
    const complete = remaining === 0;
    const over = remaining < 0;
    addOwnerButton.hidden = complete || over;
    addOwnerButton.disabled = complete || over || ownerCards().length >= 10;
    ownershipStatus.classList.toggle('error', over);
    const heading = ownershipStatus.querySelector('strong');
    const message = ownershipStatus.querySelector('p');
    if (complete) {
      heading.textContent = 'Ownership complete — 100%';
      message.textContent = 'No additional owner is required.';
    } else if (over) {
      heading.textContent = `Ownership exceeds 100% by ${Math.abs(remaining / 100).toFixed(2)}%`;
      message.textContent = 'Reduce one or more ownership percentages before continuing.';
    } else {
      heading.textContent = `${(remaining / 100).toFixed(2)}% ownership remaining`;
      message.textContent = 'Add another owner and continue until the combined ownership equals exactly 100%.';
    }
  }

  function updateOwners() {
    const cards = ownerCards();
    ownerCount.value = String(cards.length);
    cards.forEach((card, index) => {
      card.querySelector('[data-owner-label]').textContent = `Owner / controlling person ${index + 1}`;
      card.querySelector('[data-remove-owner]').hidden = cards.length === 1;
      card.querySelectorAll('[data-owner-field]').forEach((field) => {
        const key = field.dataset.ownerField;
        const id = `owner_${index}_${key}`;
        field.name = id;
        field.id = id;
        card.querySelector(`[data-label="${key}"]`)?.setAttribute('for', id);
      });
    });
    updateOwnershipState();
  }

  function addOwner() {
    if (ownerCards().length >= 10) return;
    const fragment = ownerTemplate.content.cloneNode(true);
    ownersList.appendChild(fragment);
    updateOwners();
  }

  function validateOwnership() {
    const fields = ownerCards().map((card) => card.querySelector('[data-owner-field="ownership_percent"]'));
    const total = ownershipTotal();
    if (total !== 10000) {
      const last = fields[fields.length - 1];
      last.setCustomValidity(total > 10000
        ? 'The combined ownership percentage cannot exceed 100%.'
        : 'Add every owner until the combined ownership percentage equals exactly 100%.');
      last.reportValidity();
      last.setCustomValidity('');
      return false;
    }
    return true;
  }

  function activePanel() {
    return panels.find((panel) => Number(panel.dataset.formStep) === currentStep);
  }

  function showStep(step) {
    currentStep = step;
    panels.forEach((panel) => {
      const active = Number(panel.dataset.formStep) === step;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    indicators.forEach((indicator) => {
      const index = Number(indicator.dataset.stepIndicator);
      indicator.classList.toggle('active', index === step);
      indicator.classList.toggle('complete', index < step);
    });
    if (step === 4) buildReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validatePanel() {
    const fields = [...activePanel().querySelectorAll('input, select, textarea')];
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        field.focus({ preventScroll: false });
        return false;
      }
      if (field.type === 'file' && field.files[0] && field.files[0].size > 5 * 1024 * 1024) {
        field.setCustomValidity('Please choose a file smaller than 5 MB.');
        field.reportValidity();
        field.setCustomValidity('');
        return false;
      }
    }
    return currentStep !== 2 || validateOwnership();
  }

  function displayValue(field) {
    if (field.type === 'file') return field.files[0]?.name || 'Not attached';
    if (field.type === 'radio') return registrationForm.querySelector(`[name="${field.name}"]:checked`)?.value || '';
    if (field.name === 'ownership_percent') return `${field.value}%`;
    if (field.name === 'average_transaction') return field.value ? `$${field.value}` : '';
    return field.value || '—';
  }

  function buildReview() {
    review.replaceChildren();
    const seen = new Set();
    Object.keys(labels).forEach((name) => {
      if (seen.has(name)) return;
      const field = registrationForm.elements.namedItem(name);
      const source = field instanceof RadioNodeList ? field[0] : field;
      if (!source) return;
      seen.add(name);
      const item = document.createElement('div');
      item.className = name === 'business_description' || name === 'business_address' ? 'review-item full' : 'review-item';
      const label = document.createElement('small');
      label.textContent = labels[name];
      const value = document.createElement('strong');
      value.textContent = displayValue(source);
      item.append(label, value);
      review.appendChild(item);
    });
    ownerCards().forEach((card, index) => {
      const fields = Object.fromEntries(
        [...card.querySelectorAll('[data-owner-field]')].map((field) => [field.dataset.ownerField, field]),
      );
      const ownerItems = [
        ['Name', fields.name.value],
        ['Title', fields.title.value],
        ['Ownership', `${fields.ownership_percent.value}%`],
        ['Phone', fields.phone.value],
        ['Email', fields.email.value],
        ['Identity document', fields.identity_document.files[0]?.name || 'Not attached'],
      ];
      ownerItems.forEach(([itemLabel, itemValue], itemIndex) => {
        const item = document.createElement('div');
        item.className = itemIndex === 0 ? 'review-item owner-review-heading full' : 'review-item';
        const label = document.createElement('small');
        label.textContent = itemIndex === 0 ? `Owner / controlling person ${index + 1}` : itemLabel;
        const value = document.createElement('strong');
        value.textContent = itemValue;
        item.append(label, value);
        review.appendChild(item);
      });
    });
  }

  addOwnerButton.addEventListener('click', addOwner);
  ownersList.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-owner]');
    if (!remove || ownerCards().length === 1) return;
    remove.closest('[data-owner-card]').remove();
    updateOwners();
  });
  ownersList.addEventListener('input', (event) => {
    if (event.target.matches('[data-owner-field="ownership_percent"]')) updateOwnershipState();
  });

  registrationForm.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      if (validatePanel()) showStep(Math.min(4, currentStep + 1));
    });
  });

  registrationForm.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => showStep(Math.max(1, currentStep - 1)));
  });

  registrationForm.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    const label = input.closest('.file-field')?.querySelector('[data-file-label]');
    const file = input.files[0];
    if (label) label.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, PNG, or JPG · maximum 5 MB';
  });

  addOwner();

  registrationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!registrationForm.reportValidity() || !validateOwnership()) return;

    const files = [...registrationForm.querySelectorAll('input[type="file"]')].map((input) => input.files[0]).filter(Boolean);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 25 * 1024 * 1024) {
      status.textContent = 'The combined document size must be 25 MB or less.';
      status.classList.add('error');
      return;
    }

    const submit = registrationForm.querySelector('[type="submit"]');
    const original = submit.textContent;
    submit.disabled = true;
    submit.textContent = 'Submitting securely…';
    status.textContent = 'Uploading documents and saving your application…';
    status.classList.remove('error');

    try {
      const response = await fetch(registrationForm.action, {
        method: 'POST',
        body: new FormData(registrationForm),
        headers: { Accept: 'application/json' }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error(result.message || 'Unable to submit the application.');

      panels.forEach((panel) => { panel.hidden = true; });
      indicators.forEach((indicator) => indicator.classList.add('complete'));
      successPanel.hidden = false;
      successPanel.querySelector('[data-reference]').textContent = result.reference;
      const notificationResult = successPanel.querySelector('[data-notification-result]');
      notificationResult.textContent = result.notification_sent
        ? 'A notification has been sent to the YolkPay onboarding team.'
        : 'Your application is safely saved. The email notification needs attention, and the backend record is available for review.';
      notificationResult.classList.toggle('warning', !result.notification_sent);
      registrationForm.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      status.textContent = error.message || 'We could not submit your application. Please try again.';
      status.classList.add('error');
    } finally {
      submit.disabled = false;
      submit.textContent = original;
    }
  });
}
