(() => {
  const bar = document.querySelector('.reading-progress');
  if (!bar) return;
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    bar.style.width = `${max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0}%`;
  };
  update();
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
})();
