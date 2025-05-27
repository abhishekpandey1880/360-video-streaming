import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";

const w = window.innerWidth;
const h = window.innerHeight;

// Added for video sync
let globalTime = 0;

// average tile quality
const qualityScore = { high: 3, mid: 2, low: 1 };
const avgQualityLog = [];

// Added for trace routes
let traceData = [];
let traceIndex = 0;
let tracePlaybackStart = null;

// Added for QREA
let qualitySwitches = 0;
let lastQualities = Array(8).fill("low");
let QREA_logs = [];
let lastQmatch = 1;
let lastLatency = 100;
let lastBuse = 0.5;


// Initialize Three.js scene
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0,0,0.01);
// camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
// renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -5);  // Point the camera to look forward
controls.update();
// controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = true;
controls.rotateSpeed = -1;

const videos = [];

const path720 = "360-videos/roller-coaster/OG-tiles/8-tiles/720p/";
const path480 = "360-videos/roller-coaster/OG-tiles/8-tiles/480p/";
const path360 = "360-videos/roller-coaster/OG-tiles/8-tiles/360p/";
const path144 = "360-videos/roller-coaster/OG-tiles/8-tiles/144p/";

const sourceMap = {
  0: { high: path480 + "nftl.mp4", mid: path360 + "nftl.mp4", low: path144 + "nftl.mp4" },
  1: { high: path480 + "nbtl.mp4", mid: path360 + "nbtl.mp4", low: path144 + "nbtl.mp4" },
  2: { high: path480 + "nftr.mp4", mid: path360 + "nftr.mp4", low: path144 + "nftr.mp4" },
  3: { high: path480 + "nbtr.mp4", mid: path360 + "nbtr.mp4", low: path144 + "nbtr.mp4" },
  4: { high: path480 + "nfbl.mp4", mid: path360 + "nfbl.mp4", low: path144 + "nfbl.mp4" },
  5: { high: path480 + "nbbl.mp4", mid: path360 + "nbbl.mp4", low: path144 + "nbbl.mp4" },
  6: { high: path480 + "nfbr.mp4", mid: path360 + "nfbr.mp4", low: path144 + "nfbr.mp4" },
  7: { high: path480 + "nbbr.mp4", mid: path360 + "nbbr.mp4", low: path144 + "nbbr.mp4" },
};

function createQuadrant(index, phiStart, phiLength, thetaStart, thetaLength) {
  const highVid = document.createElement("video");
  const midVid = document.createElement("video");
  const lowVid = document.createElement("video");
  [highVid, midVid, lowVid].forEach((v) => {
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    v.playbackRate = 1;
    videos.push(v);
  });

  highVid.src = sourceMap[index].high;
  midVid.src = sourceMap[index].mid;
  lowVid.src = sourceMap[index].low;

  const highTexture = new THREE.VideoTexture(highVid);
  const midTexture = new THREE.VideoTexture(midVid);
  const lowTexture = new THREE.VideoTexture(lowVid);
  [highTexture, midTexture, lowTexture].forEach((tex) => {
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.encoding = THREE.sRGBEncoding;
  });

  const videoMaterial = new THREE.MeshBasicMaterial({
    map: lowTexture,
    side: THREE.BackSide
  });

  const geometry = new THREE.SphereGeometry(20, 32, 32, phiStart, phiLength, thetaStart, thetaLength);
  const mesh = new THREE.Mesh(geometry, videoMaterial);

  mesh.userData.textures = {
    high: highTexture,
    mid: midTexture,
    low: lowTexture
  };
  mesh.userData.videos = {
    high: highVid,
    mid: midVid,
    low: lowVid
  };

  return mesh;
}

const quads = [
  createQuadrant(0, -Math.PI / 2, Math.PI/2, 0, Math.PI / 2), // Front Top Left
  createQuadrant(1, 0, Math.PI/2, 0, Math.PI / 2), // Back Top Left

  createQuadrant(2, Math.PI, Math.PI/2, 0, Math.PI / 2),  // Front Top Right
  createQuadrant(3, Math.PI/2, Math.PI/2, 0, Math.PI / 2),  // Back Top Right

  createQuadrant(4, -Math.PI / 2, Math.PI/2, Math.PI/2, Math.PI / 2), // Front Bottom Left
  createQuadrant(5, 0, Math.PI / 2, Math.PI / 2, Math.PI / 2), // back Bottom Left

  createQuadrant(6, Math.PI, Math.PI/2, Math.PI/2, Math.PI/2),   // Front Bottom Right
  createQuadrant(7, Math.PI/2, Math.PI/2, Math.PI/2, Math.PI/2)   // Back Bottom Right
];

