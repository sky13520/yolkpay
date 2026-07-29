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
    window.location.href = `mailto:info@yolkpay.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
});

document.querySelectorAll('[data-year]').forEach((item) => {
  item.textContent = new Date().getFullYear();
});

const primaryNav=document.querySelector('.nav-links');
if(primaryNav&&!primaryNav.querySelector('.nav-dropdown')){
 const menu=(label,items)=>{const w=document.createElement('div');w.className='nav-dropdown';const b=document.createElement('button');b.className='nav-trigger';b.type='button';b.setAttribute('aria-expanded','false');b.innerHTML=label+' <span aria-hidden="true">⌄</span>';const p=document.createElement('div');p.className='dropdown-panel';items.forEach(i=>{const a=document.createElement('a');a.href=i[1];a.textContent=i[0];if(i[2]){a.target='_blank';a.rel='noopener';a.textContent+=' ↗'}p.appendChild(a)});b.onclick=()=>{const o=w.classList.toggle('open');b.setAttribute('aria-expanded',String(o))};w.append(b,p);return w};
 const links=[...primaryNav.querySelectorAll(':scope > a')],d=links.find(a=>a.textContent.trim()==='Developers'),pr=links.find(a=>a.textContent.trim()==='Pricing');
 if(d)d.replaceWith(menu('Developers',[['Overview','developers.html'],['Documentation','documentation.html'],['General Demo','https://paydemo.bookiy.com/',1],['WordPress Demo','https://wordpress.yolkpay.com/',1],['Downloads','downloads.html'],['Installation','installation.html']]));
 if(pr)primaryNav.insertBefore(menu('Merchants',[['Merchant resources','merchants.html'],['Registration','apply.html'],['U.S. Portal','https://portal.yolkpay.com/',1],['Canada Portal','https://portal.bookiy.com/',1]]),pr);
}
document.querySelectorAll('.footer-brand').forEach(b=>{if(!b.querySelector('.footer-contact')){const c=document.createElement('div');c.className='footer-contact';c.innerHTML='<a href="mailto:info@yolkpay.com">info@yolkpay.com</a><span>21-401 Alden Rd, Markham, ON, Canada</span>';b.appendChild(c)}});
