/**
 * SysML World — A retro side-scrolling "Model Builder" adventure that teaches
 * SysML v2.0 concepts through gameplay.
 *
 * This file is entirely self-contained.  It runs inside a VS Code webview
 * and has zero dependencies on the host extension's code.
 *
 * v2 — Improved Mario-like graphics, fixed physics/jump, fixed puzzle triggers.
 */

/* global acquireVsCodeApi */
// @ts-nocheck — runs in a webview, not in Node

(function () {
    'use strict';

    const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;

    // ─── Document Words (injected from extension host) ─────────────
    let documentWords = [];

    // Listen for identifier names sent from the active SysML document
    window.addEventListener('message', function (event) {
        var data = event.data;
        if (data && data.type === 'documentWords' && Array.isArray(data.words)) {
            documentWords = data.words;
        }
    });

    // ─── Constants ─────────────────────────────────────────────────
    const CANVAS_W = 800;
    const CANVAS_H = 450;
    const TILE = 32;
    const GRAVITY = 0.42;
    const JUMP_FORCE = -11.5;
    const MOVE_SPEED = 3.2;
    const PLAYER_W = 20;
    const PLAYER_H = 28;
    const SCROLL_THRESHOLD = 300;

    // ─── Palette — warm vibrant Mario-like colours ─────────────────
    const COL = {
        skyTop:     '#1a0533',
        skyBot:     '#0d2137',
        ground:     '#5a3a1a',
        groundTop:  '#7ac44a',
        groundMid:  '#5da035',
        groundDark: '#4a3010',
        platform:   '#c0956a',
        platTop:    '#d4aa78',
        platShade:  '#8a6a40',
        player:     '#3a3a50',
        playerSkin: '#ddc8a0',
        playerShoe: '#222238',
        playerHair: '#1a1a30',
        playerOverall: '#2e2e44',
        cape:       '#2a2a58',
        capeInner:  '#4444bb',
        belt:       '#ccaa00',
        batOutline: '#6688cc',
        hazard:     '#ee2222',
        hazardBody: '#666666',
        pickup:     '#ffdd00',
        pickupEdge: '#cc9900',
        portal:     '#44ddff',
        portalGlow: '#88eeff',
        bridge:     '#b08040',
        bridgeTop:  '#c89850',
        bridgePlank:'#906830',
        door:       '#886644',
        doorLock:   '#ffcc00',
        star:       '#ffffff',
        particle:   '#ffdd00',
        puzzleTrig: '#ff88ff',
        coin:       '#ffee44',
        bush:       '#3a8a2a',
        bushLight:  '#5ab040',
        hill:       '#2a6a20',
        hillLight:  '#3a8a30',
        cloud:      '#ffffff',
    };

    // ─── DOM refs ──────────────────────────────────────────────────
    const canvas    = document.getElementById('game');
    const ctx       = canvas.getContext('2d');
    const titleScr  = document.getElementById('title-screen');
    const startBtn  = document.getElementById('start-btn');
    const lcOverlay = document.getElementById('level-complete');
    const lcConcept = document.getElementById('lc-concept');
    const lcExplain = document.getElementById('lc-explanation');
    const nextBtn   = document.getElementById('next-btn');
    const goOverlay = document.getElementById('game-over');
    const goScore   = document.getElementById('go-score');
    const retryBtn  = document.getElementById('retry-btn');
    const modelPanel    = document.getElementById('model-panel');
    const puzzleTitle   = document.getElementById('puzzle-title');
    const puzzleHint    = document.getElementById('puzzle-hint');
    const puzzleSlots   = document.getElementById('puzzle-slots');
    const puzzleBlocks  = document.getElementById('puzzle-blocks');
    const hudScore  = document.getElementById('hud-score');
    const hudLives  = document.getElementById('hud-lives');
    const hudBlocks = document.getElementById('hud-blocks');
    const hudLevel  = document.getElementById('hud-level');

    // ─── Canvas scaling ────────────────────────────────────────────
    function resizeCanvas() {
        const container = document.getElementById('canvas-container');
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const scale = Math.min(cw / CANVAS_W, ch / CANVAS_H);
        canvas.style.width  = Math.floor(CANVAS_W * scale) + 'px';
        canvas.style.height = Math.floor(CANVAS_H * scale) + 'px';
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ─── Input ─────────────────────────────────────────────────────
    const keys = {};
    const justPressed = {};
    document.addEventListener('keydown', e => {
        if (!keys[e.code]) justPressed[e.code] = true;
        keys[e.code] = true;
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
            e.preventDefault();
        }
    });
    document.addEventListener('keyup', e => { keys[e.code] = false; });

    // ─── Audio ─────────────────────────────────────────────────────
    let audioCtx = null;
    let masterGain = null;

    function initAudio() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.15;
        masterGain.connect(audioCtx.destination);
    }

    function playTone(freq, duration, type, vol) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime((vol || 0.3) * masterGain.gain.value, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    function sfxJump()    { playTone(520, 0.12, 'square', 0.3); playTone(780, 0.1, 'square', 0.2); }
    function sfxPickup()  { playTone(880, 0.08, 'square', 0.3); playTone(1100, 0.08, 'square', 0.25); playTone(1320, 0.12, 'square', 0.2); }
    function sfxHurt()    { playTone(200, 0.15, 'sawtooth', 0.4); playTone(150, 0.2, 'sawtooth', 0.3); }
    function sfxCorrect() { playTone(660, 0.1, 'square', 0.25); playTone(880, 0.1, 'square', 0.25); playTone(1100, 0.15, 'triangle', 0.3); }
    function sfxPuzzleSolved() {
        // Triumphant fanfare for solving the entire puzzle
        var notes = [523, 659, 784, 1047, 1319, 1568];
        notes.forEach(function (n, i) { setTimeout(function () { playTone(n, 0.2, 'square', 0.3); }, i * 80); });
        setTimeout(function () { playTone(1568, 0.5, 'triangle', 0.35); }, notes.length * 80);
        setTimeout(function () { playTone(2093, 0.6, 'triangle', 0.25); }, notes.length * 80 + 200);
    }
    function sfxVictory() {
        // Grand victory fanfare for completing all levels
        var melody = [523, 659, 784, 1047, 784, 1047, 1319, 1568, 1319, 1568, 2093];
        melody.forEach(function (n, i) { setTimeout(function () { playTone(n, 0.25, 'square', 0.3); }, i * 120); });
        setTimeout(function () { playTone(2093, 0.8, 'triangle', 0.35); }, melody.length * 120);
        setTimeout(function () { playTone(2093, 0.4, 'square', 0.2); playTone(2637, 0.6, 'triangle', 0.25); }, melody.length * 120 + 300);
    }
    function sfxWrong()   { playTone(220, 0.15, 'sawtooth', 0.3); playTone(180, 0.2, 'sawtooth', 0.25); }
    function sfxLevelComplete() {
        const notes = [523, 659, 784, 1047, 784, 1047, 1319];
        notes.forEach((n, i) => setTimeout(() => playTone(n, 0.18, 'square', 0.25), i * 100));
    }
    function sfxGameOver() {
        const notes = [400, 350, 300, 250, 200];
        notes.forEach((n, i) => setTimeout(() => playTone(n, 0.25, 'sawtooth', 0.3), i * 150));
    }

    let bgmInterval = null;
    function startBgm() {
        if (bgmInterval) return;
        const patterns = [
            [262, 330, 392, 330],
            [294, 370, 440, 370],
            [247, 311, 370, 311],
            [262, 330, 392, 523],
        ];
        let bar = 0, beat = 0;
        bgmInterval = setInterval(() => {
            const pattern = patterns[bar % patterns.length];
            playTone(pattern[beat % pattern.length], 0.12, 'triangle', 0.08);
            if (beat === 0) playTone(pattern[0] / 2, 0.25, 'triangle', 0.06);
            beat++;
            if (beat >= 4) { beat = 0; bar++; }
        }, 180);
    }
    function stopBgm() {
        if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
    }

    // ─── Particles ─────────────────────────────────────────────────
    const particles = [];
    function spawnParticles(x, y, color, count, spread) {
        for (let i = 0; i < (count || 6); i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * (spread || 4),
                vy: (Math.random() - 0.5) * (spread || 4) - 2,
                life: 30 + Math.random() * 20, maxLife: 50,
                color: color || COL.particle,
                size: 2 + Math.random() * 3,
            });
        }
    }
    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }
    function drawParticles(cX) {
        for (const p of particles) {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.floor(p.x - cX), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
        }
        ctx.globalAlpha = 1;
    }

    // ─── Background decorations ────────────────────────────────────
    const stars = [];
    for (let i = 0; i < 60; i++) {
        stars.push({
            x: Math.random() * 2000, y: Math.random() * CANVAS_H * 0.55,
            size: Math.random() < 0.2 ? 2 : 1,
            speed: 0.05 + Math.random() * 0.15,
            twinkle: Math.random() * Math.PI * 2,
        });
    }
    const clouds = [];
    for (let i = 0; i < 8; i++) {
        clouds.push({
            x: Math.random() * 2000, y: 30 + Math.random() * 80,
            w: 50 + Math.random() * 60, h: 20 + Math.random() * 15,
            speed: 0.08 + Math.random() * 0.12,
        });
    }
    const hills = [];
    for (let i = 0; i < 12; i++) {
        hills.push({
            x: i * 180 + Math.random() * 40,
            r: 40 + Math.random() * 50,
            speed: 0.15 + Math.random() * 0.1,
        });
    }
    const bushes = [];
    for (let i = 0; i < 20; i++) {
        bushes.push({
            x: i * 120 + Math.random() * 60,
            w: 24 + Math.random() * 28, h: 12 + Math.random() * 10,
            speed: 0.5,
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //  LEVEL DEFINITIONS
    //
    //  Ground is at row 12 (tile index 12).  Row 11 ground row.
    //  Platforms placed within 2-3 tiles of ground so pickups
    //  are reachable.  Puzzle triggers on the ground itself.
    // ═══════════════════════════════════════════════════════════════

    const LEVELS = [
        // ─── Level 1: Parts, Definitions & Attributes ──
        {
            name: 'Parts & Definitions',
            concept: 'Parts are instances of part definitions with attributes',
            explanation: 'In SysML v2, a part definition describes the type of a component. ' +
                'A part usage creates an instance of that definition. ' +
                'Attributes capture properties like mass, voltage, or name.',
            bgColor: '#0d0e28',
            groundRow: 12,
            tiles: [
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '.......----........----........----........----............',
                '..........................................................',
                '##########################################################',
                '##########################################################',
            ],
            pickups: [
                { x: 8,  y: 9,  label: 'part def',   id: 'pdef1' },
                { x: 14, y: 9,  label: 'part',        id: 'part1' },
                { x: 20, y: 9,  label: 'attribute',   id: 'attr1' },
                { x: 26, y: 9,  label: 'attribute',   id: 'attr2' },
                { x: 32, y: 9,  label: 'part',        id: 'part2' },
                { x: 38, y: 9,  label: 'redefines',   id: 'redef1' },
            ],
            hazards: [
                { x: 43, y: 11, w: 1, h: 1 },
                { x: 45, y: 11, w: 1, h: 1 },
            ],
            puzzleTriggers: [
                { x: 48, y: 11 },
            ],
            bridges: [],
            doors: [
                { x: 50, y: 10, h: 2 },
            ],
            puzzle: {
                title: 'Define and Use a Part',
                hint: 'Create a part definition with attributes, then instantiate it:\n\n' +
                      'part def Sensor {\n' +
                      '  attribute mass : Real;\n' +
                      '  attribute range : Real;\n' +
                      '}\n' +
                      'part frontSensor : Sensor;',
                slots: [
                    { label: 'Definition',    answer: 'part def' },
                    { label: 'Property 1',    answer: 'attribute' },
                    { label: 'Property 2',    answer: 'attribute' },
                    { label: 'Instance',      answer: 'part' },
                ],
                blocks: ['part def', 'part', 'attribute', 'attribute', 'part', 'redefines'],
            },
        },

        // ─── Level 2: Ports & Parts ────────────────────
        {
            name: 'Ports & Parts',
            concept: 'Parts connect via Ports',
            explanation: 'In SysML v2, parts represent structural components of a system. ' +
                'Parts communicate through ports — typed connection points. ' +
                'Without ports, parts cannot exchange flows or signals.',
            bgColor: '#0d0a2e',
            groundRow: 12,
            tiles: [
                //0         1         2         3         4         5
                //0123456789012345678901234567890123456789012345678901234567
                '..........................................................', // 0
                '..........................................................', // 1
                '..........................................................', // 2
                '..........................................................', // 3
                '..........................................................', // 4
                '..........................................................', // 5
                '..........................................................', // 6
                '..........................................................', // 7
                '..........................................................', // 8
                '..........................................................', // 9
                '.......----........----........----........----............', // 10
                '..........................................................', // 11
                '##########################################################', // 12
                '##########################################################', // 13
            ],
            pickups: [
                { x: 8,  y: 9,  label: 'part',      id: 'part1' },
                { x: 14, y: 9,  label: 'port in',   id: 'port_in' },
                { x: 20, y: 9,  label: 'port out',  id: 'port_out' },
                { x: 26, y: 9,  label: 'connect',   id: 'connect1' },
                { x: 32, y: 9,  label: 'part',      id: 'part2' },
                { x: 38, y: 9,  label: 'interface',  id: 'iface1' },
            ],
            hazards: [
                { x: 43, y: 11, w: 1, h: 1 },
                { x: 45, y: 11, w: 1, h: 1 },
            ],
            puzzleTriggers: [
                { x: 48, y: 11 },
            ],
            bridges: [],
            doors: [
                { x: 50, y: 10, h: 2 },
            ],
            puzzle: {
                title: 'Connect Two Parts',
                hint: 'In SysML v2, parts must connect through ports.\n\n' +
                      'part sensor { port out sensorOut : TempReading; }\n' +
                      'part controller { port in ctrlIn : TempReading; }\n' +
                      'connect sensor.sensorOut to controller.ctrlIn;',
                slots: [
                    { label: 'Source Part', answer: 'part' },
                    { label: 'Out Port',    answer: 'port out' },
                    { label: 'Connection',  answer: 'connect' },
                    { label: 'In Port',     answer: 'port in' },
                    { label: 'Target Part', answer: 'part' },
                ],
                blocks: ['part', 'port in', 'port out', 'connect', 'part', 'interface'],
            },
        },

        // ─── Level 2: Actions & Flows ──────────────────
        {
            name: 'Actions & Flows',
            concept: 'Actions need Inputs and Outputs',
            explanation: 'SysML v2 actions represent behaviour — things the system does. ' +
                'Each action can have typed input and output parameters that define ' +
                'what data flows in and out. Actions chain together via flows.',
            bgColor: '#0e0a2e',
            groundRow: 12,
            tiles: [
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '....................----..................................', // 8 — high platform
                '......----....................................----........', // 9 — mid platforms
                '..............----........----............................ ', // 10 — low platforms
                '..........................................................',
                '##########################################################',
                '##########################################################',
            ],
            pickups: [
                { x: 7,  y: 8, label: 'action',   id: 'act1' },
                { x: 15, y: 9, label: 'in',       id: 'in1' },
                { x: 21, y: 7, label: 'out',      id: 'out1' },
                { x: 27, y: 9, label: 'flow',     id: 'flow1' },
                { x: 39, y: 8, label: 'action',   id: 'act2' },
                { x: 33, y: 9, label: 'in',       id: 'in2' },
            ],
            hazards: [
                { x: 42, y: 11, w: 1, h: 1 },
                { x: 44, y: 11, w: 1, h: 1 },
                { x: 46, y: 11, w: 1, h: 1 },
            ],
            puzzleTriggers: [
                { x: 49, y: 11 },
            ],
            bridges: [],
            doors: [
                { x: 51, y: 10, h: 2 },
            ],
            puzzle: {
                title: 'Chain Two Actions',
                hint: 'Build an action flow: an action produces output that becomes input of the next.\n\n' +
                      'action sense { out reading : Temperature; }\n' +
                      'action process { in data : Temperature; }\n' +
                      'flow sense.reading to process.data;',
                slots: [
                    { label: 'First Action',  answer: 'action' },
                    { label: 'Output Param',  answer: 'out' },
                    { label: 'Flow Link',     answer: 'flow' },
                    { label: 'Input Param',   answer: 'in' },
                    { label: 'Second Action', answer: 'action' },
                ],
                blocks: ['action', 'in', 'out', 'flow', 'action', 'in'],
            },
        },

        // ─── Level 3: Requirements ─────────────────────
        {
            name: 'Requirements',
            concept: 'Requirements must trace to something real',
            explanation: 'SysML v2 requirements capture what the system must do. ' +
                'A requirement on its own is just text — it becomes meaningful when ' +
                'you satisfy it with a concrete part or action via «satisfy».',
            bgColor: '#0a0e2e',
            groundRow: 12,
            tiles: [
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................----............................', // 7 — highest platform
                '......----................................----............', // 8 — high platforms
                '..............----........................................', // 9 — mid platform
                '....................................----..................', // 10 — low platform
                '..........................................................',
                '##########################################################',
                '##########################################################',
            ],
            pickups: [
                { x: 7,  y: 7, label: 'requirement', id: 'req1' },
                { x: 15, y: 8, label: 'text',        id: 'text1' },
                { x: 27, y: 6, label: 'satisfy',     id: 'sat1' },
                { x: 37, y: 7, label: 'part',        id: 'part1' },
                { x: 39, y: 9, label: 'verify',      id: 'ver1' },
                { x: 21, y: 9, label: 'action',      id: 'act1' },
            ],
            hazards: [
                { x: 41, y: 11, w: 1, h: 1 },
                { x: 43, y: 11, w: 1, h: 1 },
                { x: 45, y: 11, w: 1, h: 1 },
            ],
            puzzleTriggers: [
                { x: 48, y: 11 },
            ],
            bridges: [],
            doors: [
                { x: 50, y: 10, h: 2 },
            ],
            puzzle: {
                title: 'Trace a Requirement',
                hint: 'Create a requirement and satisfy it with a structural element:\n\n' +
                      'requirement tempReq { doc /* shall measure temperature */ }\n' +
                      'satisfy tempReq by sensor;\n' +
                      'verify tempReq by testAction;',
                slots: [
                    { label: 'Requirement',   answer: 'requirement' },
                    { label: 'Description',   answer: 'text' },
                    { label: 'Satisfaction',   answer: 'satisfy' },
                    { label: 'Structure Ref',  answer: 'part' },
                    { label: 'Verification',   answer: 'verify' },
                ],
                blocks: ['requirement', 'text', 'satisfy', 'part', 'verify', 'action'],
            },
        },

        // ─── Level 4: Behaviour & Structure ────────────
        {
            name: 'Behaviour & Structure',
            concept: 'Behaviours must reference structural elements',
            explanation: 'In SysML v2, behaviour (actions, state machines) doesn\'t float in ' +
                'isolation — it must be performed by or allocated to structural parts. ' +
                'This ensures every action has an owner in the physical architecture.',
            bgColor: '#0a0a1e',
            groundRow: 12,
            tiles: [
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '..........................................................',
                '............................---...........................', // 6 — highest platform
                '....---..............................---..................', // 7 — high platforms
                '..............---........................................', // 8 — mid-high
                '........................................---...............', // 9 — mid platform
                '....................---...................................', // 10 — low platform
                '..........................................................',
                '##########################################################',
                '##########################################################',
            ],
            pickups: [
                { x: 5,  y: 6, label: 'part',       id: 'p1' },
                { x: 15, y: 7, label: 'action',     id: 'a1' },
                { x: 29, y: 6, label: 'perform',    id: 'perf1' },
                { x: 21, y: 9, label: 'state',      id: 'st1' },
                { x: 41, y: 8, label: 'exhibit',    id: 'exh1' },
                { x: 35, y: 6, label: 'allocation', id: 'alloc1' },
            ],
            hazards: [
                { x: 40, y: 11, w: 1, h: 1 },
                { x: 42, y: 11, w: 1, h: 1 },
                { x: 44, y: 11, w: 1, h: 1 },
                { x: 46, y: 11, w: 1, h: 1 },
            ],
            puzzleTriggers: [
                { x: 49, y: 11 },
            ],
            bridges: [],
            doors: [
                { x: 51, y: 10, h: 2 },
            ],
            puzzle: {
                title: 'Allocate Behaviour to Structure',
                hint: 'Assign behaviour to its owning part:\n\n' +
                      'part controller {\n' +
                      '  perform action regulate;\n' +
                      '  exhibit state monitoring;\n' +
                      '}\n' +
                      'Every action and state must be performed/exhibited by a part.',
                slots: [
                    { label: 'Structure',      answer: 'part' },
                    { label: 'Perform Keyword', answer: 'perform' },
                    { label: 'Action',          answer: 'action' },
                    { label: 'Exhibit Keyword', answer: 'exhibit' },
                    { label: 'State Machine',   answer: 'state' },
                ],
                blocks: ['part', 'action', 'perform', 'state', 'exhibit', 'allocation'],
            },
        },
    ];

    // ═══════════════════════════════════════════════════════════════
    //  GAME STATE
    // ═══════════════════════════════════════════════════════════════

    let state = 'title';
    let currentLevel = 0;
    let score = 0;
    let lives = 3;
    let inventory = [];
    let collectedIds = new Set();
    let frameTick = 0;

    let player = {
        x: 64, y: 0, vx: 0, vy: 0,
        onGround: false, facing: 1,
        frame: 0, walkTimer: 0, invincible: 0,
        ducking: false,
    };

    let camX = 0;
    let levelData = null;
    let tileGrid = [];
    let activeBridges = [];
    let doorsOpen = false;
    let puzzleSolved = false;
    let puzzleActive = false;
    let selectedSlot = -1;
    let slotValues = [];
    let usedBlockIndices = new Set();

    // ═══════════════════════════════════════════════════════════════
    //  BOSS FIGHT STATE
    // ═══════════════════════════════════════════════════════════════

    const SYSML_KEYWORDS = [
        'part def', 'part', 'port in', 'port out', 'attribute',
        'action def', 'action', 'flow', 'connect', 'item def',
        'requirement', 'satisfy', 'verify', 'state def', 'state',
        'transition', 'entry', 'exit', 'do', 'perform',
        'exhibit', 'use case def', 'actor', 'include',
        'package', 'import', 'alias', 'redefines', 'subsets',
        'specializes', 'allocation', 'constraint', 'objective',
        'concern', 'stakeholder', 'ref', 'in', 'out', 'inout',
        'interface def', 'connection def', 'succession',
        'first', 'then', 'fork', 'join', 'merge', 'decide',
        'analysis case', 'calc def', 'enumeration def',
        'occurrence def', 'rendering', 'view def', 'viewpoint',
    ];

    const SYSML_SYNTAX = [
        '{ }', ': Type', '; ', '= value', '::>', ':>',
        '( )', '[ 0..* ]', '[ 1 ]', '/* comment */',
        'doc /* text */', '#name', '~', '@', '>>',
        'about', 'to', 'by', 'from', 'ordered', 'nonunique',
    ];

    let boss = {
        x: 0, y: 0, w: 80, h: 100,
        hp: 100, maxHp: 100,
        phase: 0,           // 0=intro, 1=fight, 2=dying, 3=dead
        timer: 0,
        survivalTimer: 0,   // frames survived
        survivalTarget: 3600, // 60 seconds at 60fps to win
        fireTimer: 0,
        fireRate: 60,       // frames between shots (gets faster)
        mouthOpen: 0,
        eyeGlow: 0,
        shakeX: 0, shakeY: 0,
        deathTimer: 0,
        bobOffset: 0,
    };

    let bossProjectiles = [];
    let bossPlayerHP = 100;
    let bossMaxHP = 100;
    let bossScoreTimer = 0;
    let bossGroundY = 0;
    let bossBgmInterval = null;
    // Door transition & level intro state
    let doorTransitionTimer = 0;
    let doorTargetX = 0;
    let doorPhase = 'walk'; // 'walk' | 'enter' | 'close'
    let levelIntroTimer = 0;
    let levelIntroDuration = 90; // frames

    // ═══════════════════════════════════════════════════════════════
    //  LEVEL LOADING
    // ═══════════════════════════════════════════════════════════════

    function loadLevel(idx) {
        if (idx >= LEVELS.length) {
            // Safety fallback – boss fight is the real finale (see completeLevel).
            // If we somehow get here, just wrap back to level 0.
            idx = 0;
            score = 0; lives = 3;
            hudLives.textContent = '\u2665\u2665\u2665';
            hudScore.textContent = '0';
        }

        levelData = LEVELS[idx];
        currentLevel = idx;
        tileGrid = levelData.tiles.map(row => row.split(''));

        const gr = levelData.groundRow || 12;
        player.x = 48;
        player.y = gr * TILE - PLAYER_H;
        player.vx = 0;
        player.vy = 0;
        player.onGround = true;
        player.facing = 1;
        player.invincible = 0;
        player.frame = 0;
        player.walkTimer = 0;

        camX = 0;
        inventory = [];
        collectedIds = new Set();
        activeBridges = [];
        doorsOpen = false;
        puzzleSolved = false;
        puzzleActive = false;
        selectedSlot = -1;
        slotValues = [];
        usedBlockIndices = new Set();
        particles.length = 0;

        hudLevel.textContent = 'Level ' + (idx + 1) + ': ' + levelData.name;
        levelIntroTimer = levelIntroDuration;
        state = 'levelIntro';
        startBgm();
    }

    // ═══════════════════════════════════════════════════════════════
    //  TILE COLLISION
    // ═══════════════════════════════════════════════════════════════

    function isSolid(gx, gy) {
        if (gy < 0 || gy >= tileGrid.length) return gy >= tileGrid.length;
        if (gx < 0 || gx >= (tileGrid[0] || []).length) return false;
        return tileGrid[gy][gx] === '#';
    }

    function isPlatform(gx, gy) {
        if (gy < 0 || gy >= tileGrid.length) return false;
        if (gx < 0 || gx >= (tileGrid[0] || []).length) return false;
        return tileGrid[gy][gx] === '-';
    }

    function isDoor(px, py, w, h) {
        if (doorsOpen) return false;
        for (const d of (levelData.doors || [])) {
            const dx = d.x * TILE, dy = d.y * TILE, dw = TILE, dh = (d.h || 1) * TILE;
            if (px + w > dx && px < dx + dw && py + h > dy && py < dy + dh) return true;
        }
        return false;
    }

    function collidesWorld(px, py, pw, ph) {
        const gxMin = Math.floor(px / TILE);
        const gxMax = Math.floor((px + pw - 1) / TILE);
        const gyMin = Math.floor(py / TILE);
        const gyMax = Math.floor((py + ph - 1) / TILE);
        for (let gy = gyMin; gy <= gyMax; gy++) {
            for (let gx = gxMin; gx <= gxMax; gx++) {
                if (isSolid(gx, gy)) return true;
            }
        }
        if (isDoor(px, py, pw, ph)) return true;
        return false;
    }

    // ═══════════════════════════════════════════════════════════════
    //  PLAYER UPDATE
    // ═══════════════════════════════════════════════════════════════

    function updatePlayer() {
        if (state !== 'playing' && state !== 'boss') return;

        // Ducking
        player.ducking = player.onGround && (keys['ArrowDown'] || keys['KeyS']);

        // Horizontal — slower while ducking
        let moveX = 0;
        if (keys['ArrowLeft']  || keys['KeyA']) { moveX = player.ducking ? -MOVE_SPEED * 0.4 : -MOVE_SPEED; player.facing = -1; }
        if (keys['ArrowRight'] || keys['KeyD']) { moveX = player.ducking ? MOVE_SPEED * 0.4 : MOVE_SPEED; player.facing =  1; }

        // Jump — variable height: hold for higher (no jumping while ducking)
        if (!player.ducking && (justPressed['Space'] || justPressed['ArrowUp'] || justPressed['KeyW']) && player.onGround) {
            player.vy = JUMP_FORCE;
            player.onGround = false;
            sfxJump();
        }
        // Cut jump short on release for variable height
        if (!(keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.vy < -3) {
            player.vy *= 0.65;
        }

        // Gravity
        player.vy += GRAVITY;
        if (player.vy > 12) player.vy = 12;

        // Move X
        player.x += moveX;
        if (player.x < 0) player.x = 0;
        // Clamp to right edge of map
        var mapWidth = (tileGrid[0] || []).length * TILE;
        if (player.x + PLAYER_W > mapWidth) player.x = mapWidth - PLAYER_W;
        if (collidesWorld(player.x, player.y, PLAYER_W, PLAYER_H)) {
            player.x -= moveX;
        }

        // Move Y
        const prevY = player.y;
        player.y += player.vy;
        player.onGround = false;

        if (player.vy >= 0) {
            // Falling
            const gyFeet = Math.floor((player.y + PLAYER_H) / TILE);
            const gxL = Math.floor(player.x / TILE);
            const gxR = Math.floor((player.x + PLAYER_W - 1) / TILE);
            for (let gx = gxL; gx <= gxR; gx++) {
                if (isSolid(gx, gyFeet)) {
                    player.y = gyFeet * TILE - PLAYER_H;
                    player.vy = 0;
                    player.onGround = true;
                    break;
                }
                if (isPlatform(gx, gyFeet) && prevY + PLAYER_H <= gyFeet * TILE + 2) {
                    player.y = gyFeet * TILE - PLAYER_H;
                    player.vy = 0;
                    player.onGround = true;
                    break;
                }
            }
            // Bridge
            if (!player.onGround) {
                for (const b of activeBridges) {
                    const bx = b.x * TILE, by = b.y * TILE, bw = b.w * TILE;
                    if (player.x + PLAYER_W > bx && player.x < bx + bw &&
                        player.y + PLAYER_H >= by && prevY + PLAYER_H <= by + 4) {
                        player.y = by - PLAYER_H;
                        player.vy = 0;
                        player.onGround = true;
                        break;
                    }
                }
            }
        } else {
            // Rising — head collision
            if (collidesWorld(player.x, player.y, PLAYER_W, PLAYER_H)) {
                player.y = prevY;
                player.vy = 0;
            }
        }

        // Void
        if (player.y > tileGrid.length * TILE + 60) {
            if (state === 'boss') {
                // Boss arena void — respawn on arena ground
                player.x = 64;
                player.y = bossGroundY - PLAYER_H;
                player.vy = 0;
                player.onGround = true;
                bossPlayerHP -= 15;
                player.invincible = 45;
                if (bossPlayerHP <= 0) { bossPlayerHP = 0; lives = 0; gameOver(); return; }
            } else {
                hurtPlayer();
                if (state === 'playing') {
                    const gr = levelData.groundRow || 12;
                    player.x = 48;
                    player.y = gr * TILE - PLAYER_H;
                    player.vy = 0;
                }
            }
        }

        if (player.invincible > 0) player.invincible--;

        // Walk animation
        if (Math.abs(moveX) > 0 && player.onGround) {
            player.walkTimer++;
            if (player.walkTimer > 5) { player.walkTimer = 0; player.frame = (player.frame + 1) % 4; }
        } else if (!player.onGround) {
            player.frame = 1;
        } else {
            player.frame = 0;
            player.walkTimer = 0;
        }

        // Camera
        const playerScreenX = player.x - camX;
        if (playerScreenX > CANVAS_W - SCROLL_THRESHOLD) camX = player.x - (CANVAS_W - SCROLL_THRESHOLD);
        if (playerScreenX < SCROLL_THRESHOLD) camX = player.x - SCROLL_THRESHOLD;
        if (camX < 0) camX = 0;
        const maxCam = (tileGrid[0] || []).length * TILE - CANVAS_W;
        if (maxCam > 0 && camX > maxCam) camX = maxCam;
    }

    // ─── Collision checks ──────────────────────────────────────────

    function checkPickups() {
        if (!levelData) return;
        for (const p of levelData.pickups) {
            if (collectedIds.has(p.id)) continue;
            const px = p.x * TILE, py = p.y * TILE;
            if (player.x + PLAYER_W > px + 4 && player.x < px + TILE - 4 &&
                player.y + PLAYER_H > py + 4 && player.y < py + TILE - 4) {
                collectedIds.add(p.id);
                inventory.push(p.label);
                score += 50;
                sfxPickup();
                spawnParticles(px + TILE / 2, py + TILE / 2, COL.pickup, 10, 5);
            }
        }
        hudBlocks.textContent = inventory.length;
        hudScore.textContent = score;
    }

    function checkHazards() {
        if (!levelData || player.invincible > 0) return;
        for (const h of levelData.hazards) {
            const hx = h.x * TILE + 4, hy = h.y * TILE + 4;
            const hw = (h.w || 1) * TILE - 8, hh = (h.h || 1) * TILE - 8;
            if (player.x + PLAYER_W > hx && player.x < hx + hw &&
                player.y + PLAYER_H > hy && player.y < hy + hh) {
                hurtPlayer();
                return;
            }
        }
    }

    function checkPuzzleTriggers() {
        if (!levelData || puzzleSolved || puzzleActive) return;
        for (const t of levelData.puzzleTriggers) {
            const tx = t.x * TILE;
            const ty = t.y * TILE;
            const cx = player.x + PLAYER_W / 2;
            const cy = player.y + PLAYER_H / 2;
            // Wide detection — 2.5 tiles horizontal, 3 tiles vertical
            const nearX = Math.abs(cx - (tx + TILE / 2)) < TILE * 2.5;
            const nearY = Math.abs(cy - (ty + TILE / 2)) < TILE * 3;
            if (nearX && nearY) {
                if (justPressed['KeyE'] || justPressed['Enter']) {
                    openPuzzle();
                    return;
                }
            }
        }
    }

    function checkDoorExit() {
        if (!levelData || !puzzleSolved) return;
        // Check proximity to the door
        var d = (levelData.doors || [])[0];
        if (!d) return;
        var dx = d.x * TILE, dy = d.y * TILE;
        if (Math.abs(player.x + PLAYER_W / 2 - dx - TILE / 2) < TILE * 1.5 &&
            Math.abs(player.y + PLAYER_H / 2 - dy - TILE / 2) < TILE * 2) {
            startDoorTransition();
        }
    }

    function startDoorTransition() {
        state = 'doorTransition';
        doorTransitionTimer = 0;
        doorPhase = 'walk';
        // Target = the door position
        var d = (levelData.doors || [])[0];
        if (d) {
            doorTargetX = d.x * TILE;
        }
    }

    function updateDoorTransition() {
        doorTransitionTimer++;
        if (doorPhase === 'walk') {
            // Walk towards the door centre
            var targetCX = doorTargetX + TILE / 2 - PLAYER_W / 2;
            player.x += (targetCX - player.x) * 0.15;
            player.facing = (targetCX > player.x) ? 1 : -1;
            if (Math.abs(player.x - targetCX) < 2) {
                player.x = targetCX;
                doorPhase = 'enter';
                doorTransitionTimer = 0;
                doorsOpen = true;
            }
        } else if (doorPhase === 'enter') {
            // Player shrinks and fades into the open door
            if (doorTransitionTimer >= 25) {
                doorPhase = 'close';
                doorTransitionTimer = 0;
                doorsOpen = false; // Close the door
            }
        } else if (doorPhase === 'close') {
            // Brief pause with closed door, then advance
            if (doorTransitionTimer >= 15) {
                completeLevel();
            }
        }
    }

    function updateLevelIntro() {
        levelIntroTimer--;
        if (levelIntroTimer <= 0) {
            state = 'playing';
        }
    }

    function hurtPlayer() {
        if (player.invincible > 0) return;
        lives--;
        player.invincible = 90;
        sfxHurt();
        spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#ff4444', 10, 6);
        hudLives.textContent = '\u2665'.repeat(Math.max(0, lives));
        if (lives <= 0) gameOver();
    }

    function completeLevel() {
        score += 200;
        hudScore.textContent = score;
        stopBgm();
        var isLastLevel = (currentLevel + 1 >= LEVELS.length);
        if (isLastLevel) {
            // Show the level-complete trophy first, then offer Bonus Round
            sfxLevelComplete();
            state = 'levelComplete';
            lcConcept.textContent = '\u2605 SysML v2 MASTER \u2605';
            lcExplain.textContent = 'Congratulations! You\u2019ve mastered the core SysML v2 modelling concepts: ' +
                'parts & ports, actions & flows, requirements traceability, and behaviour allocation. ' +
                'These are the building blocks of systems engineering with SysML v2.';
            sfxVictory();
            drawVictoryTrophy();
            nextBtn.textContent = 'BONUS ROUND \u2694';
            var startOverBtn = document.getElementById('lc-startover-btn');
            if (startOverBtn) startOverBtn.style.display = 'none';
            lcOverlay.classList.add('show');
        } else {
            sfxLevelComplete();
            // Auto-advance to next level
            loadLevel(currentLevel + 1);
        }
        if (vscode) {
            vscode.postMessage({ type: 'levelComplete', level: currentLevel + 1, concept: levelData.concept });
        }
    }

    function gameOver() {
        var wasBoss = (state === 'boss');
        state = 'gameOver';
        stopBgm();
        stopBossBgm();
        sfxGameOver();
        goScore.textContent = 'Score: ' + score;

        // Show/hide boss-specific buttons
        var retryBossBtn = document.getElementById('retry-boss-btn');
        var startOverBtn2 = document.getElementById('go-startover-btn');
        if (retryBossBtn) retryBossBtn.style.display = wasBoss ? 'inline-block' : 'none';
        if (startOverBtn2) startOverBtn2.style.display = wasBoss ? 'inline-block' : 'none';
        retryBtn.style.display = wasBoss ? 'none' : 'inline-block';

        goOverlay.classList.add('show');
    }

    // ═══════════════════════════════════════════════════════════════
    //  BOSS FIGHT — "The Model Monster"
    //
    //  A giant monster on the right hurls SysML keywords & syntax
    //  at the player.  Dodge by jumping!  Survive long enough to
    //  defeat it.  Difficulty ramps up over time.
    // ═══════════════════════════════════════════════════════════════

    function startBossFight() {
        state = 'boss';
        bossGroundY = 12 * TILE;  // ground at row 12

        // Build a simple flat arena tile grid
        var arenaWidth = 30;
        tileGrid = [];
        for (var r = 0; r < 14; r++) {
            var row = '';
            for (var c = 0; c < arenaWidth; c++) {
                row += (r >= 12) ? '#' : '.';
            }
            tileGrid.push(row.split(''));
        }
        // Ensure levelData exists for drawing routines
        levelData = {
            name: 'BOSS FIGHT', concept: 'Defeat the Model Monster!',
            groundRow: 12, bgColor: '#0a0a1e',
            tiles: tileGrid.map(function(r){ return r.join(''); }),
            pickups: [], hazards: [], puzzleTriggers: [],
            bridges: [], doors: [], puzzle: null,
        };

        // Position player on the left
        player.x = 64;
        player.y = bossGroundY - PLAYER_H;
        player.vx = 0; player.vy = 0;
        player.onGround = true; player.facing = 1;
        player.invincible = 0;
        camX = 0;

        // Reset boss
        boss.x = arenaWidth * TILE - boss.w - 20;
        boss.y = bossGroundY - boss.h;
        boss.hp = boss.maxHp;
        boss.phase = 0; // intro
        boss.timer = 0;
        boss.survivalTimer = 0;
        boss.fireTimer = 0;
        boss.fireRate = 55;
        boss.mouthOpen = 0;
        boss.eyeGlow = 0;
        boss.deathTimer = 0;
        boss.bobOffset = 0;

        bossProjectiles = [];
        bossPlayerHP = bossMaxHP;
        bossScoreTimer = 0;
        particles.length = 0;
        doorsOpen = false;
        puzzleSolved = false;

        hudLevel.textContent = 'BOSS: The Model Monster';

        // Reset score for boss round
        score = 0;
        hudScore.textContent = '0';

        startBossBgm();
    }

    function startBossBgm() {
        if (bossBgmInterval) return;
        var bassNotes = [110, 117, 131, 117, 110, 104, 98, 104];
        var beat = 0;
        bossBgmInterval = setInterval(function() {
            playTone(bassNotes[beat % bassNotes.length], 0.15, 'sawtooth', 0.06);
            if (beat % 2 === 0) playTone(220, 0.06, 'square', 0.04);
            if (beat % 4 === 0) playTone(55, 0.2, 'triangle', 0.05);
            beat++;
        }, 160);
    }

    function stopBossBgm() {
        if (bossBgmInterval) { clearInterval(bossBgmInterval); bossBgmInterval = null; }
    }

    function sfxBossRoar() {
        playTone(80, 0.3, 'sawtooth', 0.4);
        setTimeout(function(){ playTone(60, 0.4, 'sawtooth', 0.35); }, 100);
        setTimeout(function(){ playTone(45, 0.5, 'sawtooth', 0.3); }, 250);
    }

    function sfxBossFire() {
        playTone(300, 0.08, 'square', 0.2);
        playTone(200, 0.1, 'sawtooth', 0.15);
    }

    function sfxBossDeath() {
        var notes = [200, 180, 160, 140, 120, 100, 80, 60];
        notes.forEach(function(n, i) {
            setTimeout(function(){ playTone(n, 0.3, 'sawtooth', 0.3); }, i * 120);
        });
    }

    function sfxStomp() {
        playTone(350, 0.06, 'square', 0.35);
        playTone(180, 0.10, 'sawtooth', 0.30);
        playTone(90,  0.14, 'triangle', 0.20);
    }

    function fireBossProjectile() {
        // Mix in user-defined identifiers from the active document (~30% chance)
        var pool;
        if (documentWords.length > 0 && Math.random() < 0.3) {
            pool = documentWords;
        } else {
            pool = Math.random() < 0.6 ? SYSML_KEYWORDS : SYSML_SYNTAX;
        }
        var word = pool[Math.floor(Math.random() * pool.length)];

        // Determine speed and pattern based on survival time
        var progress = Math.min(boss.survivalTimer / boss.survivalTarget, 1);
        var baseSpeed = 2.5 + progress * 3.5; // 2.5 → 6 px/frame
        var speed = baseSpeed + Math.random() * 1.5;

        // Vertical position: mix of ground-level and jump-height
        var yVariants = [
            bossGroundY - PLAYER_H - 2,                    // ground level
            bossGroundY - PLAYER_H - 20,                   // low jump
            bossGroundY - PLAYER_H - 45,                   // mid jump
            bossGroundY - PLAYER_H + 5,                    // at feet
        ];
        // As difficulty rises, add wavy projectiles
        var wavy = progress > 0.4 && Math.random() < progress * 0.5;

        bossProjectiles.push({
            x: boss.x - 10,
            y: yVariants[Math.floor(Math.random() * yVariants.length)],
            vx: -speed,
            vy: 0,
            word: word,
            wavy: wavy,
            wavPhase: Math.random() * Math.PI * 2,
            wavAmp: 1.5 + Math.random() * 2,
            life: 300,
            color: Math.random() < 0.3 ? '#ff6644' : (Math.random() < 0.5 ? '#ffcc00' : '#44ddff'),
        });

        boss.mouthOpen = 12;
        sfxBossFire();
    }

    function updateBoss() {
        boss.timer++;
        boss.bobOffset = Math.sin(boss.timer * 0.03) * 4;

        if (boss.phase === 0) {
            // Intro phase: monster appears with a roar
            if (boss.timer === 30) sfxBossRoar();
            boss.eyeGlow = Math.min(1, boss.timer / 60);
            if (boss.timer >= 90) {
                boss.phase = 1;
                boss.timer = 0;
            }
            return;
        }

        if (boss.phase === 2) {
            // Death animation
            boss.deathTimer++;
            boss.shakeX = (Math.random() - 0.5) * boss.deathTimer * 0.3;
            boss.shakeY = (Math.random() - 0.5) * boss.deathTimer * 0.3;
            if (boss.deathTimer % 8 === 0) {
                spawnParticles(
                    boss.x + Math.random() * boss.w,
                    boss.y + Math.random() * boss.h,
                    '#ff4444', 6, 5
                );
            }
            if (boss.deathTimer >= 120) {
                boss.phase = 3;
                // Victory!
                showBossVictory();
            }
            updateParticles();
            return;
        }

        if (boss.phase === 3) return; // dead, waiting for overlay

        // ── Phase 1: Active fight ──
        boss.survivalTimer++;
        bossScoreTimer++;

        // Award survival points every second
        if (bossScoreTimer % 60 === 0) {
            score += 25;
            hudScore.textContent = score;
        }

        // Gradually increase fire rate
        var progress = Math.min(boss.survivalTimer / boss.survivalTarget, 1);
        boss.fireRate = Math.max(15, 55 - Math.floor(progress * 40));

        // Fire projectiles
        boss.fireTimer++;
        if (boss.fireTimer >= boss.fireRate) {
            boss.fireTimer = 0;
            fireBossProjectile();
            // After 50% progress, sometimes fire bursts
            if (progress > 0.5 && Math.random() < 0.3) {
                setTimeout(function(){ if (state === 'boss' && boss.phase === 1) fireBossProjectile(); }, 200);
            }
            if (progress > 0.75 && Math.random() < 0.2) {
                setTimeout(function(){ if (state === 'boss' && boss.phase === 1) fireBossProjectile(); }, 400);
            }
        }

        // Mouth animation
        if (boss.mouthOpen > 0) boss.mouthOpen--;

        // Eye glow pulses during fight
        boss.eyeGlow = 0.7 + 0.3 * Math.sin(boss.timer * 0.05);

        // Update projectiles
        for (var i = bossProjectiles.length - 1; i >= 0; i--) {
            var p = bossProjectiles[i];
            p.x += p.vx;
            if (p.wavy) {
                p.y += Math.sin(p.wavPhase) * p.wavAmp;
                p.wavPhase += 0.12;
            }
            p.life--;
            if (p.x < -200 || p.life <= 0) {
                bossProjectiles.splice(i, 1);
                continue;
            }

            // Collision with player (use reduced height when ducking)
            var pw = ctx.measureText ? 8 * p.word.length : 60;
            var ph = 16;
            var pHitH = player.ducking ? PLAYER_H * 0.55 : PLAYER_H;
            var pHitY = player.y + (PLAYER_H - pHitH); // top of hitbox shifts down when ducking
            if (player.x + PLAYER_W > p.x && player.x < p.x + pw &&
                pHitY + pHitH > p.y && pHitY < p.y + ph) {

                // Stomp check: player is falling and feet are near the top of the word
                var feetY = player.y + PLAYER_H;
                var stompZone = p.y + 6; // top portion of the projectile
                if (player.vy >= 0 && feetY <= stompZone) {
                    // STOMP — destroy the keyword!
                    sfxStomp();
                    player.vy = JUMP_FORCE * 0.6; // small bounce
                    score += 50;
                    hudScore.textContent = score;
                    // Crunch particles — word shatters
                    for (var ci = 0; ci < 10; ci++) {
                        spawnParticles(
                            p.x + Math.random() * pw,
                            p.y + Math.random() * ph,
                            '#ffcc00', 3, 4
                        );
                    }
                    bossProjectiles.splice(i, 1);
                    continue;
                }

                // Normal hit (not a stomp)
                if (player.invincible <= 0) {
                    bossPlayerHP -= 12 + Math.floor(progress * 8); // 12-20 damage
                    player.invincible = 45;
                    sfxHurt();
                    spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, p.color, 8, 5);
                    bossProjectiles.splice(i, 1);
                    if (bossPlayerHP <= 0) {
                        bossPlayerHP = 0;
                        lives = 0;
                        gameOver();
                        return;
                    }
                }
            }
        }

        // Player movement (reuse normal physics)
        updatePlayer();
        updateParticles();

        // Check if player survived long enough → boss defeated!
        if (boss.survivalTimer >= boss.survivalTarget) {
            boss.phase = 2;
            boss.deathTimer = 0;
            bossProjectiles = [];
            sfxBossDeath();
            score += 1000;
            hudScore.textContent = score;
        }
    }

    function showBossVictory() {
        state = 'levelComplete';
        stopBossBgm();
        sfxVictory();
        lcConcept.textContent = '\u2605\u2605 MODEL MONSTER DEFEATED \u2605\u2605';
        lcExplain.textContent = 'Incredible! You survived the onslaught of SysML keywords ' +
            'and defeated the Model Monster! You are a true SysML v2 Grand Master. ' +
            'Parts, ports, actions, flows, requirements, states — nothing can stop you!';
        drawDoubleTrophy();
        nextBtn.textContent = 'PLAY AGAIN';
        var startOverBtn = document.getElementById('lc-startover-btn');
        if (startOverBtn) startOverBtn.style.display = 'none';
        lcOverlay.classList.add('show');
    }

    // ─── Boss rendering ────────────────────────────────────────────

    function drawBoss() {
        var bx = Math.floor(boss.x + boss.shakeX - camX);
        var by = Math.floor(boss.y + boss.bobOffset + boss.shakeY);
        var bw = boss.w;
        var bh = boss.h;

        if (boss.phase === 0) {
            // Intro: fade in
            ctx.globalAlpha = Math.min(1, boss.timer / 60);
        }
        if (boss.phase === 2) {
            // Death: flash
            ctx.globalAlpha = (boss.deathTimer % 6 < 3) ? 1 : 0.3;
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(bx + bw / 2, bossGroundY, bw * 0.6, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── Body — dark menacing shape ──
        var bodyGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
        bodyGrad.addColorStop(0, '#2a0a2a');
        bodyGrad.addColorStop(0.5, '#4a1a3a');
        bodyGrad.addColorStop(1, '#1a0a1a');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(bx + 10, by);
        ctx.quadraticCurveTo(bx + bw / 2, by - 15, bx + bw - 10, by);
        ctx.lineTo(bx + bw, by + bh * 0.7);
        ctx.quadraticCurveTo(bx + bw / 2, by + bh + 10, bx, by + bh * 0.7);
        ctx.closePath();
        ctx.fill();

        // ── Horns ──
        ctx.fillStyle = '#5a2a4a';
        // Left horn
        ctx.beginPath();
        ctx.moveTo(bx + 12, by + 5);
        ctx.lineTo(bx + 2, by - 25);
        ctx.lineTo(bx + 22, by + 5);
        ctx.closePath();
        ctx.fill();
        // Right horn
        ctx.beginPath();
        ctx.moveTo(bx + bw - 12, by + 5);
        ctx.lineTo(bx + bw - 2, by - 25);
        ctx.lineTo(bx + bw - 22, by + 5);
        ctx.closePath();
        ctx.fill();

        // ── Eyes — glowing red ──
        var eyeY = by + 25;
        ctx.save();
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10 * boss.eyeGlow;
        ctx.fillStyle = 'rgba(255,0,0,' + boss.eyeGlow + ')';
        // Left eye
        ctx.beginPath();
        ctx.ellipse(bx + 22, eyeY, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Right eye
        ctx.beginPath();
        ctx.ellipse(bx + bw - 22, eyeY, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(bx + 19, eyeY, 2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + bw - 25, eyeY, 2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── Mouth ──
        var mouthY = by + 55;
        var mouthOpen = Math.min(boss.mouthOpen, 12);
        ctx.fillStyle = '#110011';
        ctx.beginPath();
        ctx.ellipse(bx + bw / 2, mouthY, 18, 6 + mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();
        // Teeth
        ctx.fillStyle = '#ccccaa';
        var teethCount = 6;
        for (var t = 0; t < teethCount; t++) {
            var tx = bx + bw / 2 - 14 + t * 5.5;
            // Top teeth
            ctx.fillRect(tx, mouthY - 5 - mouthOpen * 0.3, 4, 5);
            // Bottom teeth
            ctx.fillRect(tx, mouthY + mouthOpen * 0.3, 4, 5);
        }

        // ── Armor plates / texture ──
        ctx.strokeStyle = 'rgba(100,50,80,0.4)';
        ctx.lineWidth = 1;
        for (var a = 0; a < 5; a++) {
            ctx.beginPath();
            ctx.arc(bx + bw / 2, by + 40 + a * 12, 15 + a * 4, 0.3, Math.PI - 0.3);
            ctx.stroke();
        }

        // ── "MODEL" text on body (boss name plate) ──
        if (boss.phase === 1) {
            ctx.save();
            ctx.fillStyle = '#ff4488';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#ff0066';
            ctx.shadowBlur = 6;
            ctx.fillText('MODEL', bx + bw / 2, by + bh * 0.85);
            ctx.fillText('MONSTER', bx + bw / 2, by + bh * 0.85 + 12);
            ctx.restore();
        }

        ctx.globalAlpha = 1;
    }

    function drawBossProjectiles() {
        for (var i = 0; i < bossProjectiles.length; i++) {
            var p = bossProjectiles[i];
            var sx = Math.floor(p.x - camX);
            var sy = Math.floor(p.y);

            // Glow behind the word
            ctx.save();
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = p.color;
            ctx.font = 'bold 12px monospace';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.word, sx, sy + 8);
            ctx.restore();

            // Trail particles (sparse)
            if (frameTick % 4 === 0) {
                spawnParticles(p.x + 5, p.y + 8, p.color, 1, 2);
            }
        }
    }

    function drawBossHUD() {
        // Player health bar (left side)
        var hbX = 10, hbY = CANVAS_H - 30, hbW = 120, hbH = 14;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(hbX - 2, hbY - 2, hbW + 4, hbH + 4);
        ctx.fillStyle = '#333';
        ctx.fillRect(hbX, hbY, hbW, hbH);
        var hpRatio = bossPlayerHP / bossMaxHP;
        var hpColor = hpRatio > 0.5 ? '#44dd44' : (hpRatio > 0.25 ? '#ddaa00' : '#dd3333');
        ctx.fillStyle = hpColor;
        ctx.fillRect(hbX, hbY, hbW * hpRatio, hbH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HP ' + bossPlayerHP, hbX + hbW / 2, hbY + hbH / 2);

        // Survival timer (center top)
        var survived = Math.floor(boss.survivalTimer / 60);
        var target = Math.floor(boss.survivalTarget / 60);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('SURVIVE: ' + survived + 's / ' + target + 's', CANVAS_W / 2, 8);

        // Progress bar
        var prgX = CANVAS_W / 2 - 80, prgY = 26, prgW = 160, prgH = 6;
        ctx.fillStyle = '#333';
        ctx.fillRect(prgX, prgY, prgW, prgH);
        var prgRatio = Math.min(boss.survivalTimer / boss.survivalTarget, 1);
        var prgGrad = ctx.createLinearGradient(prgX, 0, prgX + prgW, 0);
        prgGrad.addColorStop(0, '#ff4444');
        prgGrad.addColorStop(0.5, '#ffaa00');
        prgGrad.addColorStop(1, '#44ff44');
        ctx.fillStyle = prgGrad;
        ctx.fillRect(prgX, prgY, prgW * prgRatio, prgH);

        // Difficulty label
        var diffLabel = prgRatio < 0.25 ? 'EASY' : (prgRatio < 0.5 ? 'MEDIUM' : (prgRatio < 0.75 ? 'HARD' : 'INSANE'));
        var diffColor = prgRatio < 0.25 ? '#44ff44' : (prgRatio < 0.5 ? '#ffaa00' : (prgRatio < 0.75 ? '#ff6644' : '#ff2222'));
        ctx.fillStyle = diffColor;
        ctx.font = 'bold 9px monospace';
        ctx.fillText(diffLabel, CANVAS_W / 2, prgY + prgH + 3);

        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }

    function drawBossIntro() {
        if (boss.phase !== 0) return;
        var t = boss.timer / 90; // 0 → 1
        ctx.save();
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, CANVAS_H / 2 - 35, CANVAS_W, 70);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.fillText('⚠ BOSS FIGHT ⚠', CANVAS_W / 2, CANVAS_H / 2 - 10);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffcc00';
        ctx.font = '12px monospace';
        ctx.fillText('Dodge the SysML keywords! Survive 60 seconds!', CANVAS_W / 2, CANVAS_H / 2 + 14);
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    //  PUZZLE SYSTEM
    // ═══════════════════════════════════════════════════════════════

    function openPuzzle() {
        if (!levelData.puzzle) return;
        puzzleActive = true;
        state = 'puzzle';
        selectedSlot = 0;
        slotValues = new Array(levelData.puzzle.slots.length).fill(null);
        usedBlockIndices = new Set();

        puzzleTitle.textContent = levelData.puzzle.title;
        puzzleHint.textContent = levelData.puzzle.hint;

        renderPuzzleUI();
        modelPanel.classList.add('open');
    }

    function closePuzzle() {
        puzzleActive = false;
        state = 'playing';
        modelPanel.classList.remove('open');
    }

    function renderPuzzleUI() {
        const puzzle = levelData.puzzle;

        // Slots
        puzzleSlots.innerHTML = '';
        puzzle.slots.forEach(function (slot, i) {
            const el = document.createElement('div');
            el.className = 'slot' + (i === selectedSlot ? ' selected' : '') + (slotValues[i] != null ? ' filled' : '');
            el.textContent = slotValues[i] != null ? puzzle.blocks[slotValues[i]] : slot.label;
            el.style.cursor = 'pointer';
            if (i === selectedSlot) {
                el.style.borderColor = '#ffcc00';
                el.style.boxShadow = '0 0 8px rgba(255,204,0,0.3)';
            }
            el.addEventListener('click', function () {
                if (slotValues[i] != null) {
                    usedBlockIndices.delete(slotValues[i]);
                    slotValues[i] = null;
                }
                selectedSlot = i;
                renderPuzzleUI();
            });
            puzzleSlots.appendChild(el);
        });

        // Blocks
        puzzleBlocks.innerHTML = '';
        puzzle.blocks.forEach(function (block, i) {
            const el = document.createElement('div');
            el.className = 'block-item' + (usedBlockIndices.has(i) ? ' used' : '');
            el.textContent = block;
            el.addEventListener('click', function () {
                if (usedBlockIndices.has(i) || selectedSlot < 0) return;
                if (slotValues[selectedSlot] != null) {
                    usedBlockIndices.delete(slotValues[selectedSlot]);
                }
                slotValues[selectedSlot] = i;
                usedBlockIndices.add(i);

                var placed = puzzle.blocks[i];
                var expected = puzzle.slots[selectedSlot].answer;
                if (placed === expected) sfxCorrect(); else sfxWrong();

                // Next empty slot
                var next = -1;
                for (var s = 0; s < slotValues.length; s++) {
                    if (slotValues[s] == null) { next = s; break; }
                }
                selectedSlot = next >= 0 ? next : selectedSlot;

                if (slotValues.every(function (v) { return v != null; })) checkPuzzleSolution();
                renderPuzzleUI();
            });
            puzzleBlocks.appendChild(el);
        });
    }

    function checkPuzzleSolution() {
        const puzzle = levelData.puzzle;
        let allCorrect = true;
        const slotEls = puzzleSlots.querySelectorAll('.slot');

        for (let i = 0; i < puzzle.slots.length; i++) {
            const placed = puzzle.blocks[slotValues[i]];
            const expected = puzzle.slots[i].answer;
            if (placed === expected) {
                slotEls[i].classList.add('correct');
            } else {
                slotEls[i].classList.add('wrong');
                allCorrect = false;
            }
        }

        if (allCorrect) {
            puzzleSolved = true;
            score += 300;
            hudScore.textContent = score;
            sfxPuzzleSolved();
            for (const b of (levelData.bridges || [])) activeBridges.push(Object.assign({}, b));
            doorsOpen = true;
            setTimeout(function () {
                closePuzzle();
                spawnParticles(player.x + PLAYER_W / 2, player.y, '#00ff88', 15, 8);
            }, 800);
        } else {
            sfxWrong();
            setTimeout(function () {
                slotValues = new Array(puzzle.slots.length).fill(null);
                usedBlockIndices = new Set();
                selectedSlot = 0;
                renderPuzzleUI();
            }, 600);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  VICTORY TROPHY
    // ═══════════════════════════════════════════════════════════════

    function drawVictoryTrophy() {
        var tc = document.getElementById('trophy-canvas');
        if (!tc) return;
        tc.style.display = 'block';
        var t = tc.getContext('2d');
        tc.width = 120;
        tc.height = 140;
        t.clearRect(0, 0, 120, 140);

        var cx = 60, cupTop = 10;

        // Glow behind trophy
        var glow = t.createRadialGradient(cx, 65, 10, cx, 65, 60);
        glow.addColorStop(0, 'rgba(255,215,0,0.4)');
        glow.addColorStop(1, 'rgba(255,215,0,0)');
        t.fillStyle = glow;
        t.fillRect(0, 0, 120, 140);

        // ── Cup body ──
        var cupGrad = t.createLinearGradient(cx - 28, 0, cx + 28, 0);
        cupGrad.addColorStop(0, '#b8860b');
        cupGrad.addColorStop(0.3, '#ffd700');
        cupGrad.addColorStop(0.5, '#fff8dc');
        cupGrad.addColorStop(0.7, '#ffd700');
        cupGrad.addColorStop(1, '#b8860b');
        t.fillStyle = cupGrad;
        t.beginPath();
        t.moveTo(cx - 28, cupTop);
        t.lineTo(cx + 28, cupTop);
        t.quadraticCurveTo(cx + 30, cupTop + 50, cx + 15, cupTop + 60);
        t.lineTo(cx - 15, cupTop + 60);
        t.quadraticCurveTo(cx - 30, cupTop + 50, cx - 28, cupTop);
        t.closePath();
        t.fill();

        // Cup rim highlight
        t.strokeStyle = '#fff8dc';
        t.lineWidth = 2;
        t.beginPath();
        t.moveTo(cx - 28, cupTop + 2);
        t.lineTo(cx + 28, cupTop + 2);
        t.stroke();

        // ── Handles ──
        t.strokeStyle = '#daa520';
        t.lineWidth = 4;
        t.lineCap = 'round';
        // Left handle
        t.beginPath();
        t.moveTo(cx - 27, cupTop + 10);
        t.quadraticCurveTo(cx - 42, cupTop + 25, cx - 27, cupTop + 40);
        t.stroke();
        // Right handle
        t.beginPath();
        t.moveTo(cx + 27, cupTop + 10);
        t.quadraticCurveTo(cx + 42, cupTop + 25, cx + 27, cupTop + 40);
        t.stroke();

        // ── Star on cup ──
        t.fillStyle = '#fff8dc';
        drawStar(t, cx, cupTop + 30, 5, 8, 4);

        // ── Stem ──
        var stemGrad = t.createLinearGradient(cx - 5, 0, cx + 5, 0);
        stemGrad.addColorStop(0, '#b8860b');
        stemGrad.addColorStop(0.5, '#ffd700');
        stemGrad.addColorStop(1, '#b8860b');
        t.fillStyle = stemGrad;
        t.fillRect(cx - 5, cupTop + 60, 10, 20);

        // ── Base ──
        var baseGrad = t.createLinearGradient(cx - 22, 0, cx + 22, 0);
        baseGrad.addColorStop(0, '#b8860b');
        baseGrad.addColorStop(0.3, '#ffd700');
        baseGrad.addColorStop(0.5, '#fff8dc');
        baseGrad.addColorStop(0.7, '#ffd700');
        baseGrad.addColorStop(1, '#b8860b');
        t.fillStyle = baseGrad;
        t.beginPath();
        t.moveTo(cx - 15, cupTop + 80);
        t.lineTo(cx + 15, cupTop + 80);
        t.lineTo(cx + 22, cupTop + 88);
        t.lineTo(cx - 22, cupTop + 88);
        t.closePath();
        t.fill();

        // Base plate
        t.fillRect(cx - 25, cupTop + 88, 50, 5);
        // Bottom rim
        t.strokeStyle = '#fff8dc';
        t.lineWidth = 1;
        t.strokeRect(cx - 25, cupTop + 88, 50, 5);

        // ── Sparkle particles ──
        for (var s = 0; s < 8; s++) {
            var sx = cx + (Math.random() - 0.5) * 80;
            var sy = 10 + Math.random() * 90;
            t.fillStyle = 'rgba(255,255,200,' + (0.4 + Math.random() * 0.6) + ')';
            drawStar(t, sx, sy, 4, 3 + Math.random() * 2, 1);
        }
    }

    function drawDoubleTrophy() {
        var tc = document.getElementById('trophy-canvas');
        if (!tc) return;
        tc.style.display = 'block';
        var t = tc.getContext('2d');
        tc.width = 200;
        tc.height = 150;
        t.clearRect(0, 0, 200, 150);

        // Outer glow
        var glow = t.createRadialGradient(100, 70, 15, 100, 70, 90);
        glow.addColorStop(0, 'rgba(255,215,0,0.5)');
        glow.addColorStop(1, 'rgba(255,215,0,0)');
        t.fillStyle = glow;
        t.fillRect(0, 0, 200, 150);

        // Draw two trophies side by side
        var offsets = [55, 145];
        for (var oi = 0; oi < 2; oi++) {
            var cx = offsets[oi], cupTop = 12;
            var sc = 0.7; // scale factor

            // Cup body
            var cupGrad = t.createLinearGradient(cx - 20*sc, 0, cx + 20*sc, 0);
            cupGrad.addColorStop(0, '#b8860b');
            cupGrad.addColorStop(0.3, '#ffd700');
            cupGrad.addColorStop(0.5, '#fff8dc');
            cupGrad.addColorStop(0.7, '#ffd700');
            cupGrad.addColorStop(1, '#b8860b');
            t.fillStyle = cupGrad;
            t.beginPath();
            t.moveTo(cx - 20*sc, cupTop);
            t.lineTo(cx + 20*sc, cupTop);
            t.quadraticCurveTo(cx + 22*sc, cupTop + 36*sc, cx + 11*sc, cupTop + 43*sc);
            t.lineTo(cx - 11*sc, cupTop + 43*sc);
            t.quadraticCurveTo(cx - 22*sc, cupTop + 36*sc, cx - 20*sc, cupTop);
            t.closePath();
            t.fill();
            // Rim
            t.strokeStyle = '#fff8dc';
            t.lineWidth = 1.5;
            t.beginPath();
            t.moveTo(cx - 20*sc, cupTop + 2);
            t.lineTo(cx + 20*sc, cupTop + 2);
            t.stroke();
            // Handles
            t.strokeStyle = '#daa520';
            t.lineWidth = 3;
            t.lineCap = 'round';
            t.beginPath();
            t.moveTo(cx - 19*sc, cupTop + 8*sc);
            t.quadraticCurveTo(cx - 30*sc, cupTop + 18*sc, cx - 19*sc, cupTop + 29*sc);
            t.stroke();
            t.beginPath();
            t.moveTo(cx + 19*sc, cupTop + 8*sc);
            t.quadraticCurveTo(cx + 30*sc, cupTop + 18*sc, cx + 19*sc, cupTop + 29*sc);
            t.stroke();
            // Star
            t.fillStyle = '#fff8dc';
            drawStar(t, cx, cupTop + 22*sc, 5, 6*sc, 3*sc);
            // Stem
            var stemGrad = t.createLinearGradient(cx - 4*sc, 0, cx + 4*sc, 0);
            stemGrad.addColorStop(0, '#b8860b');
            stemGrad.addColorStop(0.5, '#ffd700');
            stemGrad.addColorStop(1, '#b8860b');
            t.fillStyle = stemGrad;
            t.fillRect(cx - 4*sc, cupTop + 43*sc, 8*sc, 14*sc);
            // Base
            var baseGrad = t.createLinearGradient(cx - 16*sc, 0, cx + 16*sc, 0);
            baseGrad.addColorStop(0, '#b8860b');
            baseGrad.addColorStop(0.3, '#ffd700');
            baseGrad.addColorStop(0.5, '#fff8dc');
            baseGrad.addColorStop(0.7, '#ffd700');
            baseGrad.addColorStop(1, '#b8860b');
            t.fillStyle = baseGrad;
            t.beginPath();
            t.moveTo(cx - 11*sc, cupTop + 57*sc);
            t.lineTo(cx + 11*sc, cupTop + 57*sc);
            t.lineTo(cx + 16*sc, cupTop + 63*sc);
            t.lineTo(cx - 16*sc, cupTop + 63*sc);
            t.closePath();
            t.fill();
            t.fillRect(cx - 18*sc, cupTop + 63*sc, 36*sc, 4*sc);
        }

        // Crown / ribbon between the two trophies
        t.fillStyle = '#ff4444';
        t.font = 'bold 16px monospace';
        t.textAlign = 'center';
        t.fillText('\u265B', 100, 85); // chess queen symbol
        t.fillStyle = '#ffcc00';
        t.font = 'bold 10px monospace';
        t.fillText('GRAND MASTER', 100, 100);

        // Extra sparkles
        for (var s2 = 0; s2 < 14; s2++) {
            var sx2 = 10 + Math.random() * 180;
            var sy2 = 5 + Math.random() * 105;
            t.fillStyle = 'rgba(255,255,200,' + (0.3 + Math.random() * 0.7) + ')';
            drawStar(t, sx2, sy2, 4, 2 + Math.random() * 2, 0.8);
        }
    }

    function drawStar(ctx2, cx2, cy2, points, outerR, innerR) {
        ctx2.beginPath();
        for (var i = 0; i < points * 2; i++) {
            var r = (i % 2 === 0) ? outerR : innerR;
            var angle = (Math.PI * i) / points - Math.PI / 2;
            var x = cx2 + r * Math.cos(angle);
            var y = cy2 + r * Math.sin(angle);
            if (i === 0) ctx2.moveTo(x, y);
            else ctx2.lineTo(x, y);
        }
        ctx2.closePath();
        ctx2.fill();
    }

    // ═══════════════════════════════════════════════════════════════
    //  RENDERING — caped crusader graphics
    // ═══════════════════════════════════════════════════════════════

    let skyGrad = null;
    function ensureSkyGrad() {
        if (skyGrad) return;
        skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        skyGrad.addColorStop(0, COL.skyTop);
        skyGrad.addColorStop(0.6, COL.skyBot);
        skyGrad.addColorStop(1, '#152a40');
    }

    function drawRoundedRect(x, y, w, h, r) {
        if (w <= 0 || h <= 0) return;
        r = Math.min(r, w / 2, h / 2);
        if (r < 0) r = 0;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.fill();
    }

    function drawBackground() {
        ensureSkyGrad();
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Stars
        for (const s of stars) {
            s.twinkle += 0.025;
            const alpha = 0.3 + 0.5 * Math.sin(s.twinkle);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = COL.star;
            const sx = ((s.x - camX * s.speed) % 2000 + 2000) % 2000;
            if (sx < CANVAS_W + 4) {
                ctx.fillRect(Math.floor(sx), Math.floor(s.y), s.size, s.size);
            }
        }
        ctx.globalAlpha = 1;

        // Clouds
        for (const c of clouds) {
            const cx = ((c.x - camX * c.speed) % 2200 + 2200) % 2200;
            if (cx > -100 && cx < CANVAS_W + 100) {
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = COL.cloud;
                drawRoundedRect(cx, c.y, c.w, c.h, c.h / 2);
                drawRoundedRect(cx + c.w * 0.2, c.y - c.h * 0.4, c.w * 0.5, c.h * 0.8, c.h * 0.4);
                drawRoundedRect(cx + c.w * 0.5, c.y - c.h * 0.2, c.w * 0.35, c.h * 0.6, c.h * 0.3);
                ctx.globalAlpha = 1;
            }
        }

        // Hills
        const groundY = (levelData ? (levelData.groundRow || 12) : 12) * TILE;
        for (const h of hills) {
            const hx = ((h.x - camX * h.speed) % 2200 + 2200) % 2200;
            if (hx > -120 && hx < CANVAS_W + 120) {
                ctx.fillStyle = COL.hill;
                ctx.beginPath();
                ctx.arc(hx, groundY, h.r, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = COL.hillLight;
                ctx.beginPath();
                ctx.arc(hx - h.r * 0.15, groundY, h.r * 0.85, Math.PI, Math.PI * 1.7);
                ctx.fill();
            }
        }

        // Bushes
        for (const b of bushes) {
            const bx = ((b.x - camX * b.speed) % 2600 + 2600) % 2600;
            if (bx > -60 && bx < CANVAS_W + 60) {
                ctx.fillStyle = COL.bush;
                drawRoundedRect(bx, groundY - b.h - 1, b.w, b.h + 2, b.h / 2);
                ctx.fillStyle = COL.bushLight;
                drawRoundedRect(bx + b.w * 0.15, groundY - b.h - 3, b.w * 0.5, b.h * 0.6, b.h * 0.3);
            }
        }
    }

    function drawTiles() {
        const startCol = Math.floor(camX / TILE);
        const endCol = startCol + Math.ceil(CANVAS_W / TILE) + 1;
        for (let gy = 0; gy < tileGrid.length; gy++) {
            for (let gx = startCol; gx <= endCol; gx++) {
                const ch = (tileGrid[gy] || [])[gx];
                if (!ch || ch === '.') continue;
                const sx = gx * TILE - Math.floor(camX);
                const sy = gy * TILE;

                if (ch === '#') {
                    const isTop = !isSolid(gx, gy - 1);
                    if (isTop) {
                        // Grass layer
                        ctx.fillStyle = COL.groundTop;
                        ctx.fillRect(sx, sy, TILE, TILE);
                        ctx.fillStyle = COL.groundMid;
                        ctx.fillRect(sx, sy, TILE, 4);
                        // Grass tufts
                        ctx.fillStyle = '#8ad454';
                        for (let t = 0; t < 4; t++) {
                            ctx.fillRect(sx + 2 + t * 8, sy - 2, 3, 3);
                        }
                        // Subtle texture
                        ctx.fillStyle = 'rgba(0,0,0,0.06)';
                        ctx.fillRect(sx + 6, sy + 12, 6, 4);
                        ctx.fillRect(sx + 20, sy + 18, 4, 4);
                    } else {
                        // Underground
                        ctx.fillStyle = COL.ground;
                        ctx.fillRect(sx, sy, TILE, TILE);
                        ctx.fillStyle = COL.groundDark;
                        ctx.fillRect(sx + 4, sy + 6, 3, 3);
                        ctx.fillRect(sx + 18, sy + 14, 4, 3);
                        ctx.fillRect(sx + 10, sy + 24, 3, 2);
                        ctx.fillRect(sx + 24, sy + 4, 2, 3);
                    }
                } else if (ch === '-') {
                    // Platform — brick style
                    ctx.fillStyle = COL.platform;
                    ctx.fillRect(sx, sy, TILE, 8);
                    ctx.fillStyle = COL.platTop;
                    ctx.fillRect(sx, sy, TILE, 3);
                    ctx.fillStyle = COL.platShade;
                    ctx.fillRect(sx, sy + 7, TILE, 1);
                    ctx.fillStyle = 'rgba(0,0,0,0.12)';
                    ctx.fillRect(sx + TILE / 2, sy + 3, 1, 4);
                }
            }
        }
    }

    function drawBridges() {
        for (const b of activeBridges) {
            for (let i = 0; i < b.w; i++) {
                const sx = (b.x + i) * TILE - Math.floor(camX);
                const sy = b.y * TILE;
                ctx.fillStyle = COL.bridge;
                ctx.fillRect(sx, sy, TILE, 10);
                ctx.fillStyle = COL.bridgeTop;
                ctx.fillRect(sx, sy, TILE, 3);
                ctx.fillStyle = COL.bridgePlank;
                ctx.fillRect(sx + 2, sy + 4, TILE - 4, 2);
            }
        }
    }

    function drawDoors() {
        for (const d of (levelData.doors || [])) {
            const dx = d.x * TILE - Math.floor(camX);
            const dy = d.y * TILE;
            const dh = (d.h || 1) * TILE;

            if (doorsOpen) {
                // Open door: frame + dark interior
                ctx.fillStyle = '#664422';
                ctx.fillRect(dx, dy, 3, dh);
                ctx.fillRect(dx + TILE - 3, dy, 3, dh);
                ctx.fillRect(dx, dy, TILE, 3);
                ctx.fillStyle = '#111118';
                ctx.fillRect(dx + 3, dy + 3, TILE - 6, dh - 3);
                // Open door panel (swung inward, perspective effect)
                ctx.fillStyle = COL.door;
                ctx.globalAlpha = 0.5;
                ctx.fillRect(dx + TILE - 8, dy + 2, 5, dh - 2);
                ctx.globalAlpha = 1;
            } else if (puzzleSolved) {
                // Unlocked door — no lock icon, gentle glow
                var pulse = 0.7 + 0.3 * Math.sin(frameTick * 0.06);
                ctx.save();
                ctx.shadowColor = '#44ddff';
                ctx.shadowBlur = 8 * pulse;
                ctx.fillStyle = COL.door;
                drawRoundedRect(dx + 2, dy, TILE - 4, dh, 3);
                ctx.restore();
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(dx + 6, dy + 6, TILE - 16, dh / 2 - 8);
                ctx.fillRect(dx + 6, dy + dh / 2 + 2, TILE - 16, dh / 2 - 8);
                // Unlocked handle
                ctx.fillStyle = '#ccaa00';
                ctx.beginPath();
                ctx.arc(dx + TILE / 2 + 4, dy + dh / 2, 3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Closed & locked door
                ctx.fillStyle = COL.door;
                drawRoundedRect(dx + 2, dy, TILE - 4, dh, 3);
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(dx + 6, dy + 6, TILE - 16, dh / 2 - 8);
                ctx.fillRect(dx + 6, dy + dh / 2 + 2, TILE - 16, dh / 2 - 8);
                ctx.fillStyle = COL.doorLock;
                ctx.beginPath();
                ctx.arc(dx + TILE / 2, dy + dh / 2, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawHazards() {
        for (const h of levelData.hazards) {
            const hx = h.x * TILE - Math.floor(camX);
            const hy = h.y * TILE;
            const hw = (h.w || 1) * TILE;
            const hh = (h.h || 1) * TILE;

            ctx.fillStyle = COL.hazardBody;
            ctx.fillRect(hx + 2, hy + hh - 6, hw - 4, 6);

            var spikeW = 8;
            var count = Math.floor(hw / spikeW);
            for (let s = 0; s < count; s++) {
                const sx = hx + s * spikeW;
                const glow = 0.7 + 0.3 * Math.sin(Date.now() / 200 + s);
                ctx.fillStyle = 'rgba(238,34,34,' + glow + ')';
                ctx.beginPath();
                ctx.moveTo(sx + 1, hy + hh - 6);
                ctx.lineTo(sx + spikeW / 2, hy + 2);
                ctx.lineTo(sx + spikeW - 1, hy + hh - 6);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,150,150,0.5)';
                ctx.beginPath();
                ctx.moveTo(sx + 2, hy + hh - 8);
                ctx.lineTo(sx + spikeW / 2, hy + 5);
                ctx.lineTo(sx + spikeW / 2 + 1, hy + hh - 8);
                ctx.fill();
            }
        }
    }

    function drawPickups() {
        for (const p of levelData.pickups) {
            if (collectedIds.has(p.id)) continue;
            const px = p.x * TILE - Math.floor(camX);
            const bobY = Math.sin(frameTick * 0.06 + p.x) * 3;
            const py = p.y * TILE + bobY;

            // Glow
            ctx.fillStyle = COL.pickup;
            ctx.globalAlpha = 0.12 + 0.05 * Math.sin(frameTick * 0.08);
            ctx.beginPath();
            ctx.arc(px + TILE / 2, py + TILE / 2, TILE * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Block body rounded
            ctx.fillStyle = '#1c1c40';
            drawRoundedRect(px + 3, py + 3, TILE - 6, TILE - 6, 5);
            // Border
            ctx.strokeStyle = COL.pickup;
            ctx.lineWidth = 2;
            ctx.beginPath();
            var r = 5;
            var bx = px + 3, by = py + 3, bw = TILE - 6, bh = TILE - 6;
            ctx.moveTo(bx + r, by);
            ctx.lineTo(bx + bw - r, by);
            ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
            ctx.lineTo(bx + bw, by + bh - r);
            ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
            ctx.lineTo(bx + r, by + bh);
            ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
            ctx.lineTo(bx, by + r);
            ctx.arcTo(bx, by, bx + r, by, r);
            ctx.stroke();

            // Label – white text; paint a dark backdrop to hide the border where text overlaps
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var tw = ctx.measureText(p.label).width;
            var th = 10;  // approximate text height
            var cx = px + TILE / 2;
            var cy = py + TILE / 2;
            ctx.fillStyle = '#1c1c40';
            ctx.fillRect(cx - tw / 2 - 1, cy - th / 2, tw + 2, th);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(p.label, cx, cy);
        }
        ctx.textBaseline = 'alphabetic';
    }

    function drawPuzzleTriggers() {
        if (puzzleSolved) return;
        for (const t of (levelData.puzzleTriggers || [])) {
            const tx = t.x * TILE - Math.floor(camX);
            const ty = t.y * TILE;
            const pulse = 0.5 + 0.5 * Math.sin(frameTick * 0.08);

            // ? block — Mario style
            ctx.fillStyle = '#cc8800';
            drawRoundedRect(tx + 1, ty + 1, TILE - 2, TILE - 2, 4);
            ctx.fillStyle = '#ffbb22';
            drawRoundedRect(tx + 3, ty + 3, TILE - 6, TILE - 6, 3);

            // ? mark
            ctx.fillStyle = '#8B4513';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', tx + TILE / 2, ty + TILE / 2 + 1);

            // "Press E" floating label when near
            const dist = Math.abs(player.x + PLAYER_W / 2 - (t.x * TILE + TILE / 2));
            if (dist < TILE * 3) {
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px monospace';
                ctx.fillText('Press E', tx + TILE / 2, ty - 10 - pulse * 3);
                ctx.globalAlpha = 1;
            }
        }
        ctx.textBaseline = 'alphabetic';
    }

    // ─── Player rendering — Mario-like proportions ─────────────────
    function drawPlayer() {
        const sx = Math.floor(player.x - camX);
        const sy = Math.floor(player.y);

        if (player.invincible > 0 && Math.floor(player.invincible / 3) % 2 === 0) return;

        // Apply duck squash via canvas transform
        var isDuck = player.ducking;
        if (isDuck) {
            var duckScaleY = 0.55;
            var duckOffsetY = PLAYER_H * (1 - duckScaleY);
            ctx.save();
            ctx.translate(0, sy + duckOffsetY);
            ctx.scale(1, duckScaleY);
            ctx.translate(0, -sy);
        }

        const f = player.facing; // +1 = right, -1 = left
        var armSwing = player.onGround ? Math.sin(player.frame * Math.PI / 2) * 4 : -3;
        var legSwing = player.onGround ? Math.sin(player.frame * Math.PI / 2) * 3 : 2;

        // ── Centre x for side-on profile ──
        var cx = sx + PLAYER_W / 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, sy + PLAYER_H, PLAYER_W * 0.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── Rim-light glow for visibility ──
        ctx.save();
        ctx.shadowColor = COL.batOutline;
        ctx.shadowBlur = 8;

        // ── Cape (behind — flows opposite to facing) ──
        var capeWave = Math.sin(frameTick * 0.08) * 3;
        var capeWave2 = Math.sin(frameTick * 0.12 + 1) * 2;
        var cd = -f; // cape trails behind
        ctx.fillStyle = COL.cape;
        ctx.beginPath();
        ctx.moveTo(cx + cd * 1, sy + 4);
        ctx.quadraticCurveTo(
            cx + cd * 16 + capeWave,
            sy + 14 + capeWave2,
            cx + cd * 12 + capeWave * 1.5,
            sy + PLAYER_H + 5
        );
        ctx.lineTo(cx + cd * 4, sy + PLAYER_H + 2);
        ctx.lineTo(cx + cd * 1, sy + 10);
        ctx.closePath();
        ctx.fill();
        // Cape inner highlight
        ctx.fillStyle = COL.capeInner;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(cx + cd * 1, sy + 6);
        ctx.quadraticCurveTo(
            cx + cd * 11 + capeWave * 0.7,
            sy + 12 + capeWave2 * 0.5,
            cx + cd * 8 + capeWave,
            sy + PLAYER_H
        );
        ctx.lineTo(cx + cd * 2, sy + PLAYER_H - 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // ── Back arm (behind body) ──
        ctx.fillStyle = COL.player;
        drawRoundedRect(cx + f * -1, sy + 13 - armSwing, 4 * f, 9, 2);

        // ── Back leg (behind body) ──
        ctx.fillStyle = COL.playerShoe;
        drawRoundedRect(cx + f * (-2) + (f > 0 ? -legSwing : legSwing), sy + PLAYER_H - 6, 6, 6, 2);

        // ── Cowl — side profile ──
        ctx.fillStyle = COL.player;
        // Head shape (side-on oval)
        ctx.beginPath();
        ctx.ellipse(cx + f * 1, sy + 4, 8, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        // Single pointed bat ear (front, visible)
        ctx.beginPath();
        ctx.moveTo(cx + f * 2, sy - 1);
        ctx.lineTo(cx + f * 4, sy - 9);
        ctx.lineTo(cx + f * 6, sy);
        ctx.closePath();
        ctx.fill();
        // Slight hint of back ear
        ctx.beginPath();
        ctx.moveTo(cx - f * 1, sy - 1);
        ctx.lineTo(cx - f * 0, sy - 7);
        ctx.lineTo(cx - f * 3, sy + 1);
        ctx.closePath();
        ctx.fill();

        // ── Exposed jaw/chin (side profile) ──
        ctx.fillStyle = COL.playerSkin;
        ctx.beginPath();
        ctx.moveTo(cx + f * 3, sy + 5);
        ctx.lineTo(cx + f * 8, sy + 7);
        ctx.quadraticCurveTo(cx + f * 7, sy + 11, cx + f * 2, sy + 10);
        ctx.lineTo(cx - f * 1, sy + 8);
        ctx.closePath();
        ctx.fill();

        // ── Eye — single white glowing slit (side profile) ──
        ctx.fillStyle = '#ffffff';
        ctx.save();
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(cx + f * 3, sy + 4);
        ctx.lineTo(cx + f * 8, sy + 3);
        ctx.lineTo(cx + f * 8, sy + 6);
        ctx.lineTo(cx + f * 3, sy + 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // ── Body — side-on (narrow torso) ──
        ctx.fillStyle = COL.playerOverall;
        drawRoundedRect(cx - 5, sy + 11, 10, 12, 3);

        // ── Bat emblem on chest (visible side) ──
        ctx.fillStyle = COL.belt;
        ctx.beginPath();
        var bx = cx + f * 1;
        var by = sy + 15;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + f * 3, by - 1);
        ctx.lineTo(bx + f * 2, by + 0.5);
        ctx.lineTo(bx + f * 4, by + 1);
        ctx.lineTo(bx + f * 1, by + 1);
        ctx.lineTo(bx, by + 2);
        ctx.lineTo(bx - f * 1, by + 1);
        ctx.closePath();
        ctx.fill();

        // ── Utility belt ──
        ctx.fillStyle = COL.belt;
        ctx.fillRect(cx - 5, sy + 19, 10, 2);
        // Belt pouches
        ctx.fillStyle = '#aa8800';
        ctx.fillRect(cx + f * 1, sy + 19, 3, 3);
        ctx.fillRect(cx - f * 3, sy + 19, 3, 3);

        // ── Front arm (gauntlet) ──
        ctx.fillStyle = COL.player;
        drawRoundedRect(cx + f * 2, sy + 13 + armSwing, 5 * f, 9, 2);
        // Gauntlet fin/spike
        ctx.fillStyle = '#556688';
        ctx.beginPath();
        ctx.moveTo(cx + f * 4, sy + 15 + armSwing);
        ctx.lineTo(cx + f * 8, sy + 13 + armSwing);
        ctx.lineTo(cx + f * 4, sy + 17 + armSwing);
        ctx.closePath();
        ctx.fill();

        // ── Front leg & boot ──
        ctx.fillStyle = COL.playerShoe;
        drawRoundedRect(cx + f * (-1) + (f > 0 ? legSwing : -legSwing), sy + PLAYER_H - 6, 6, 6, 2);

        // ── Bright outline stroke around whole silhouette for visibility ──
        ctx.strokeStyle = COL.batOutline;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        // Body outline
        ctx.strokeRect(cx - 5, sy + 11, 10, 12);
        // Head outline
        ctx.beginPath();
        ctx.ellipse(cx + f * 1, sy + 4, 9, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore(); // end rim-light glow

        if (isDuck) {
            ctx.restore(); // end duck squash transform
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  MAIN DRAW
    // ═══════════════════════════════════════════════════════════════

    function draw() {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        if (state === 'title') {
            ensureSkyGrad();
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            for (const s of stars) {
                s.twinkle += 0.02;
                ctx.globalAlpha = 0.3 + 0.4 * Math.sin(s.twinkle);
                ctx.fillStyle = COL.star;
                ctx.fillRect(Math.floor(s.x % CANVAS_W), Math.floor(s.y), s.size, s.size);
            }
            ctx.globalAlpha = 1;
            return;
        }

        if (!levelData) return;

        drawBackground();
        drawTiles();
        drawBridges();
        drawDoors();
        drawHazards();
        drawPickups();
        drawPuzzleTriggers();

        // Draw player with transition effects
        if (state === 'doorTransition') {
            if (doorPhase === 'walk') {
                drawPlayer();
            } else if (doorPhase === 'enter') {
                // Shrink and fade into the open door
                var fadeT = doorTransitionTimer / 25; // 0->1
                ctx.globalAlpha = 1 - fadeT;
                ctx.save();
                var px = Math.floor(player.x - camX) + PLAYER_W / 2;
                var py = Math.floor(player.y) + PLAYER_H;
                var sc = 1 - fadeT * 0.8;
                ctx.translate(px, py);
                ctx.scale(sc, sc);
                ctx.translate(-px, -py);
                drawPlayer();
                ctx.restore();
                ctx.globalAlpha = 1;
            }
            // 'close' phase: player not drawn (already inside)
        } else if (state === 'levelIntro') {
            // Fade-in player
            var introT = 1 - (levelIntroTimer / levelIntroDuration);
            if (introT < 0.3) {
                // Don't draw player yet
            } else {
                var fadeIn = Math.min(1, (introT - 0.3) / 0.3);
                ctx.globalAlpha = fadeIn;
                drawPlayer();
                ctx.globalAlpha = 1;
            }
        } else if (state === 'boss') {
            drawPlayer();
            drawBoss();
            drawBossProjectiles();
            drawBossHUD();
            drawBossIntro();
        } else {
            drawPlayer();
        }

        drawParticles(camX);

        // Level intro banner
        if (state === 'levelIntro' && levelData) {
            var introT2 = 1 - (levelIntroTimer / levelIntroDuration);
            var bannerAlpha = introT2 < 0.7 ? 1 : Math.max(0, 1 - (introT2 - 0.7) / 0.3);
            ctx.save();
            ctx.globalAlpha = bannerAlpha;
            // Dark banner background
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            var bannerY = CANVAS_H / 2 - 40;
            ctx.fillRect(0, bannerY, CANVAS_W, 80);
            // Gold border lines
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(0, bannerY, CANVAS_W, 2);
            ctx.fillRect(0, bannerY + 78, CANVAS_W, 2);
            // Level name text
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 10;
            ctx.fillText('Level ' + (currentLevel + 1) + ': ' + levelData.name, CANVAS_W / 2, CANVAS_H / 2 - 8);
            ctx.shadowBlur = 0;
            // Subtitle
            ctx.fillStyle = '#aaaacc';
            ctx.font = '14px monospace';
            ctx.fillText(levelData.concept, CANVAS_W / 2, CANVAS_H / 2 + 18);
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
            ctx.restore();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  GAME LOOP
    // ═══════════════════════════════════════════════════════════════

    function update() {
        frameTick++;
        if (state === 'playing') {
            updatePlayer();
            checkPickups();
            checkHazards();
            checkPuzzleTriggers();
            checkDoorExit();
            updateParticles();
        } else if (state === 'puzzle') {
            if (justPressed['Escape']) closePuzzle();
            updateParticles();
        } else if (state === 'doorTransition') {
            updateDoorTransition();
            updateParticles();
        } else if (state === 'levelIntro') {
            updateLevelIntro();
        } else if (state === 'boss') {
            updateBoss();
        }
        for (var k in justPressed) delete justPressed[k];
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // ═══════════════════════════════════════════════════════════════
    //  UI EVENTS
    // ═══════════════════════════════════════════════════════════════

    startBtn.addEventListener('click', function () {
        initAudio();
        titleScr.style.display = 'none';
        score = 0; lives = 3;
        hudLives.textContent = '\u2665\u2665\u2665';
        hudScore.textContent = '0';
        loadLevel(0);
    });

    nextBtn.addEventListener('click', function () {
        lcOverlay.classList.remove('show');
        var tc = document.getElementById('trophy-canvas');
        if (tc) tc.style.display = 'none';

        // If button says "BONUS ROUND", launch boss fight
        if (nextBtn.textContent.indexOf('BONUS') >= 0) {
            startBossFight();
            return;
        }

        // After boss victory or normal replay → restart from level 0
        if (currentLevel + 1 >= LEVELS.length) {
            score = 0; lives = 3;
            hudLives.textContent = '\u2665\u2665\u2665';
            hudScore.textContent = '0';
            loadLevel(0);
        } else {
            loadLevel(currentLevel + 1);
        }
    });

    retryBtn.addEventListener('click', function () {
        goOverlay.classList.remove('show');
        score = 0; lives = 3;
        hudLives.textContent = '\u2665\u2665\u2665';
        hudScore.textContent = '0';
        loadLevel(currentLevel);
    });

    // Retry Boss button — replay from boss fight
    var retryBossBtn = document.getElementById('retry-boss-btn');
    if (retryBossBtn) {
        retryBossBtn.addEventListener('click', function () {
            goOverlay.classList.remove('show');
            lives = 3;
            hudLives.textContent = '\u2665\u2665\u2665';
            startBossFight();
        });
    }

    // Start over buttons (game-over & level-complete)
    var goStartOver = document.getElementById('go-startover-btn');
    if (goStartOver) {
        goStartOver.addEventListener('click', function () {
            goOverlay.classList.remove('show');
            score = 0; lives = 3;
            hudLives.textContent = '\u2665\u2665\u2665';
            hudScore.textContent = '0';
            loadLevel(0);
        });
    }
    var lcStartOver = document.getElementById('lc-startover-btn');
    if (lcStartOver) {
        lcStartOver.addEventListener('click', function () {
            lcOverlay.classList.remove('show');
            var tc2 = document.getElementById('trophy-canvas');
            if (tc2) tc2.style.display = 'none';
            score = 0; lives = 3;
            hudLives.textContent = '\u2665\u2665\u2665';
            hudScore.textContent = '0';
            loadLevel(0);
        });
    }

    canvas.setAttribute('tabindex', '0');
    document.addEventListener('click', function () { canvas.focus(); });
    canvas.focus();

    requestAnimationFrame(gameLoop);
})();
