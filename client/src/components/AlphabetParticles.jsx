import React, { useEffect, useRef } from 'react';

export default function AlphabetParticles({ isDarkMode, maxParticles = 26 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    const mouse = {
      x: null,
      y: null,
      radius: 120,
      isDown: false,
      draggedParticle: null
    };

    const handleMouseDown = (e) => {
      // Only initiate drag if clicking empty background (body or div)
      if (e.target.tagName !== 'BODY' && e.target.tagName !== 'DIV') return;
      
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.isDown = true;
      
      // Find particle (front to back)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < p.size * 0.8) {
          mouse.draggedParticle = p;
          // Move to end of array to render on top
          particles.splice(i, 1);
          particles.push(p);
          
          // Prevent browser text selection while throwing particles!
          e.preventDefault();
          break;
        }
      }
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      // Position is now handled smoothly inside the Particle's update loop
    };

    const handleMouseUp = () => {
      mouse.isDown = false;
      if (mouse.draggedParticle) {
        // We don't reset speed here; the particle keeps its calculated momentum!
        mouse.draggedParticle = null;
      }
    };
    
    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
      handleMouseUp();
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseout', handleMouseOut);

    const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    class Particle {
      constructor(letter) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        // Highly varied random sizes from 16px to 96px
        this.size = Math.random() * 80 + 16;
        this.density = (Math.random() * 30) + 1;
        this.letter = letter;
        this.speedX = (Math.random() - 0.5) * 1.5;
        this.speedY = (Math.random() - 0.5) * 1.5;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.03;
        this.opacity = 1.0; // Solid colors for comic style
        // Randomly pick comic pop colors
        const comicColors = ['#ffe800', '#00c3ff', '#ff3b30', '#ffffff'];
        this.color = comicColors[Math.floor(Math.random() * comicColors.length)];
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(2, this.size / 10);
        ctx.font = `900 ${this.size}px 'Russo One', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Draw the text outline then fill
        ctx.strokeText(this.letter, 0, 0);
        ctx.fillText(this.letter, 0, 0);
        ctx.restore();
      }

      update() {
        if (mouse.draggedParticle === this) {
          // Smooth follow using interpolation (Lerp)
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          
          // Calculate speed based on distance to mouse
          this.speedX = dx * 0.15;
          this.speedY = dy * 0.15;

          this.x += this.speedX;
          this.y += this.speedY;
          
          this.draw();
          return; // Skip other physics when dragged
        }

        // Air friction to slowly calm down violently thrown letters
        const currentSpeed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
        if (currentSpeed > 2.0) {
          this.speedX *= 0.98;
          this.speedY *= 0.98;
        }

        // Move floating
        this.x += this.speedX;
        this.y += this.speedY;
        this.angle += this.spin;

        // Dynamic morphing
        if (Math.random() < 0.002) {
          this.letter = alphabets[Math.floor(Math.random() * alphabets.length)];
        }

        // --- Invisible Force Field for Center UI ---
        // Create a solid box in the middle so letters bounce off instead of going behind
        const uiWidth = Math.min(650, canvas.width * 0.9);
        const uiHeight = Math.min(550, canvas.height * 0.8);
        const uiLeft = (canvas.width - uiWidth) / 2;
        const uiRight = uiLeft + uiWidth;
        const uiTop = (canvas.height - uiHeight) / 2 - 80; // Shift up to cover logo
        const uiBottom = uiTop + uiHeight;

        // If the letter enters the UI box, push it out and reverse its direction
        if (this.x + this.size/2 > uiLeft && this.x - this.size/2 < uiRight && 
            this.y + this.size/2 > uiTop && this.y - this.size/2 < uiBottom) {
            
           // Find the closest edge to bounce off of
           const distLeft = (this.x + this.size/2) - uiLeft;
           const distRight = uiRight - (this.x - this.size/2);
           const distTop = (this.y + this.size/2) - uiTop;
           const distBottom = uiBottom - (this.y - this.size/2);
           
           const minDist = Math.min(distLeft, distRight, distTop, distBottom);

           if (minDist === distLeft) {
               this.x = uiLeft - this.size/2;
               this.speedX = -Math.abs(this.speedX);
           } else if (minDist === distRight) {
               this.x = uiRight + this.size/2;
               this.speedX = Math.abs(this.speedX);
           } else if (minDist === distTop) {
               this.y = uiTop - this.size/2;
               this.speedY = -Math.abs(this.speedY);
           } else {
               this.y = uiBottom + this.size/2;
               this.speedY = Math.abs(this.speedY);
           }
        }

        // Wrap around screen
        if (this.x > canvas.width + this.size) this.x = -this.size;
        if (this.x < -this.size * 2) this.x = canvas.width;
        if (this.y > canvas.height + this.size) this.y = -this.size;
        if (this.y < -this.size * 2) this.y = canvas.height;

        // Collisions with other particles (elastic bounce)
        for (let i = 0; i < particles.length; i++) {
          const other = particles[i];
          if (other === this) continue;

          let dx = this.x - other.x;
          let dy = this.y - other.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          let minDist = (this.size + other.size) * 0.45; // Hitbox slightly smaller than visual
          
          if (distance < minDist && distance > 0) {
            // Overlap resolution (prevents sticking)
            let overlap = minDist - distance;
            let nx = dx / distance;
            let ny = dy / distance;
            
            if (mouse.draggedParticle === other) {
              // The other particle is being dragged by mouse, so it's infinitely heavy
              this.x += nx * overlap;
              this.y += ny * overlap;
              // Bounce away gently
              this.speedX += nx * 0.5;
              this.speedY += ny * 0.5;
            } else {
              // Both are free-floating
              // Push each apart halfway
              this.x += nx * overlap * 0.5;
              this.y += ny * overlap * 0.5;
              
              // Simple velocity exchange along collision normal
              let p = (this.speedX * nx + this.speedY * ny) - (other.speedX * nx + other.speedY * ny);
              // Only apply bounce if moving towards each other
              if (p < 0) {
                // Dampen the bounce slightly so they don't accelerate wildly
                this.speedX -= p * nx * 0.8;
                this.speedY -= p * ny * 0.8;
                // We don't change 'other' speed here to prevent double-applying, 
                // it will be handled when 'other' runs its own update loop.
              }
            }
          }
        }

        this.draw();
      }
    }

    const initParticles = () => {
      particles = [];
      if (maxParticles >= 26) {
        // One of each for the full set
        alphabets.forEach((letter) => {
          particles.push(new Particle(letter));
        });
        // Plus extras randomly
        for (let i = 26; i < maxParticles; i++) {
          particles.push(new Particle(alphabets[Math.floor(Math.random() * alphabets.length)]));
        }
      } else {
        // Randomly pick for less than 26
        for (let i = 0; i < maxParticles; i++) {
          particles.push(new Particle(alphabets[Math.floor(Math.random() * alphabets.length)]));
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDarkMode]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
    />
  );
}
