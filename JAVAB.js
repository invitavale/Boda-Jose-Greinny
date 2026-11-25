// Variables globales
let isPlaying = false;
let currentSlide = 0;
let totalSlides = 0;

// Animación de entrada del título "Primero nos casamos" en la portada
function revealHeroTitle() {
    document.body.classList.remove('hero-revealed');
    void document.body.offsetWidth; // reinicia la animación si se llama de nuevo
    document.body.classList.add('hero-revealed');
}

// Intro: sobre en video. El toque para abrirlo es el "detonante": en ese
// mismo gesto arranca el video y la música de fondo (así lo exigen iPhone,
// Android y todos los navegadores). Al terminar hay un destello dorado y la
// invitación entra con un zoom suave de la portada.
function setupIntroEnvelope() {
    const overlay = document.getElementById('introOverlay');
    const video = document.getElementById('introVideo');
    const skip = document.getElementById('introSkip');
    if (!overlay || !video) { enterInvitation(); return; }

    let started = false;
    let finished = false;
    document.documentElement.style.overflow = 'hidden';

    function finishIntro() {
        if (finished) return;
        finished = true;
        overlay.classList.add('is-ending');
        setTimeout(function() {
            overlay.classList.add('is-hidden');
            document.documentElement.style.overflow = '';
            try { video.pause(); } catch (e) {}
            enterInvitation();
            setTimeout(function() { overlay.remove(); }, 1200);
        }, 700);
    }

    // Respaldo: si el teléfono/navegador no reproduce el video, se muestra
    // la misma animación del sobre como imagen animada (funciona en todos).
    let usingAnim = false;
    function useAnimFallback() {
        if (usingAnim || finished) return;
        usingAnim = true;
        const anim = document.getElementById('introAnim');
        if (!anim) { finishIntro(); return; }
        try { video.pause(); } catch (e) {}
        video.style.display = 'none';
        anim.hidden = false;
        anim.src = anim.getAttribute('data-src');
        setTimeout(finishIntro, 7400);
    }

    function start() {
        if (started) return;
        started = true;
        overlay.classList.add('is-playing');
        startMusic(); // dentro del gesto del usuario
        video.muted = true; // la canción reemplaza el sonido del video
        let p;
        try { p = video.play(); } catch (e) { useAnimFallback(); return; }
        if (p && p.catch) p.catch(useAnimFallback);
        // Si en 1.2 s el video no avanzó, usar la animación
        setTimeout(function() {
            if (!finished && !usingAnim && video.currentTime < 0.1) useAnimFallback();
        }, 1200);
    }

    overlay.addEventListener('click', start);

    // Termina un poco antes del final para encadenar con el destello
    video.addEventListener('timeupdate', function() {
        if (video.duration && video.currentTime >= video.duration - 0.25) finishIntro();
    });
    video.addEventListener('ended', finishIntro);
    video.addEventListener('error', function() { if (started) useAnimFallback(); });

    if (skip) {
        skip.addEventListener('click', function(e) {
            e.stopPropagation();
            startMusic(); // por si saltan antes de que arranque
            finishIntro();
        });
    }
}

function enterInvitation() {
    document.body.classList.add('invite-enter');
    revealHeroTitle();
    const mp = document.getElementById('musicPlayer');
    if (mp) mp.style.display = 'block';
}

// Música de fondo (archivo propio)
function startMusic() {
    const music = document.getElementById('bgMusic');
    if (!music) return;
    music.volume = 0.85;
    const p = music.play();
    if (p && p.then) {
        p.then(function() { isPlaying = true; updateMusicIcon(); })
         .catch(function() { isPlaying = false; updateMusicIcon(); });
    }
}

function setupMusic() {
    const music = document.getElementById('bgMusic');
    const toggle = document.getElementById('musicToggle');
    if (!music) return;
    music.addEventListener('play', function() { isPlaying = true; updateMusicIcon(); });
    music.addEventListener('pause', function() { isPlaying = false; updateMusicIcon(); });
    if (toggle) toggle.addEventListener('click', toggleMusic);
    // Pausar al salir de la pestaña y retomar al volver
    let wasPlaying = false;
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) { wasPlaying = !music.paused; music.pause(); }
        else if (wasPlaying) { music.play().catch(function() {}); }
    });
}

