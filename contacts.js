(() => {
  const section = document.querySelector('.contacts');
  const viewport = section.querySelector('.carousel-viewport');
  const track = section.querySelector('.contact-track');
  const originals = [...track.children];
  const names = originals.map(card => card.getAttribute('aria-label'));
  const count = originals.length;
  const dots = [...section.querySelectorAll('.contact-dot')];
  const announcement = document.getElementById('contact-announcement');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let position = count * 2;
  let moving = false;
  let transitionTimer;
  let gesture = null;
  let suppressClick = false;

  // Two cycles on each side leave a neighboring card visible across each boundary.
  const before = document.createDocumentFragment();
  const after = document.createDocumentFragment();
  for (let cycle = 0; cycle < 2; cycle++) {
    originals.forEach(card => before.append(card.cloneNode(true)));
    originals.forEach(card => after.append(card.cloneNode(true)));
  }
  track.prepend(before);
  track.append(after);
  const cards = [...track.children];

  function currentIndex() { return ((position % count) + count) % count; }

  function sync(announce = false) {
    track.style.setProperty('--position', position);
    cards.forEach((card, index) => {
      const active = index === position;
      card.classList.toggle('is-active', active);
      card.inert = !active;
      card.setAttribute('aria-hidden', String(!active));
      card.setAttribute('aria-label', `${names[index % count]}, contact ${index % count + 1} of ${count}`);
    });
    dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === currentIndex())));
    if (announce) announcement.textContent = cards[position].getAttribute('aria-label');
  }

  function finish() {
    if (!moving) return;
    clearTimeout(transitionTimer);
    track.classList.remove('is-animating');
    const focusedLink = cards[position].contains(document.activeElement)
      ? [...cards[position].querySelectorAll('a')].indexOf(document.activeElement) : -1;
    track.classList.add('is-resetting');
    if (position < count * 2) position += count;
    else if (position >= count * 3) position -= count;
    sync();
    // Rebase the identical copy without fading the newly centered card again.
    void track.offsetWidth;
    track.classList.remove('is-resetting');
    if (focusedLink >= 0) cards[position].querySelectorAll('a')[focusedLink].focus({ preventScroll: true });
    moving = false;
  }

  function move(direction) {
    if (moving || gesture) return;
    if (track.contains(document.activeElement)) viewport.focus({ preventScroll: true });
    clearTimeout(transitionTimer);
    moving = true;
    track.classList.toggle('is-animating', !reducedMotion.matches);
    position += direction;
    sync(true);
    if (reducedMotion.matches) finish();
    else transitionTimer = window.setTimeout(finish, 480);
  }

  section.classList.add('is-enhanced');
  section.querySelector('.carousel-controls').hidden = false;
  sync();
  section.querySelector('.previous').addEventListener('click', () => move(-1));
  section.querySelector('.next').addEventListener('click', () => move(1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => {
    if (index !== currentIndex()) move(index > currentIndex() ? 1 : -1);
  }));
  section.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  track.addEventListener('transitionend', event => {
    if (event.target === track && event.propertyName === 'transform') finish();
  });

  viewport.addEventListener('pointerdown', event => {
    if (moving || gesture || !event.isPrimary || event.button !== 0) return;
    // Native link taps remain intact. Capture only after horizontal intent is clear.
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, horizontal: false };
    suppressClick = false;
  });
  viewport.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
      if (Math.abs(dx) < 8) return;
      gesture.horizontal = true;
      viewport.setPointerCapture(event.pointerId);
      section.classList.add('is-dragging');
    }
    gesture.dx = dx;
    const limit = cards[position].getBoundingClientRect().width + 24;
    track.style.setProperty('--drag', `${Math.max(-limit, Math.min(limit, dx))}px`);
  });

  function endGesture(event, cancelled = false) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const { dx, horizontal, id } = gesture;
    gesture = null;
    section.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    if (!horizontal) return;
    suppressClick = true;
    window.setTimeout(() => { suppressClick = false; }, 0);
    // Commit the dragged frame before animating to the resting card.
    void track.offsetWidth;
    track.classList.add('is-animating');
    track.style.setProperty('--drag', '0px');
    if (!cancelled && Math.abs(dx) > 45) move(dx < 0 ? 1 : -1);
    else transitionTimer = window.setTimeout(() => track.classList.remove('is-animating'), 480);
  }
  viewport.addEventListener('pointerup', event => endGesture(event));
  viewport.addEventListener('pointercancel', event => endGesture(event, true));
  viewport.addEventListener('lostpointercapture', event => endGesture(event, true));
  viewport.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
  }, true);
  viewport.addEventListener('dragstart', event => event.preventDefault());
})();
