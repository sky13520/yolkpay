const registrationForm = document.querySelector('[data-registration-form]');

if (registrationForm) {
  const panels = [...registrationForm.querySelectorAll('[data-form-step]')];
  const indicators = [...document.querySelectorAll('[data-step-indicator]')];
  const successPanel = registrationForm.querySelector('[data-registration-success]');
  const review = registrationForm.querySelector('[data-review]');
  const status = registrationForm.querySelector('.application-status');
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
    principal_name: 'Principal',
    principal_phone: 'Principal phone',
    principal_email: 'Principal email',
    ownership_percent: 'Ownership',
    principal_title: 'Title',
    identity_document: 'Identity document',
    bank_type: 'Bank account',
    void_cheque: 'Settlement document'
  };

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
    return true;
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
  }

  registrationForm.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      if (validatePanel()) showStep(Math.min(4, currentStep + 1));
    });
  });

  registrationForm.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => showStep(Math.max(1, currentStep - 1)));
  });

  registrationForm.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', () => {
      const label = input.closest('.file-field')?.querySelector('[data-file-label]');
      const file = input.files[0];
      if (label) label.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, PNG, or JPG · maximum 5 MB';
    });
  });

  registrationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!registrationForm.reportValidity()) return;

    const files = [...registrationForm.querySelectorAll('input[type="file"]')].map((input) => input.files[0]).filter(Boolean);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 12 * 1024 * 1024) {
      status.textContent = 'The combined document size must be 12 MB or less.';
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
