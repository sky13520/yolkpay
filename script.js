const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.nav-links');

if (menuButton && menu) {
  menuButton.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
}

document.querySelectorAll('.faq-question').forEach((button) => {
  button.addEventListener('click', () => {
    const item = button.closest('.faq-item');
    const open = item.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  });
});

document.querySelectorAll('.billing-toggle button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.billing-toggle button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const annual = button.dataset.billing === 'annual';
    document.querySelectorAll('[data-monthly]').forEach((price) => {
      price.textContent = annual ? price.dataset.annual : price.dataset.monthly;
    });
  });
});

document.querySelectorAll('[data-mail-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const subject = form.dataset.subject || 'YolkPay website inquiry';
    const body = [...data.entries()]
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    const status = form.querySelector('.form-status');
    if (status) status.textContent = 'Your email app is opening with the completed request.';
    window.location.href = `mailto:hello@yolkpay.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
});

document.querySelectorAll('[data-year]').forEach((item) => {
  item.textContent = new Date().getFullYear();
});