quads.forEach((q) => scene.add(q));



// average tile quality
function computeAverageQuality() {
  let totalQuality = 0;
  quads.forEach(q => {
    const quality = getCurrentTileQuality(q);
    totalQuality += qualityScore[quality] || 1; // fallback to 1 (low) if undefined
  });
  return totalQuality / quads.length;
}


// ABR - 1 Get Camera Direction
const getCameraDirection = () => {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir; // This is a unit vector
};

const quadrantDirections = [
  new THREE.Vector3(-1, 1, -1),  // Top Front Left
  new THREE.Vector3(-1, 1, 1),  // Top Back Left
  new THREE.Vector3(1, 1, -1),  // Top Front Right
  new THREE.Vector3(1, 1, 1),  // Top Back Right

  new THREE.Vector3(-1, -1, -1), // Bottom Front Left
  new THREE.Vector3(-1, -1, 1), // Bottom Back Left
  new THREE.Vector3(1, -1, -1),  // Bottom Front Right
  new THREE.Vector3(1, -1, 1),  // Bottom Back Right
].map(v => v.normalize());

// ABR - 3 Calculate which quadrant in the view
function getCurrentQuadrant() {
  const camDir = getCameraDirection();
  let maxDot = -Infinity;
  let currentIndex = -1;

  quadrantDirections.forEach((quadDir, index) => {
    const dot = camDir.dot(quadDir); // Cosine of angle between them
    if (dot > maxDot) {
      maxDot = dot;
      currentIndex = index;
    }
  });

  return currentIndex; // 0 = quad1, 1 = quad2, ...
}

// ABR - 4 Dynamically switch quality based on dot product threshold
// Here we are having two thresholds, then we do the dot product of the camera 
// and tile vector, and based on the dot product if it is greater than 
// the thresholds it get the quality of video ( high, mid or low ).

// const DOT_THRESHOLD = 0.35;
const thresholdOne = 0.5;
const thresholdTwo = 0.1;

setInterval(() => {
  // Added for sync videos
  updateGlobalTime();

  const camDir = getCameraDirection();

  quads.forEach((q, i) => {
    const dot = camDir.dot(quadrantDirections[i]);

    // Added for sync videos
    syncAllVideosTo(globalTime);

    let desiredTexture;
    if (dot >= thresholdOne) {
      desiredTexture = q.userData.textures.high;
    } else if (dot >= thresholdTwo) {
      desiredTexture = q.userData.textures.mid;
    } else {
      desiredTexture = q.userData.textures.low;
    }

    const currentTexture = q.material.map;

    if (currentTexture !== desiredTexture) {
      q.material.map = desiredTexture;
      q.material.needsUpdate = true;
    }

  });  
}, 100);



// Added for QREA
setInterval(() => {
  const camDir = getCameraDirection();
  const qualityToBitrate = { high: 1000, mid: 600, low: 200 };
  let qualityMatchCount = 0;
  let viewportTileCount = 0;
  let visibleBandwidth = 0;
  let totalBandwidth = 0;

  quads.forEach((q, i) => {
    const dot = camDir.dot(quadrantDirections[i]);
    const current = dot >= thresholdOne ? "high"
      : dot >= thresholdTwo ? "mid"
        : "low";

    const currentQuality = getCurrentTileQuality(q);
    if (dot >= thresholdTwo) {
      viewportTileCount++;
      if (current === currentQuality) qualityMatchCount++;
    }

    totalBandwidth += qualityToBitrate[currentQuality];
    if (dot >= thresholdTwo) {
      visibleBandwidth += qualityToBitrate[currentQuality];
    }

    if (current !== lastQualities[i]) {
      qualitySwitches++;
      lastQualities[i] = current;
    }
  });

  lastQmatch = qualityMatchCount / (viewportTileCount || 1);
  lastBuse = visibleBandwidth / (totalBandwidth || 1);
}, 1000);


