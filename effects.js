// ============================================
// Lumera AI - Effects & Animations
// ============================================

(function(){
  'use strict';

  // ============================================
  // ۱. ذرات متحرک (Particles)
  // ============================================
  function initParticles(){
    const canvas = document.createElement('canvas');
    canvas.id = 'particles-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let particles = [];
    const count = window.innerWidth < 640 ? 40 : 80;

    function resize(){
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for(let i = 0; i < count; i++){
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - .5) * .3,
        vy: (Math.random() - .5) * .3,
        r: Math.random() * 1.5 + .5,
        alpha: Math.random() * .5 + .2,
        color: Math.random() > .5 ? '34,211,238' : '167,139,250'
      });
    }

    function draw(){
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if(p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.color + ',' + p.alpha + ')';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(' + p.color + ',.8)';
        ctx.fill();
      });

      // خطوط اتصال
      for(let i = 0; i < particles.length; i++){
        for(let j = i + 1; j < particles.length; j++){
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if(dist < 120){
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(139,92,246,' + (.15 * (1 - dist/120)) + ')';
            ctx.lineWidth = .5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ============================================
  // ۲. Cursor Glow
  // ============================================
  function initCursorGlow(){
    if(window.innerWidth < 768) return;
    const glow = document.createElement('div');
    glow.id = 'cursor-glow';
    document.body.appendChild(glow);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animate(){
      currentX += (mouseX - currentX) * .1;
      currentY += (mouseY - currentY) * .1;
      glow.style.left = currentX + 'px';
      glow.style.top = currentY + 'px';
      requestAnimationFrame(animate);
    }
    animate();
  }

  // ============================================
  // ۳. Ripple Effect روی دکمه‌ها
  // ============================================
  function initRipple(){
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn, #fab, button');
      if(!btn) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  // ============================================
  // ۴. Glow دنبال موس روی دکمه‌ها
  // ============================================
  function initButtonGlow(){
    document.addEventListener('mousemove', e => {
      const btn = e.target.closest('.btn, #fab');
      if(!btn) return;
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--x', ((e.clientX - rect.left) / rect.width * 100) + '%');
      btn.style.setProperty('--y', ((e.clientY - rect.top) / rect.height * 100) + '%');
    });
  }

  // ============================================
  // ۵. Typewriter Effect برای پیام AI
  // ============================================
  window.typeWriter = function(element, text, speed = 15){
    element.textContent = '';
    let i = 0;
    return new Promise(resolve => {
      function type(){
        if(i < text.length){
          element.textContent += text.charAt(i);
          i++;
          setTimeout(type, speed);
        } else {
          resolve();
        }
      }
      type();
    });
  };

  // ============================================
  // ۶. Typing Indicator (سه نقطه)
  // ============================================
  window.createTypingIndicator = function(){
    const div = document.createElement('div');
    div.className = 'ai-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    return div;
  };

  // ============================================
  // ۷. انیمیشن ورود پیام‌های جدید
  // ============================================
  function initMessageAnimations(){
    const chat = document.getElementById('chat');
    if(!chat) return;
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if(node.nodeType === 1){
            node.style.animation = 'msgIn .4s cubic-bezier(.4,0,.2,1)';
          }
        });
      });
    });
    observer.observe(chat, { childList: true });
  }

  // ============================================
  // ۸. 3D Tilt برای کارت‌ها
  // ============================================
  function initCardTilt(){
    document.addEventListener('mousemove', e => {
      const card = e.target.closest('.glass');
      if(!card) return;
      if(card.id === 'chat' || card.closest('#chat')) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotX = (y - .5) * 4;
      const rotY = (x - .5) * -4;
      card.style.transform = 'perspective(1000px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) scale(1.01)';
    });

    document.addEventListener('mouseleave', e => {
      const card = e.target.closest('.glass');
      if(card) card.style.transform = '';
    });
  }

  // ============================================
  // ۹. Starfield اضافه (ستاره‌های چشمک‌زن)
  // ============================================
  function initStarfield(){
    const style = document.createElement('style');
    style.textContent = `
      .lumera-star {
        position: fixed;
        width: 2px;
        height: 2px;
        background: white;
        border-radius: 50%;
        pointer-events: none;
        z-index: -1;
        animation: twinkle 3s infinite;
      }
      @keyframes twinkle {
        0%, 100% { opacity: .2; transform: scale(.8); }
        50% { opacity: 1; transform: scale(1.2); }
      }
    `;
    document.head.appendChild(style);

    for(let i = 0; i < 50; i++){
      const star = document.createElement('div');
      star.className = 'lumera-star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 3 + 's';
      star.style.background = Math.random() > .5 ? '#22d3ee' : '#a78bfa';
      star.style.boxShadow = '0 0 6px currentColor';
      document.body.appendChild(star);
    }
  }

  // ============================================
  // ۱۰. صدا (click + type)
  // ============================================
  function playClickSound(){
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + .1);
      osc.start();
      osc.stop(audioCtx.currentTime + .1);
    } catch(e){}
  }

  window.playTypeSound = function(){
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 400 + Math.random() * 200;
      osc.type = 'square';
      gain.gain.setValueAtTime(.01, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + .03);
      osc.start();
      osc.stop(audioCtx.currentTime + .03);
    } catch(e){}
  };

  document.addEventListener('click', e => {
    if(e.target.closest('.btn, #fab, button')) playClickSound();
  });

  // ============================================
  // ۱۱. Ripple Mouse Trail
  // ============================================
  function initMouseTrail(){
    if(window.innerWidth < 768) return;
    let lastTime = 0;
    document.addEventListener('mousemove', e => {
      const now = Date.now();
      if(now - lastTime < 50) return;
      lastTime = now;
      const dot = document.createElement('div');
      dot.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: linear-gradient(135deg, #22d3ee, #a78bfa);
        pointer-events: none;
        z-index: 9997;
        box-shadow: 0 0 10px rgba(139,92,246,.8);
        transition: all .8s ease;
        transform: translate(-50%, -50%);
      `;
      document.body.appendChild(dot);
      setTimeout(() => {
        dot.style.opacity = '0';
        dot.style.transform = 'translate(-50%, -50%) scale(0)';
      }, 50);
      setTimeout(() => dot.remove(), 900);
    });
  }

  // ============================================
  // ۱۲. Page Transition
  // ============================================
  function initPageTransitions(){
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
      s.style.transition = 'opacity .4s ease';
    });
  }

  // ============================================
  // راه‌اندازی همه
  // ============================================
  function initAll(){
    try { initParticles(); } catch(e){ console.log('particles err', e); }
    try { initCursorGlow(); } catch(e){ console.log('cursor err', e); }
    try { initRipple(); } catch(e){ console.log('ripple err', e); }
    try { initButtonGlow(); } catch(e){ console.log('btn glow err', e); }
    try { initMessageAnimations(); } catch(e){ console.log('msg anim err', e); }
    try { initCardTilt(); } catch(e){ console.log('tilt err', e); }
    try { initStarfield(); } catch(e){ console.log('stars err', e); }
    try { initMouseTrail(); } catch(e){ console.log('trail err', e); }
    try { initPageTransitions(); } catch(e){ console.log('trans err', e); }
    console.log('✨ Lumera Effects Loaded');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

})();
