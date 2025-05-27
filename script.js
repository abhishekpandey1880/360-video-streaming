import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";

// Scene setup
const w = window.innerWidth;
const h = window.innerHeight;


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 25);
camera.position.set(0, -2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.lookAt(new THREE.Vector3(0, 0, 0));  // ✅ Face forward (-Z)
controls.target.set(0, 0, -1);
controls.rotateSpeed = -1;
controls.update();



// QREA variables
let qualitySwitches = 0;
let QREA_logs = [];
let lastQmatch = 1;
let lastLatency = 100;
let lastBuse = 0.5;


// Trace CSV
let traceData = [];
let traceIndex = 0;
let tracePlaybackStart = null;

function loadTraceCSV(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(data => {
      const lines = data.trim().split("\n").slice(1);
      traceData = lines.map(line => {
        const [time, x, y, z] = line.split(",").map(Number);
        let dir = new THREE.Vector3(x, y, z).normalize();

        // ✅ Rotate 90 degrees right around Y-axis
        const angle = -Math.PI / 2; // -90 degrees in radians
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

        return { time, dir };
      });
      tracePlaybackStart = performance.now();
      // console.log("Trace data loaded:", traceData.length, "entries");
      console.log("from load trace ", tracePlaybackStart);
    })
    .catch(err => console.error("Failed to load trace CSV:", err));
}



loadTraceCSV("./csvs/trace-2.csv");

function updateCameraFromTrace() {
  // console.log("from updateCamera: ", tracePlaybackStart);
  if (!tracePlaybackStart || traceIndex >= traceData.length) {
    return;
  }
  const currentTime = (performance.now() - tracePlaybackStart) / 1000;
  while (
    traceIndex + 1 < traceData.length &&
    traceData[traceIndex + 1].time <= currentTime
  ) {
    traceIndex++;
  }
  const lookDir = traceData[traceIndex]?.dir;
  if (lookDir) {
    const target = new THREE.Vector3().copy(camera.position).add(lookDir);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }
}

// Video sources
const pathHigh = "360-videos/roller-coaster/OG-roller-coaster-flip.mp4";
const pathMid = "360-videos/roller-coaster/OG-roller-coaster-flip.mp4";
const pathLow = "360-videos/roller-coaster/OG-roller-coaster-flip.mp4";

const highVid = document.createElement("video");
const midVid = document.createElement("video");
const lowVid = document.createElement("video");
[highVid, midVid, lowVid].forEach(v => {
  v.crossOrigin = "anonymous";
  v.loop = true;
  v.muted = true;
  v.playbackRate = 1;
});
highVid.src = pathHigh;
midVid.src = pathMid;
lowVid.src = pathLow;

const highTex = new THREE.VideoTexture(highVid);
const midTex = new THREE.VideoTexture(midVid);
const lowTex = new THREE.VideoTexture(lowVid);
[highTex, midTex, lowTex].forEach(tex => {
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.encoding = THREE.sRGBEncoding;
});

const material = new THREE.MeshBasicMaterial({ map: lowTex, side: THREE.BackSide });
const sphereGeo = new THREE.SphereGeometry(20, 64, 64);
const sphereMesh = new THREE.Mesh(sphereGeo, material);
sphereMesh.userData = { textures: { high: highTex, mid: midTex, low: lowTex } };
scene.add(sphereMesh);

function getCameraDirection() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir;
}

function getCurrentQuality() {
  const map = sphereMesh.material.map;
  const { high, mid } = sphereMesh.userData.textures;
  if (map === high) return "high";
  if (map === mid) return "mid";
  return "low";
}


setInterval(() => {
  const w1 = 0.4, w2 = 0.2, w3 = 0.3, w4 = 0.1;
  const rlatencyNorm = 1 - Math.min(lastLatency, 300) / 300;
  const qstab = 1 - Math.min(qualitySwitches / 10, 1);

  const QREA = w1 * lastQmatch + w3 * lastBuse + w2 * rlatencyNorm + w4 * qstab;
  QREA_logs.push({
    time: QREA_logs.length * 5,
    q: lastQmatch,
    r: rlatencyNorm,
    b: lastBuse,
    s: qstab,
    qrea: QREA
  });

  console.log(`QREA: ${QREA.toFixed(3)} | Q=${lastQmatch.toFixed(2)}, R=${rlatencyNorm.toFixed(2)}, B=${lastBuse.toFixed(2)}, S=${qstab.toFixed(2)}`);
  qualitySwitches = 0;
}, 5000);




function exportQREALog() {
  const header = "Time,Qmatch,Rlatency,Buse,Qstability,QREA\n";
  const rows = QREA_logs.map(log =>
    `${log.time},${log.q.toFixed(3)},${log.r.toFixed(3)},${log.b.toFixed(3)},${log.s.toFixed(3)},${log.qrea.toFixed(3)}`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "QREA_log.csv";
  a.click();
}

window.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "d") {
    exportQREALog();
    console.log("QREA log download triggered.");
  }
});

let loaded = 0;
[highVid, midVid, lowVid].forEach(v => {
  v.addEventListener("loadeddata", () => {
    loaded++;
    if (loaded === 3) {
      [highVid, midVid, lowVid].forEach(vid => { vid.currentTime = 0; vid.play().catch(() => { }); });
    }
  });
});

function animate() {
  requestAnimationFrame(animate);
  updateCameraFromTrace();
  renderer.render(scene, camera);
}
animate();