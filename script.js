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
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const status = form.querySelector('.form-status');
    const submitButton = form.querySelector('[type="submit"]');
    const originalLabel = submitButton?.textContent || 'Send message';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
    }
    if (status) status.textContent = 'Sending your message…';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success !== true) {
        throw new Error(result.message || 'The message could not be sent.');
      }

      form.reset();
      if (status) status.textContent = 'Thank you. Your message has been sent to info@yolkpay.com.';
    } catch (error) {
      if (status) status.textContent = 'We could not send your message. Please email info@yolkpay.com directly.';
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });
});

document.querySelectorAll('[data-year]').forEach((item) => {
  item.textContent = new Date().getFullYear();
});

const primaryNav=document.querySelector('.nav-links');
if(primaryNav&&!([...primaryNav.querySelectorAll(':scope > a')].some(a=>a.textContent.trim()==='Merchants'))){
 const pricing=[...primaryNav.querySelectorAll(':scope > a')].find(a=>a.textContent.trim()==='Pricing');
 const merchants=document.createElement('a');
 merchants.href='/merchants';
 merchants.textContent='Merchants';
 if(/\/merchants(?:\.html)?\/?$/u.test(window.location.pathname))merchants.setAttribute('aria-current','page');
 if(pricing)primaryNav.insertBefore(merchants,pricing);
}
document.querySelectorAll('.footer-brand').forEach(b=>{if(!b.querySelector('.footer-contact')){const c=document.createElement('div');c.className='footer-contact';c.innerHTML='<a href="mailto:info@yolkpay.com">info@yolkpay.com</a><span>21-401 Alden Rd, Markham, ON, Canada</span>';b.appendChild(c)}});