// Efecto elegante al hacer scroll: el contenido de cada sección aparece
// subiendo suavemente y enfocándose.
function setupScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    const items = document.querySelectorAll('.content section > *:not(.section-divider), .content .countdown-section > *, .content .bienvenida-section > *, .content .gf-viewport, .content .party-card, .content .lugar-card');
    const io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function(el) {
        const idx = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.transitionDelay = Math.min(idx, 4) * 0.12 + 's';
        el.classList.add('reveal');
        io.observe(el);
    });

    // Itinerario: cada momento aparece uno a uno según vas bajando,
    // y la línea va creciendo con el scroll.
    const itin = document.getElementById('itin');
    if (itin) {
        itin.classList.add('itin-scroll');
        const filas = itin.querySelectorAll('.itin-fila');
        const io3 = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add('is-in'); io3.unobserve(e.target); }
            });
        }, { threshold: 0.6, rootMargin: '0px 0px -12% 0px' });
        filas.forEach(function (f) { f.style.transitionDelay = '0s'; io3.observe(f); });
        let ticking = false;
        function progreso() {
            ticking = false;
            const r = itin.getBoundingClientRect();
            const vh = window.innerHeight;
            const p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / r.height));
            itin.style.setProperty('--itin-prog', p.toFixed(3));
        }
        window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(progreso); } }, { passive: true });
        window.addEventListener('resize', progreso);
        progreso();
    }

    // Pie con foto: la foto y los textos aparecen juntos cuando el pie entra
    // en pantalla (los nombres quedan pegados al final de la página).
    const pie = document.querySelector('.footer-foto');
    if (pie) {
        const piezas = pie.querySelectorAll('.footer-bg, .footer-verso, .footer-content');
        piezas.forEach(function(el, i) {
            el.classList.add('reveal');
            el.style.transitionDelay = (i === 0 ? 0 : 0.5 + i * 0.25) + 's';
        });
        const io2 = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    piezas.forEach(function(el) { el.classList.add('is-visible'); });
                    io2.disconnect();
                }
            });
        }, { threshold: 0.12 });
        io2.observe(pie);
    }
}

// Inicializar cuando el DOM esté listo
// Calendario del mes de la boda con el día marcado (semana de lunes a domingo).
// Para otra boda, basta con cambiar WEDDING_DATE.
const WEDDING_DATE = { anio: 2027, mes: 0, dia: 7 }; // mes: 0 = enero
function renderCalendar() {
    const grid = document.getElementById('calGrid');
    const titulo = document.getElementById('calMes');
    if (!grid) return;
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const { anio, mes, dia } = WEDDING_DATE;
    if (titulo) titulo.textContent = MESES[mes] + ' ' + anio;
    let html = ['L','M','M','J','V','S','D'].map(d => '<span class="cal-h">' + d + '</span>').join('');
    const offset = (new Date(anio, mes, 1).getDay() + 6) % 7;
    const total = new Date(anio, mes + 1, 0).getDate();
    for (let i = 0; i < offset; i++) html += '<span></span>';
    for (let d = 1; d <= total; d++) {
        html += d === dia
            ? '<span class="cal-d on" aria-current="date"><i>' + d + '</i></span>'
            : '<span class="cal-d">' + d + '</span>';
    }
    grid.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    renderCalendar();
    initializeCountdown();
    initializeCarousel();
    initializeGuestGreeting();
    setupIntroEnvelope();

    setupMusic();
    setupScrollReveal();
});



function toggleMusic() {
    const music = document.getElementById('bgMusic');
    if (!music) return;
    if (music.paused) { music.play().catch(function() {}); }
    else { music.pause(); }
}

function updateMusicIcon() {
    const volumeIcon = document.getElementById('volumeIcon');

    if (volumeIcon) {
        if (isPlaying) {
            volumeIcon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#A64B2A" stroke="#fff" stroke-width="1"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08" stroke="#A64B2A" stroke-width="2"></path>
                <circle cx="6.5" cy="12" r="1" fill="#8FA27E"/>
            `;
        } else {
            volumeIcon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#A64B2A" stroke="#fff" stroke-width="1"></polygon>
                <line x1="19" y1="9" x2="17" y2="11" stroke="#D8B9B4" stroke-width="2"></line>
                <line x1="17" y1="9" x2="19" y2="11" stroke="#D8B9B4" stroke-width="2"></line>
                <circle cx="6.5" cy="12" r="1" fill="#D8B9B4"/>
            `;
        }
    }
}

