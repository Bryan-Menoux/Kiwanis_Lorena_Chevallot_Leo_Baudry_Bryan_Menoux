document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('actionSearch');
  const type = document.getElementById('filterType');
  const beneficiary = document.getElementById('filterBeneficiary');
  const list = document.getElementById('actionsList');
  if (!list) return;
  const items = Array.from(list.querySelectorAll('li'));

  const normalize = (s) => (s || '').toString().toLowerCase().trim();

  function applyFilter() {
    const q = normalize(search?.value);
    const t = normalize(type?.value);
    const b = normalize(beneficiary?.value);

    items.forEach((item) => {
      const title = normalize(item.dataset.title);
      const typ = normalize(item.dataset.type);
      const ben = normalize(item.dataset.beneficiary);

      const matchQ = q === '' || title.includes(q);
      const matchT = t === '' || typ === t;
      const matchB = b === '' || ben.includes(b);

      item.style.display = matchQ && matchT && matchB ? '' : 'none';
    });
  }

  [search, type, beneficiary].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', applyFilter);
  });

  // small UX: focus search on load
  if (search) search.focus();
});
