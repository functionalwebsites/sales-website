(() => {
  const progressBar = document.querySelector('[data-blog-progress]');
  const toc = document.querySelector('[data-blog-toc]');
  const article = document.querySelector('[data-blog-article]');

  const updateProgress = () => {
    if (!progressBar) return;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = maxScroll > 0 ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)) : 0;
    progressBar.style.width = `${progress}%`;
  };

  const buildToc = () => {
    if (!toc || !article) return;
    const headings = Array.from(article.querySelectorAll('h2[id], h3[id]'));
    if (!headings.length) {
      toc.hidden = true;
      return;
    }

    const list = document.createElement('ol');
    headings.forEach((heading) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      item.appendChild(link);
      list.appendChild(item);
    });
    toc.appendChild(list);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        toc.querySelectorAll('a').forEach((link) => {
          link.toggleAttribute('aria-current', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    }, {
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    });

    headings.forEach((heading) => observer.observe(heading));
  };

  let frame = 0;
  const requestProgress = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      updateProgress();
    });
  };

  buildToc();
  updateProgress();
  window.addEventListener('scroll', requestProgress, { passive: true });
  window.addEventListener('resize', requestProgress);
})();