// Countdown
function initializeCountdown() {
    const targetDate = new Date('2027-01-07T15:30:00-04:00').getTime();
    
    function updateCountdown() {
        const now = new Date().getTime();
        const difference = targetDate - now;
        
        if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            document.getElementById('days').textContent = days.toString().padStart(2, '0');
            document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        } else {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Carrusel
function initializeCarousel() {
    const track = document.getElementById('carouselTrack');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    if (!track) return;

    // calcular total dinámicamente
    const items = track.querySelectorAll('.carousel-item');
    totalSlides = items.length;
    const totalSlidesElement = document.getElementById('totalSlides');
    if (totalSlidesElement) totalSlidesElement.textContent = totalSlides;

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentSlide = (currentSlide + 1) % totalSlides;
            updateCarousel();
        });
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            updateCarousel();
        });
    }

    // Ajuste inicial para asegurar cálculo correcto tras el render
    updateCarousel();
    requestAnimationFrame(updateCarousel);
    setTimeout(updateCarousel, 200);

    // Auto-play del carrusel
    setInterval(() => {
        nextSlide();
    }, 2500);
}

function updateCarousel() {
    const track = document.getElementById('carouselTrack');
    if (track) {
        const items = track.querySelectorAll('.carousel-item');
        if (!items.length) return;
        const container = track.parentElement;

        // Temporarily reset transform to measure actual positions
        const previousTransform = track.style.transform;
        track.style.transform = 'none';

        const firstRect = items[0].getBoundingClientRect();
        const secondRect = items[1] ? items[1].getBoundingClientRect() : null;
        const stepWidth = Math.max(1, secondRect ? Math.round(secondRect.left - firstRect.left) : Math.round(firstRect.width));

        const containerWidth = Math.round(container.getBoundingClientRect().width);
        const visibleCount = Math.max(1, Math.floor((containerWidth + 1) / stepWidth));
        const maxIndex = Math.max(0, totalSlides - visibleCount);

        // Detecta si hay que dar la vuelta (de la última foto a la 1, o viceversa)
        let wrapped = false;
        if (currentSlide > maxIndex) { currentSlide = 0; wrapped = true; }
        if (currentSlide < 0) { currentSlide = maxIndex; wrapped = true; }

        const trackRect = track.getBoundingClientRect();
        const baseLeft = Math.round(firstRect.left - trackRect.left);
        const translateXpx = -Math.round(baseLeft + (currentSlide * stepWidth));

        if (wrapped) {
            // Al dar la vuelta, salta directo a la foto 1 sin animar el regreso
            // (evita el efecto de "devolverse" deslizando hacia atrás por todas las fotos)
            const prevTransition = track.style.transition;
            track.style.transition = 'none';
            track.style.transform = `translateX(${translateXpx}px)`;
            void track.offsetWidth; // fuerza reflow para aplicar el salto sin animación
            track.style.transition = prevTransition || '';
        } else {
            // Apply transform
            track.style.transform = `translateX(${translateXpx}px)`;
        }
        // console.log('Carousel moved to slide:', { currentSlide, visibleCount, maxIndex, translateXpx, stepWidth, baseLeft });
    }
    updateSlideCounter();
    markCenterCarouselItem();
}

function nextSlide() {
    currentSlide++;
    updateCarousel();
}

function previousSlide() {
    currentSlide--;
    updateCarousel();
}

function updateSlideCounter() {
    const currentSlideElement = document.getElementById('currentSlide');
    const totalSlidesElement = document.getElementById('totalSlides');
    if (currentSlideElement) currentSlideElement.textContent = (currentSlide + 1);
    if (totalSlidesElement) totalSlidesElement.textContent = totalSlides;
}

// Mark center carousel item on desktop
function markCenterCarouselItem() {
    const track = document.getElementById('carouselTrack');
    if (!track) return;
    const items = Array.from(track.querySelectorAll('.carousel-item'));
    if (!items.length) return;
    items.forEach(it => it.classList.remove('is-center'));

    const firstItem = items[0];
    const container = track.parentElement;
    const itemWidth = firstItem.getBoundingClientRect().width;
    const containerWidth = container.getBoundingClientRect().width;
    const visibleCount = Math.max(1, Math.floor(containerWidth / itemWidth));

    const centerIndex = (currentSlide + Math.floor(visibleCount / 2)) % items.length;
    items[centerIndex].classList.add('is-center');
}

// Hook into carousel updates
const _origUpdateCarousel = typeof updateCarousel === 'function' ? updateCarousel : null;
if (_origUpdateCarousel) {
    window.updateCarousel = function() {
        _origUpdateCarousel();
        markCenterCarouselItem();
    };
}

window.addEventListener('resize', markCenterCarouselItem);

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(markCenterCarouselItem, 200);
});

// Funciones de los botones
// Nota: esta es una plantilla de ejemplo, así que los botones de
// "¿Cómo llegar?", "Subir Fotos" y "Confirmar Asistencia" no llevan a
// ningún enlace real todavía. Cuando se use para una boda real, basta con
// reemplazar cada URL de ejemplo por el enlace definitivo (Google Maps,
// álbum de fotos compartido, formulario de RSVP, etc.).
function openLocation(location) {
    const urls = {
        ceremony: 'https://maps.app.goo.gl/SK3DhgaicsuFkAnD6'
    };
    const url = urls[location];
    if (url) {
        window.open(url, '_blank', 'noopener');
    }
}

