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
if(primaryNav&&!primaryNav.querySelector('.nav-dropdown')){
 const menu=(label,items)=>{const w=document.createElement('div');w.className='nav-dropdown';const b=document.createElement('button');b.className='nav-trigger';b.type='button';b.setAttribute('aria-expanded','false');b.innerHTML=label+' <span aria-hidden="true">⌄</span>';const p=document.createElement('div');p.className='dropdown-panel';items.forEach(i=>{const a=document.createElement('a');a.href=i[1];a.textContent=i[0];if(i[2]){a.target='_blank';a.rel='noopener';a.textContent+=' ↗'}p.appendChild(a)});b.onclick=()=>{const o=w.classList.toggle('open');b.setAttribute('aria-expanded',String(o))};w.append(b,p);return w};
 const links=[...primaryNav.querySelectorAll(':scope > a')],d=links.find(a=>a.textContent.trim()==='Developers'),pr=links.find(a=>a.textContent.trim()==='Pricing');
 if(d)d.replaceWith(menu('Developers',[['Documentation','documentation.html']]));
 if(pr)primaryNav.insertBefore(menu('Resources',[['General Demo','https://paydemo.bookiy.com/',1],['WordPress Demo','https://wordpress.yolkpay.com/',1],['Downloads','downloads.html'],['Installation','installation.html']]),pr);
}
document.querySelectorAll('.footer-brand').forEach(b=>{if(!b.querySelector('.footer-contact')){const c=document.createElement('div');c.className='footer-contact';c.innerHTML='<a href="mailto:info@yolkpay.com">info@yolkpay.com</a><span>21-401 Alden Rd, Markham, ON, Canada</span>';b.appendChild(c)}});
