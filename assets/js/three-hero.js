/* =====================================================================
   disruptree — Neural Network hero background
   3D animated graph with pulsing edges and parallax response.
   ===================================================================== */
(function () {
  const mount = document.getElementById('hero-canvas');
  if (!mount) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const schedule = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 2500 })
    : (fn) => setTimeout(fn, 600);

  schedule(() => {
    boot().catch((err) => {
      console.warn('[neural-hero] init failed', err);
      mount.classList.add('hero-canvas--fallback');
    });
  });

  async function boot() {
    const THREE = await import('three');

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05050b, 0.06);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 18);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      mount.classList.add('hero-canvas--fallback');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    /* ---------- Build neural graph ---------- */
    const NODE_COUNT = 110;
    const RADIUS_X = 14;
    const RADIUS_Y = 8;
    const RADIUS_Z = 6;
    const CONNECT_DIST = 4.2;

    const nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 2 * RADIUS_X,
          (Math.random() - 0.5) * 2 * RADIUS_Y,
          (Math.random() - 0.5) * 2 * RADIUS_Z
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.012,
          (Math.random() - 0.5) * 0.012,
          (Math.random() - 0.5) * 0.012
        ),
      });
    }

    const nodePositions = new Float32Array(NODE_COUNT * 3);
    const nodeColors = new Float32Array(NODE_COUNT * 3);

    const palette = [
      new THREE.Color(0x7c5cff),
      new THREE.Color(0x22d3ee),
      new THREE.Color(0xff3cac),
    ];

    for (let i = 0; i < NODE_COUNT; i++) {
      const c = palette[i % palette.length];
      nodeColors[i * 3 + 0] = c.r;
      nodeColors[i * 3 + 1] = c.g;
      nodeColors[i * 3 + 2] = c.b;
    }

    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    nodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));

    const nodeMaterial = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
    scene.add(nodePoints);

    /* Edges built each frame between near neighbors */
    const MAX_EDGES = NODE_COUNT * 6;
    const edgePositions = new Float32Array(MAX_EDGES * 2 * 3);
    const edgeColors = new Float32Array(MAX_EDGES * 2 * 3);

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    edgeGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));
    edgeGeometry.setDrawRange(0, 0);

    const edgeMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    scene.add(edgeLines);

    /* Travelling pulses along edges */
    const PULSE_COUNT = 60;
    const pulses = [];
    const pulsePositions = new Float32Array(PULSE_COUNT * 3);
    const pulseColors = new Float32Array(PULSE_COUNT * 3);

    function newPulse() {
      const a = Math.floor(Math.random() * NODE_COUNT);
      let b = Math.floor(Math.random() * NODE_COUNT);
      if (b === a) b = (a + 1) % NODE_COUNT;
      const color = palette[Math.floor(Math.random() * palette.length)];
      return {
        from: a,
        to: b,
        progress: Math.random(),
        speed: 0.005 + Math.random() * 0.011,
        color,
      };
    }

    for (let i = 0; i < PULSE_COUNT; i++) {
      const p = newPulse();
      pulses.push(p);
      pulseColors[i * 3 + 0] = p.color.r;
      pulseColors[i * 3 + 1] = p.color.g;
      pulseColors[i * 3 + 2] = p.color.b;
    }

    const pulseGeometry = new THREE.BufferGeometry();
    pulseGeometry.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
    pulseGeometry.setAttribute('color', new THREE.BufferAttribute(pulseColors, 3));

    const pulseMaterial = new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const pulsePoints = new THREE.Points(pulseGeometry, pulseMaterial);
    scene.add(pulsePoints);

    /* ---------- Sizing ---------- */
    function resize() {
      const rect = mount.getBoundingClientRect();
      const w = Math.max(1, rect.width || window.innerWidth);
      const h = Math.max(1, rect.height || window.innerHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    /* ---------- Pointer parallax ---------- */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener(
      'pointermove',
      (e) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      },
      { passive: true }
    );

    /* ---------- Animation loop ---------- */
    const clock = new THREE.Clock();
    let raf;
    const tmp = new THREE.Vector3();

    function tick() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const speedScale = reduced ? 0 : 1;

      for (let i = 0; i < NODE_COUNT; i++) {
        const n = nodes[i];
        n.position.addScaledVector(n.velocity, 60 * dt * speedScale);
        if (Math.abs(n.position.x) > RADIUS_X) n.velocity.x *= -1;
        if (Math.abs(n.position.y) > RADIUS_Y) n.velocity.y *= -1;
        if (Math.abs(n.position.z) > RADIUS_Z) n.velocity.z *= -1;
        nodePositions[i * 3 + 0] = n.position.x;
        nodePositions[i * 3 + 1] = n.position.y;
        nodePositions[i * 3 + 2] = n.position.z;
      }
      nodeGeometry.attributes.position.needsUpdate = true;

      let edgeCount = 0;
      const maxPairs = MAX_EDGES;
      const dist2 = CONNECT_DIST * CONNECT_DIST;
      for (let i = 0; i < NODE_COUNT && edgeCount < maxPairs; i++) {
        const a = nodes[i].position;
        for (let j = i + 1; j < NODE_COUNT && edgeCount < maxPairs; j++) {
          const b = nodes[j].position;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < dist2) {
            const idx = edgeCount * 6;
            edgePositions[idx + 0] = a.x;
            edgePositions[idx + 1] = a.y;
            edgePositions[idx + 2] = a.z;
            edgePositions[idx + 3] = b.x;
            edgePositions[idx + 4] = b.y;
            edgePositions[idx + 5] = b.z;

            const t = 1 - Math.sqrt(d2) / CONNECT_DIST;
            const cIndex = (i + j) % palette.length;
            const c = palette[cIndex];
            edgeColors[idx + 0] = c.r * t;
            edgeColors[idx + 1] = c.g * t;
            edgeColors[idx + 2] = c.b * t;
            edgeColors[idx + 3] = c.r * t;
            edgeColors[idx + 4] = c.g * t;
            edgeColors[idx + 5] = c.b * t;
            edgeCount++;
          }
        }
      }
      edgeGeometry.attributes.position.needsUpdate = true;
      edgeGeometry.attributes.color.needsUpdate = true;
      edgeGeometry.setDrawRange(0, edgeCount * 2);

      for (let i = 0; i < PULSE_COUNT; i++) {
        const p = pulses[i];
        p.progress += p.speed * speedScale;
        if (p.progress >= 1) {
          pulses[i] = newPulse();
          pulseColors[i * 3 + 0] = pulses[i].color.r;
          pulseColors[i * 3 + 1] = pulses[i].color.g;
          pulseColors[i * 3 + 2] = pulses[i].color.b;
          continue;
        }
        const a = nodes[p.from].position;
        const b = nodes[p.to].position;
        tmp.lerpVectors(a, b, p.progress);
        pulsePositions[i * 3 + 0] = tmp.x;
        pulsePositions[i * 3 + 1] = tmp.y;
        pulsePositions[i * 3 + 2] = tmp.z;
      }
      pulseGeometry.attributes.position.needsUpdate = true;
      pulseGeometry.attributes.color.needsUpdate = true;

      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      scene.rotation.y = pointer.x * 0.25;
      scene.rotation.x = pointer.y * 0.18;
      scene.rotation.z = Math.sin(clock.elapsedTime * 0.05) * 0.05;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    tick();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else tick();
    });
  }
})();