// Álbum compartido de Google Fotos (antes: https://photos.app.goo.gl/p9PGQHWrvLG1Bpj28)
const PHOTO_ALBUM_URL = 'https://photos.app.goo.gl/fey51JWfjgCk88r79';

function sharePhotos() {
    // Abre el álbum compartido de Google Fotos en una pestaña nueva
    // (en el celular abre la app de Google Fotos si está instalada).
    const win = window.open(PHOTO_ALBUM_URL, '_blank');
    if (win) {
        win.opener = null;
    } else {
        // Si el navegador bloqueó la pestaña nueva, abrir en la misma
        window.location.href = PHOTO_ALBUM_URL;
    }
}

// Código de vestimenta: imagen flotante (vive en regalo-modal.js)
function showDressCode() {
    if (window.openDressCodeModal) window.openDressCodeModal();
}

function showTips() {
    const modal = document.getElementById('tipsModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeTipsModal() {
    const modal = document.getElementById('tipsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Regalos: el modal (datos bancarios / mesa de regalos) vive en regalo-modal.js
function showGifts() {
    if (window.openGiftModal) window.openGiftModal();
}

// Confirmación de asistencia (Google Form)
// (antes: https://docs.google.com/forms/d/e/1FAIpQLSdIYoM33yAkMmS4DZCRVmO9_IE0gZT4eEw8cV0r2PgWlYE0Ag/viewform?usp=header)
// Confirmación directa por WhatsApp al 829-819-2017 con mensaje prefijado.
// Si el enlace trae ?p=N (pases) y/o ?invitados=Nombre, se incluyen en el mensaje.
const RSVP_WHATSAPP = '18298192017';
function confirmAttendance() {
    const params = new URLSearchParams(window.location.search);
    let pases = parseInt(params.get('p') || params.get('pases'), 10);
    if (isNaN(pases)) pases = 0;
    pases = Math.max(0, Math.min(4, pases));
    const nombres = (params.get('invitados') || '').split(',').map(function (n) { return n.trim(); }).filter(Boolean);
    let msg = '¡Hola! Confirmo mi asistencia a la boda de José & Greinny el jueves 7 de enero de 2027 a las 3:30 PM.';
    if (pases === 1) msg = '¡Hola! Confirmo mi asistencia a la boda de José & Greinny el jueves 7 de enero de 2027 a las 3:30 PM (1 persona).';
    else if (pases > 1) msg = '¡Hola! Confirmo nuestra asistencia a la boda de José & Greinny el jueves 7 de enero de 2027 a las 3:30 PM (' + pases + ' personas).';
    if (nombres.length) msg += ' De parte de: ' + nombres.join(', ') + '.';
    msg += ' ¡Gracias por la invitación! 💍';
    window.open('https://wa.me/' + RSVP_WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank');
}

// Sistema de Toast
function showToast(title, message) {
    const toast = document.getElementById('toast');
    const toastContent = document.getElementById('toastContent');
    
    toastContent.innerHTML = `
        <h4 style="font-weight: 700; color: #fff; margin-bottom: 0.35rem; letter-spacing: 0.2px;">${title}</h4>
        <p style="color: #ddd;">${message}</p>
    `;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Nota: el efecto de portada ahora se logra 100% con CSS (hero fijo detrás
// del contenido, ver .hero-section y .content en CCSB.css), igual que en
// boda100L. Ya no hace falta mover nada por JS en el scroll.

// Saludo personalizado por invitado/familia, leído desde la URL.
// Formatos soportados:
//   ?invitados=Juan Arias,Yerianny Arias,Valery Arias
//   ?familia=Arias
//   &p=2  -> pases (1 a 4): "Invitación válida por 2 personas"
function initializeGuestGreeting() {
    const params = new URLSearchParams(window.location.search);
    const invitadosParam = params.get('invitados');
    const familiaParam = params.get('familia');

    const section = document.getElementById('guestSection');
    const badge = document.getElementById('guestBadge');
    const subtitle = document.getElementById('guestSubtitle');
    const greeting = document.getElementById('guestGreeting');
    if (!section || !badge || !subtitle || !greeting) return;

    let names = [];

    if (invitadosParam) {
        names = invitadosParam.split(',').map(n => decodeURIComponent(n.trim())).filter(Boolean);
    } else if (familiaParam) {
        names = [`Familia ${familiaParam.trim()}`];
    }

    // Pases: ?p=1..4 (o ?pases=) -> "Invitación válida por N persona(s)"
    let pases = parseInt(params.get('p') || params.get('pases') || params.get('acomp') && (parseInt(params.get('acomp'),10)+1), 10);
    if (isNaN(pases)) pases = 0;
    pases = Math.max(0, Math.min(4, pases));

    if (names.length === 0 && !pases) return;

    const total = pases || names.length;
    badge.textContent = total;
    const pase = document.getElementById('guestPase');
    if (pase) {
        pase.innerHTML = total === 1
            ? 'Con mucho cariño, esta invitación es personal y válida para <b>1 persona</b>. Le agradecemos respetar el número de invitados.'
            : `Con mucho cariño, esta invitación es válida para <b>${total} personas</b>. Les agradecemos respetar el número de invitados.`;
    }

    // Subtítulo de acompañantes: solo tiene sentido cuando hay más de un
    // nombre individual (no aplica al formato "Familia X")
    const companions = (invitadosParam && !pases) ? names.length - 1 : 0;
    if (companions > 0) {
        subtitle.textContent = `(${companions} acompañante${companions > 1 ? 's' : ''})`;
        subtitle.style.display = 'block';
    } else {
        subtitle.style.display = 'none';
    }

    // Limpiar contenido previo
    greeting.innerHTML = '';

    names.forEach((name, index) => {
        const nameSpan = document.createElement('span');
        const colorIndex = (index % 4) + 1;
        nameSpan.className = `guest-name color-${colorIndex}`;
        nameSpan.textContent = name;
        greeting.appendChild(nameSpan);
    });

    section.style.display = 'block';
}

// Forzar limpieza de caches en clientes antiguos
(function() {
  function clearCaches() {
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      }).catch(() => {});
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clearCaches);
  } else {
    clearCaches();
  }
})();


// Carrusel de fotos: ancho completo, el alto se ajusta a cada foto,
// pasa solo cada 4.5 s, con flechas, puntos y deslizar con el dedo.
(function () {
    function init() {
        const vp = document.getElementById('gfViewport');
        const track = document.getElementById('gfTrack');
        const dotsBox = document.getElementById('gfDots');
        if (!vp || !track) return;
        const slides = Array.prototype.slice.call(track.children);
        const n = slides.length;
        let i = 0, timer = null;
        const dots = slides.map(function (_, k) {
            const d = document.createElement('button');
            d.type = 'button'; d.className = 'gf-dot'; d.setAttribute('aria-label', 'Foto ' + (k + 1));
            d.addEventListener('click', function () { go(k); restart(); });
            dotsBox.appendChild(d); return d;
        });
        // Alto fijo: el de la foto más alta (las demás se centran sin recortarse)
        function fit() {
            let r = 0;
            slides.forEach(function (s) {
                const img = s.querySelector('img');
                const ri = img.naturalWidth ? img.naturalHeight / img.naturalWidth
                         : (img.getAttribute('height') / img.getAttribute('width')) || 1.25;
                if (ri > r) r = ri;
            });
            vp.style.height = Math.round(vp.clientWidth * r) + 'px';
        }
        slides.forEach(function (s) {
            const src = s.querySelector('img').getAttribute('src');
            const bg = document.createElement('div');
            bg.className = 'gf-fondo'; bg.style.backgroundImage = 'url("' + src + '")';
            s.insertBefore(bg, s.firstChild);
        });
        function go(k) {
            i = (k + n) % n;
            track.style.transform = 'translateX(' + (-i * 100) + '%)';
            slides.forEach(function (s, k2) { s.classList.toggle('is-active', k2 === i); });
            dots.forEach(function (d, k2) { d.classList.toggle('is-active', k2 === i); });
            fit();
        }
        function restart() { clearInterval(timer); timer = setInterval(function () { go(i + 1); }, 4500); }
        vp.querySelector('.gf-prev').addEventListener('click', function () { go(i - 1); restart(); });
        vp.querySelector('.gf-next').addEventListener('click', function () { go(i + 1); restart(); });
        let x0 = null;
        vp.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; clearInterval(timer); }, { passive: true });
        vp.addEventListener('touchend', function (e) {
            if (x0 === null) return;
            const dx = e.changedTouches[0].clientX - x0; x0 = null;
            if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
            restart();
        });
        slides.forEach(function (s) { const im = s.querySelector('img'); if (!im.complete) im.addEventListener('load', fit); });
        window.addEventListener('resize', fit);
        document.addEventListener('visibilitychange', function () { if (document.hidden) clearInterval(timer); else restart(); });
        go(0); restart();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
