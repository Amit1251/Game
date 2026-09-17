(() => {
    'use strict';

    const canvas = document.getElementById('board');
    const context = canvas.getContext('2d');
    const threeCanvas = document.getElementById('three-board');
    const boardWrap = document.querySelector('.board-wrap');
    const scoreElement = document.getElementById('score');
    const bestElement = document.getElementById('best');
    const speedElement = document.getElementById('speed');
    const message = document.getElementById('message');
    const messageTitle = document.getElementById('message-title');
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const restartButton = document.getElementById('restart-button');
    const touchSurface = document.querySelector('.board-wrap');
    const gridSize = 24;
    const cellSize = canvas.width / gridSize;
    const directions = {
        up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
        left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
    };

    let snake;
    let food;
    let direction;
    let nextDirection;
    let score = 0;
    let best = Number(localStorage.getItem('snake-best') || 0);
    let timer = null;
    let animationFrame = null;
    let state = 'ready';
    let particles = [];
    let visualTime = 0;
    const arenaCanvas = document.createElement('canvas');
    arenaCanvas.width = canvas.width;
    arenaCanvas.height = canvas.height;
    const arenaContext = arenaCanvas.getContext('2d');
    let threeReady = false;
    let threeRenderer;
    let threeScene;
    let threeCamera;
    let threeSnakeMeshes = [];
    let threeFoodMesh;
    let threeFoodLight;
    let touchStart = null;

    bestElement.textContent = formatScore(best);

    function formatScore(value) { return String(value).padStart(4, '0'); }

    function resetGame() {
        snake = [{ x: 12, y: 13 }, { x: 11, y: 13 }, { x: 10, y: 13 }];
        direction = { ...directions.right };
        nextDirection = { ...direction };
        score = 0;
        food = createFood();
        updateHud();
        drawFrame();
    }

    function createFood() {
        let nextFood;
        do {
            nextFood = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        } while (snake.some(segment => segment.x === nextFood.x && segment.y === nextFood.y));
        return nextFood;
    }

    function setState(nextState, title) {
        state = nextState;
        messageTitle.textContent = title;
        message.classList.toggle('hidden', nextState === 'running');
        pauseButton.disabled = nextState !== 'running' && nextState !== 'paused';
        pauseButton.textContent = nextState === 'paused' ? 'Resume' : 'Pause';
        startButton.textContent = nextState === 'gameover' ? 'Play again' : 'Start game';
    }

    function startGame() {
        if (state === 'ready' || state === 'gameover') resetGame();
        setState('running', 'Press start to play');
        runLoop();
        startRenderLoop();
    }

    function togglePause() {
        if (state === 'running') {
            clearInterval(timer);
            setState('paused', 'Game paused');
            stopRenderLoop();
        } else if (state === 'paused') {
            setState('running', 'Press start to play');
            runLoop();
            startRenderLoop();
        }
    }

    function runLoop() {
        clearInterval(timer);
        timer = setInterval(tick, Math.max(65, 150 - Math.floor(score / 3) * 8));
    }

    function tick() {
        direction = { ...nextDirection };
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
        const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
        const hitSelf = snake.some(segment => segment.x === head.x && segment.y === head.y);
        if (hitWall || hitSelf) return endGame();

        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            best = Math.max(best, score);
            localStorage.setItem('snake-best', String(best));
            burst(food.x, food.y);
            food = createFood();
            updateHud();
            runLoop();
        } else {
            snake.pop();
        }
        drawFrame();
    }

    function endGame() {
        clearInterval(timer);
        setState('gameover', 'Game over');
        stopRenderLoop();
        drawFrame(true);
    }

    function changeDirection(name) {
        if (state === 'ready' || state === 'gameover') startGame();
        const next = directions[name];
        if (!next || (next.x === -direction.x && next.y === -direction.y)) return;
        nextDirection = { ...next };
    }

    function handleSwipe(directionName) {
        if (directionName) changeDirection(directionName);
    }

    touchSurface.addEventListener('touchstart', event => {
        if (event.touches.length !== 1) return;
        const touch = event.touches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });

    touchSurface.addEventListener('touchmove', event => {
        if (touchStart) event.preventDefault();
    }, { passive: false });

    touchSurface.addEventListener('touchend', event => {
        if (!touchStart) return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        touchStart = null;
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return;
        handleSwipe(Math.abs(deltaX) > Math.abs(deltaY) ? (deltaX > 0 ? 'right' : 'left') : (deltaY > 0 ? 'down' : 'up'));
    }, { passive: true });

    function updateHud() {
        scoreElement.textContent = formatScore(score);
        bestElement.textContent = formatScore(best);
        speedElement.textContent = String(Math.min(99, 1 + Math.floor(score / 30))).padStart(2, '0');
    }

    function startRenderLoop() {
        if (animationFrame !== null) return;
        const render = () => {
            if (state !== 'running') { animationFrame = null; return; }
            drawFrame();
            animationFrame = requestAnimationFrame(render);
        };
        animationFrame = requestAnimationFrame(render);
    }

    function stopRenderLoop() {
        if (animationFrame !== null) cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    function drawFrame(gameOver = false) {
        visualTime += 0.04;
        if (threeReady) {
            updateThreeScene(gameOver);
            return;
        }
        drawArena();
        drawFood();
        snake.slice().reverse().forEach((segment, reverseIndex) => {
            drawSnakeSegment(segment, snake.length - reverseIndex - 1, gameOver);
        });
        drawParticles();
    }

    function initThreeScene() {
        if (!window.THREE || !threeCanvas) return;
        try {
            const THREE = window.THREE;
            threeRenderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true, alpha: false });
            threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
            threeRenderer.setSize(canvas.width, canvas.height, false);
            threeRenderer.shadowMap.enabled = true;
            threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
            threeScene = new THREE.Scene();
            threeScene.background = new THREE.Color('#071009');
            threeCamera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
            threeCamera.position.set(0, 18, 18);
            threeCamera.lookAt(0, 0, 0);

            threeScene.add(new THREE.HemisphereLight('#d8ffb0', '#08120b', 2.3));
            const sun = new THREE.DirectionalLight('#efffd0', 4.5);
            sun.position.set(-8, 16, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); threeScene.add(sun);
            threeFoodLight = new THREE.PointLight('#ff704f', 7, 8); threeScene.add(threeFoodLight);

            const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#14291a', roughness: 0.82, metalness: 0.08 }));
            floor.rotation.x = -Math.PI / 2; floor.position.y = -0.05; floor.receiveShadow = true; threeScene.add(floor);
            const grid = new THREE.GridHelper(32, gridSize, '#8dbb52', '#284d2d');
            grid.position.y = 0.01; grid.material.opacity = 0.42; grid.material.transparent = true; threeScene.add(grid);
            const rim = new THREE.Mesh(new THREE.BoxGeometry(32, 0.35, 32), new THREE.MeshStandardMaterial({ color: '#213c24', roughness: 0.7 }));
            rim.position.y = -0.25; threeScene.add(rim);

            const bodyGeometry = new THREE.SphereGeometry(0.58, 20, 14);
            for (let i = 0; i < gridSize * gridSize; i += 1) {
                const material = new THREE.MeshStandardMaterial({ color: '#8dd342', roughness: 0.38, metalness: 0.04 });
                const mesh = new THREE.Mesh(bodyGeometry, material);
                mesh.castShadow = true; mesh.receiveShadow = true; mesh.visible = false;
                threeScene.add(mesh); threeSnakeMeshes.push(mesh);
            }
            threeFoodMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), new THREE.MeshStandardMaterial({ color: '#ff684d', emissive: '#8c1e12', emissiveIntensity: 2.2, roughness: 0.22 }));
            threeFoodMesh.castShadow = true; threeScene.add(threeFoodMesh);
            boardWrap.classList.add('three-active');
            threeReady = true;
            window.addEventListener('resize', resizeThreeScene, { passive: true });
            resizeThreeScene();
        } catch (error) {
            console.warn('3D renderer unavailable; using fallback renderer.', error);
        }
    }

    function resizeThreeScene() {
        if (!threeRenderer || !threeCamera) return;
        const size = Math.max(1, boardWrap.clientWidth);
        threeRenderer.setSize(size, size, false);
        threeCamera.aspect = 1;
        threeCamera.updateProjectionMatrix();
    }

    function updateThreeScene(gameOver = false) {
        const THREE = window.THREE;
        snake.forEach((segment, index) => {
            const mesh = threeSnakeMeshes[index];
            mesh.visible = true;
            mesh.position.set((segment.x - gridSize / 2 + 0.5) * 1.15, 0.58 + Math.sin(visualTime * 2 + index * 0.55) * 0.025, (segment.y - gridSize / 2 + 0.5) * 1.15);
            const scale = index === 0 ? 1.16 : 1 - Math.min(index, 14) * 0.012;
            mesh.scale.setScalar(scale);
            mesh.material.color.set(gameOver ? '#81483d' : index === 0 ? '#dfff83' : '#8dd342');
            mesh.material.emissive.set(gameOver ? '#2a0f0b' : index === 0 ? '#496d18' : '#122b0e');
        });
        for (let i = snake.length; i < threeSnakeMeshes.length; i += 1) threeSnakeMeshes[i].visible = false;
        threeFoodMesh.position.set((food.x - gridSize / 2 + 0.5) * 1.15, 0.78 + Math.sin(visualTime * 3) * 0.16, (food.y - gridSize / 2 + 0.5) * 1.15);
        threeFoodMesh.rotation.y += 0.035;
        threeFoodLight.position.copy(threeFoodMesh.position);
        threeFoodMesh.scale.setScalar(1 + Math.sin(visualTime * 3) * 0.12);
        threeRenderer.render(threeScene, threeCamera);
    }

    function project(x, y) {
        const left = 58 + (y / gridSize) * 18;
        const right = 542 - (y / gridSize) * 18;
        return { x: left + (x / gridSize) * (right - left), y: 82 + (y / gridSize) * 430 };
    }

    function buildArena() {
        const background = arenaContext.createLinearGradient(0, 0, 0, canvas.height);
        background.addColorStop(0, '#14251a');
        background.addColorStop(1, '#050a07');
        arenaContext.fillStyle = background;
        arenaContext.fillRect(0, 0, canvas.width, canvas.height);

        arenaContext.fillStyle = 'rgba(183, 243, 74, 0.08)';
        arenaContext.beginPath(); arenaContext.arc(300, 300, 210, 0, Math.PI * 2); arenaContext.fill();

        const topLeft = project(0, 0), topRight = project(gridSize, 0), bottomRight = project(gridSize, gridSize), bottomLeft = project(0, gridSize);
        arenaContext.save();
        arenaContext.shadowColor = 'rgba(0, 0, 0, 0.7)'; arenaContext.shadowBlur = 28; arenaContext.shadowOffsetY = 18;
        const floor = arenaContext.createLinearGradient(0, 70, 0, 530);
        floor.addColorStop(0, '#203824'); floor.addColorStop(1, '#0a160d');
        arenaContext.fillStyle = floor;
        arenaContext.beginPath(); arenaContext.moveTo(topLeft.x, topLeft.y); arenaContext.lineTo(topRight.x, topRight.y); arenaContext.lineTo(bottomRight.x, bottomRight.y); arenaContext.lineTo(bottomLeft.x, bottomLeft.y); arenaContext.closePath(); arenaContext.fill();
        arenaContext.restore();

        arenaContext.save();
        arenaContext.beginPath(); arenaContext.moveTo(topLeft.x, topLeft.y); arenaContext.lineTo(topRight.x, topRight.y); arenaContext.lineTo(bottomRight.x, bottomRight.y); arenaContext.lineTo(bottomLeft.x, bottomLeft.y); arenaContext.closePath(); arenaContext.clip();
        arenaContext.strokeStyle = 'rgba(183, 243, 74, 0.11)'; arenaContext.lineWidth = 1;
        for (let i = 1; i < gridSize; i += 1) {
            let start = project(i, 0), end = project(i, gridSize);
            arenaContext.beginPath(); arenaContext.moveTo(start.x, start.y); arenaContext.lineTo(end.x, end.y); arenaContext.stroke();
            start = project(0, i); end = project(gridSize, i);
            arenaContext.beginPath(); arenaContext.moveTo(start.x, start.y); arenaContext.lineTo(end.x, end.y); arenaContext.stroke();
        }
        arenaContext.restore();
        arenaContext.strokeStyle = 'rgba(183, 243, 74, 0.55)'; arenaContext.lineWidth = 2;
        arenaContext.beginPath(); arenaContext.moveTo(topLeft.x, topLeft.y); arenaContext.lineTo(topRight.x, topRight.y); arenaContext.lineTo(bottomRight.x, bottomRight.y); arenaContext.lineTo(bottomLeft.x, bottomLeft.y); arenaContext.closePath(); arenaContext.stroke();
    }

    function drawArena() {
        context.drawImage(arenaCanvas, 0, 0);
    }

    function drawSnakeSegment(segment, index, gameOver) {
        const point = project(segment.x + 0.5, segment.y + 0.5);
        const next = project(segment.x + 1, segment.y + 0.5);
        const radius = Math.max(7, 15 - segment.y * 0.16);
        context.save();
        context.shadowColor = 'rgba(0,0,0,0.65)'; context.shadowBlur = 10; context.shadowOffsetY = 7;
        const body = context.createRadialGradient(point.x - radius * 0.4, point.y - radius * 0.6, 2, point.x, point.y, radius * 1.4);
        body.addColorStop(0, gameOver ? '#cc7157' : index === 0 ? '#f1ff9c' : '#d2fa61');
        body.addColorStop(0.5, gameOver ? '#884d3f' : '#78b832');
        body.addColorStop(1, gameOver ? '#4b2927' : '#245d2a');
        context.fillStyle = body;
        context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2); context.fill();
        context.restore();
        context.strokeStyle = 'rgba(10, 39, 17, 0.65)'; context.lineWidth = 1.5;
        context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2); context.stroke();
        if (index === 0 && !gameOver) drawSnakeHead(point, next, radius);
    }

    function drawSnakeHead(point, next, radius) {
        const angle = Math.atan2(next.y - point.y, next.x - point.x);
        const eyeOffset = radius * 0.42;
        [-1, 1].forEach(side => {
            const eyeX = point.x + Math.cos(angle) * eyeOffset - Math.sin(angle) * side * eyeOffset;
            const eyeY = point.y + Math.sin(angle) * eyeOffset + Math.cos(angle) * side * eyeOffset;
            context.fillStyle = '#f6f4d8'; context.beginPath(); context.arc(eyeX, eyeY, 3.2, 0, Math.PI * 2); context.fill();
            context.fillStyle = '#19251a'; context.beginPath(); context.arc(eyeX + Math.cos(angle) * 1.2, eyeY + Math.sin(angle) * 1.2, 1.5, 0, Math.PI * 2); context.fill();
        });
    }

    function drawFood() {
        const point = project(food.x + 0.5, food.y + 0.5);
        const pulse = 1 + Math.sin(visualTime * 3) * 0.12;
        context.save(); context.shadowColor = '#ff744f'; context.shadowBlur = 22;
        context.fillStyle = '#ff704f'; context.beginPath(); context.arc(point.x, point.y, 8 * pulse, 0, Math.PI * 2); context.fill();
        context.fillStyle = '#ffd4bd'; context.beginPath(); context.arc(point.x - 2, point.y - 3, 2.5, 0, Math.PI * 2); context.fill(); context.restore();
    }

    function burst(x, y) {
        for (let i = 0; i < 12; i += 1) particles.push({ x: x + 0.5, y: y + 0.5, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, life: 1 });
    }

    function drawParticles() {
        particles = particles.filter(particle => particle.life > 0);
        particles.forEach(particle => {
            particle.x += particle.vx; particle.y += particle.vy; particle.life -= 0.025;
            const point = project(particle.x, particle.y);
            context.globalAlpha = particle.life; context.fillStyle = '#ffb58f'; context.beginPath(); context.arc(point.x, point.y, 2.2, 0, Math.PI * 2); context.fill();
        });
        context.globalAlpha = 1;
    }

    document.addEventListener('keydown', event => {
        const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
        if (event.code === 'Space') { event.preventDefault(); togglePause(); return; }
        if (keys[event.key]) { event.preventDefault(); changeDirection(keys[event.key]); }
    });

    document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => changeDirection(button.dataset.direction)));
    startButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
    restartButton.addEventListener('click', () => { clearInterval(timer); stopRenderLoop(); resetGame(); setState('ready', 'Press start to play'); });

    buildArena();
    initThreeScene();
    resetGame();
})();