setInterval(() => {
  const w1 = 0.4, w2 = 0.2, w3 = 0.3, w4 = 0.1;
  const rlatencyNorm = 1 - Math.min(lastLatency, 300) / 300;
  const qstab = 1 - Math.min(qualitySwitches / 10, 1);

  const QREA = w1 * lastQmatch + w3 * lastBuse + w2 * rlatencyNorm + w4 * qstab;
  // QREA_logs.push(QREA);
  QREA_logs.push({
    time: QREA_logs.length * 5,
    q: lastQmatch,
    r: rlatencyNorm,
    b: lastBuse,
    s: qstab,
    qrea: QREA
  });

  // === NEW: Push average quality to log every 5 seconds ===
  const avgQuality = computeAverageQuality();
  avgQualityLog.push({ time: QREA_logs.length * 5, avgQuality });

  console.log(`QREA: ${QREA.toFixed(3)} | Q=${lastQmatch.toFixed(2)}, R=${rlatencyNorm.toFixed(2)}, B=${lastBuse.toFixed(2)}, S=${qstab.toFixed(2)}, AvgQ=${avgQuality.toFixed(2)}`);
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


// average tile quality
function exportAvgQualityLog() {
  const header = "Time,AvgQuality\n";
  const rows = avgQualityLog.map(entry =>
    `${entry.time},${entry.avgQuality.toFixed(2)}`
  ).join("\n");

  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "AvgQuality_log.csv";
  a.click();
}


// average tile quality
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "q") {
    exportAvgQualityLog();
    console.log("Average Quality log download triggered.");
  }
});




window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "d") {
    exportQREALog();
    console.log("QREA log download triggered.");
  }
});



// Preventing video lag on switch, and making all the videos in sync. Added for video sync
let playbackStartTime = null;
function updateGlobalTime() {
  if (!playbackStartTime) return;
  const elapsed = (performance.now() - playbackStartTime) / 1000; // in seconds
  globalTime = elapsed;
}

function syncAllVideosTo(time) {
  videos.forEach((vid) => {
    if (Math.abs(vid.currentTime - time) > 0.2) {
      vid.pause();
      vid.currentTime = time;
    }
  });

  // Play after short delay to let seek settle
  setTimeout(() => {
    videos.forEach((vid) => {
      if (vid.paused) vid.play().catch(() => { });
    });
  }, 50);
}


// Added for QREA
function getCurrentTileQuality(quad) {
  const currentMap = quad.material.map;
  const textures = quad.userData.textures;
  if (currentMap === textures.high) return "high";
  if (currentMap === textures.mid) return "mid";
  return "low";
}


// Play all videos once loaded
let loadedCount = 0;
videos.forEach((v) => {
  v.addEventListener("loadeddata", () => {
    loadedCount++;
    if (loadedCount === videos.length) {
      videos.forEach((vid) => {
        vid.currentTime = 0;
      });
      setTimeout(() => {
        // Added for vidoe sync
        playbackStartTime = performance.now();

        videos.forEach((vid) => {
          // Added for video sync
          vid.currentTime = 0;
          vid.play().catch((e) => console.log("Autoplay prevented:", e));
        });
      }, 200);
    }
  });
});



// Added for trace routes ( tracing )
function loadTraceCSV(url) {
  fetch(url)
    .then(res => res.text())
    .then(data => {
      const lines = data.trim().split("\n").slice(1); // remove header
      traceData = lines.map(line => {
        const [time, x, y, z] = line.split(",").map(Number);
        return { time, dir: new THREE.Vector3(x, y, z).normalize() };
      });
      tracePlaybackStart = performance.now();
    });
}

loadTraceCSV("./csvs/trace-2.csv");

function updateCameraFromTrace() {
  if (!tracePlaybackStart || traceIndex >= traceData.length) return;

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
    camera.updateMatrixWorld(); // Added during trace, to update the vector
  }
}


function animate() {
  requestAnimationFrame(animate);
  updateCameraFromTrace();
  renderer.render(scene, camera);
}
animate();
