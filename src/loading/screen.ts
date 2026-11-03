// The loading screen from index.html. It covers the page while the island is made, then fades out.
export function hideLoading() {
  const el = document.getElementById('loading');
  if (!el) return;
  el.classList.add('done');
  setTimeout(() => el.remove(), 600); // after the fade in loading.css
}
