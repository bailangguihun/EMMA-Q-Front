(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function revealElements() {
        const items = document.querySelectorAll('[data-reveal]');
        if (!items.length) {
            return;
        }

        if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
            items.forEach((item) => item.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries, currentObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add('is-visible');
                currentObserver.unobserve(entry.target);
            });
        }, {
            threshold: 0.16,
            rootMargin: '0px 0px -8% 0px',
        });

        items.forEach((item, index) => {
            item.style.setProperty('--reveal-delay', `${index * 45}ms`);
            observer.observe(item);
        });
    }

    function initWaveCanvas(canvas) {
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        const parent = canvas.parentElement;
        let width = 0;
        let height = 0;
        let frameId = 0;
        let tick = 0;

        function resize() {
            if (!parent) {
                return;
            }

            const rect = parent.getBoundingClientRect();
            const ratio = Math.min(window.devicePixelRatio || 1, 2);

            width = rect.width;
            height = rect.height;
            canvas.width = Math.max(1, Math.round(width * ratio));
            canvas.height = Math.max(1, Math.round(height * ratio));
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
        }

        function drawWave(offset, amplitude, speed, color) {
            context.beginPath();
            context.lineWidth = 1.4;
            context.strokeStyle = color;

            for (let x = 0; x <= width; x += 6) {
                const y =
                    height * 0.52 +
                    Math.sin((x / 84) + tick * speed + offset) * amplitude +
                    Math.cos((x / 140) - tick * (speed * 0.68)) * amplitude * 0.5;

                if (x === 0) {
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
            }

            context.stroke();
        }

        function render() {
            context.clearRect(0, 0, width, height);
            context.fillStyle = 'rgba(6, 14, 28, 0.55)';
            context.fillRect(0, 0, width, height);

            context.strokeStyle = 'rgba(132, 225, 221, 0.08)';
            context.lineWidth = 1;
            for (let y = 28; y < height; y += 32) {
                context.beginPath();
                context.moveTo(0, y);
                context.lineTo(width, y);
                context.stroke();
            }

            drawWave(0, 18, 0.018, 'rgba(146, 239, 230, 0.85)');
            drawWave(1.4, 28, 0.014, 'rgba(100, 197, 226, 0.45)');
            drawWave(2.2, 42, 0.01, 'rgba(255, 170, 118, 0.22)');

            tick += 1;
            frameId = window.requestAnimationFrame(render);
        }

        resize();

        if (reducedMotionQuery.matches) {
            render();
            window.cancelAnimationFrame(frameId);
            return;
        }

        render();
        window.addEventListener('resize', resize, { passive: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        revealElements();
        document.querySelectorAll('[data-wave-canvas]').forEach(initWaveCanvas);
    });
})();
