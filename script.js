import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";
import Hls from "hls.js";

// import Hls from 'https://cdn.jsdelivr.net/npm/hls.js-esm@0.0.2/+esm'
// const hls = new window.Hls();


// Command to convert a .mp4 file in (1280 X 720) to m3u8 
/*
ffmpeg -i nbbr.mp4 -filter_complex "[0:v]split=4[v1][v2][v3][v4];[v1]scale=180:144[v1out];[v2]scale=406:360[v2out];[v3]scale=540:480[v3out];[v4]scale=720:640[v4out]" -map "[v1out]" -c:v:0 libx264 -b:v:0 300k -map "[v2out]" -c:v:1 libx264 -b:v:1 600k -map "[v3out]" -c:v:2 libx264 -b:v:2 1000k -map "[v4out]" -c:v:3 libx264 -b:v:3 2000k -f hls -hls_time 4 -hls_playlist_type vod -var_stream_map "v:0 v:1 v:2 v:3" -master_pl_name master.m3u8 stream_%v.m3u8

*/

const w = window.innerWidth;
const h = window.innerHeight;

// Added for video sync
let globalTime = 0;

// Added for trace routes
let traceData = [];
let traceIndex = 0;
let tracePlaybackStart = null;

// Initialize Three.js scene
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0, 0, 5);
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

// const path720 = "360-videos/roller-coaster/OG-tiles/8-tiles/720p/";
// const path480 = "360-videos/roller-coaster/OG-tiles/8-tiles/480p/";
// const path360 = "360-videos/roller-coaster/OG-tiles/8-tiles/360p/";
// const path144 = "360-videos/roller-coaster/OG-tiles/8-tiles/144p/";

// const sourceMap = {
//   0: { high: path480 + "nftl.mp4", mid: path360 + "nftl.mp4", low: path144 + "nftl.mp4" },
//   1: { high: path480 + "nbtl.mp4", mid: path360 + "nbtl.mp4", low: path144 + "nbtl.mp4" },
//   2: { high: path480 + "nftr.mp4", mid: path360 + "nftr.mp4", low: path144 + "nftr.mp4" },
//   3: { high: path480 + "nbtr.mp4", mid: path360 + "nbtr.mp4", low: path144 + "nbtr.mp4" },
//   4: { high: path480 + "nfbl.mp4", mid: path360 + "nfbl.mp4", low: path144 + "nfbl.mp4" },
//   5: { high: path480 + "nbbl.mp4", mid: path360 + "nbbl.mp4", low: path144 + "nbbl.mp4" },
//   6: { high: path480 + "nfbr.mp4", mid: path360 + "nfbr.mp4", low: path144 + "nfbr.mp4" },
//   7: { high: path480 + "nbbr.mp4", mid: path360 + "nbbr.mp4", low: path144 + "nbbr.mp4" },
// };

// Create HLS Tiles
function createHLSTile(index, phiStart, phiLength, thetaStart, thetaLength) {
  const vid = document.createElement("video");
  vid.crossOrigin = "anonymous";
  vid.muted = true;
  vid.playsInline = true;
  vid.loop = true;  // Optional
  videos.push(vid);

  const texture = new THREE.VideoTexture(vid);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.encoding = THREE.sRGBEncoding;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide
  });

  const geom = new THREE.SphereGeometry(20, 32, 32, phiStart, phiLength, thetaStart, thetaLength);
  const mesh = new THREE.Mesh(geom, material);

  const hls = new Hls({ lowLatencyMode: true });
  hls.loadSource(`hls/tiles/${index}/master.m3u8`);
  hls.attachMedia(vid);

  hls.on(Hls.Events.LEVEL_SWITCHED, (e, data) => {
    console.log(`Tile ${index} is now at level ${data.level}`);
  });

  // Play video when ready
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    vid.play().catch(() => { });
  });

  // return { mesh, video: vid, texture, index, hls };
  return { mesh, video: vid, texture, index, hls, lastSwitchTime: 0 }; // <-- Add lastSwitchTime

}


// HLS tiles
const tiles = [
  createHLSTile(0, -Math.PI / 2, Math.PI / 2, 0, Math.PI / 2),
  createHLSTile(1, 0, Math.PI / 2, 0, Math.PI / 2),
  createHLSTile(2, Math.PI, Math.PI / 2, 0, Math.PI / 2),
  createHLSTile(3, Math.PI / 2, Math.PI / 2, 0, Math.PI / 2),
  createHLSTile(4, -Math.PI / 2, Math.PI / 2, Math.PI / 2, Math.PI / 2),
  createHLSTile(5, 0, Math.PI / 2, Math.PI / 2, Math.PI / 2),
  createHLSTile(6, Math.PI, Math.PI / 2, Math.PI / 2, Math.PI / 2),
  createHLSTile(7, Math.PI / 2, Math.PI / 2, Math.PI / 2, Math.PI / 2)
];



for (let i = 0; i < 8; i++) {
  
  // const t = createTile(i, );
  const t = tiles[i];
  
  // tiles.push(t);
  scene.add(t.mesh);

  // once ready, start the one video
  t.video.addEventListener("loadeddata", () => {
    t.video.currentTime = globalTime;
    t.video.play().catch(() => { });
  });
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

// // *** new approach with 8 tiles
// async function swapQualityForAll(desiredQuality) {
//   // 1) Pause all
//   tiles.forEach(t => t.video.pause());

//   // 2) Swap src & load
//   tiles.forEach(t => {
//     t.video.src = sourceMap[t.index][desiredQuality];
//     t.video.load();
//   });

//   // 3) Wait for metadata on all
//   await Promise.all(tiles.map(t =>
//     new Promise(res => {
//       if (t.video.readyState >= 1) return res();
//       t.video.addEventListener("loadedmetadata", res, { once: true });
//     })
//   ));

//   // 4) Seek all to the same globalTime
//   tiles.forEach(t => { t.video.currentTime = globalTime; });

//   // 5) Wait for each seek to finish
//   await Promise.all(tiles.map(t =>
//     new Promise(res => {
//       t.video.addEventListener("seeked", res, { once: true });
//     })
//   ));

//   // 6) Play them all together
//   tiles.forEach(t => t.video.play().catch(() => { }));
// }




// **** New approach 8 tiles, set interval code
const thresholdOne = 0.4;
const thresholdTwo = 0.2;

let lastQuality = null;


// Old set interval 

// setInterval(() => {
//   updateGlobalTime();
//   const camDir = getCameraDirection();

//   // Find the “worst” quality needed across all tiles
//   const qualities = tiles.map((t, i) => {
//     const dot = camDir.dot(quadrantDirections[i]);
//     return dot >= thresholdOne ? "high"
//       : dot >= thresholdTwo ? "mid"
//         : "low";
//   });
//   // e.g. if _any_ tile wants “mid” and none want “high”, you pick “mid”
//   const desired = qualities.includes("high") ? "high"
//     : qualities.includes("mid") ? "mid"
//       : "low";

//   if (desired !== lastQuality) {
//     lastQuality = desired;
//     // swapQualityForAll(desired);
//   }
// }, 3000);


// new set interval for quality change using threholds
setInterval(() => {
  const camDir = getCameraDirection();
  const now = performance.now(); // current time in ms
  const SWITCH_COOLDOWN = 1000;  // cooldown per tile (5s)

  tiles.forEach((t, i) => {
    const dot = camDir.dot(quadrantDirections[i]);
    let desiredLevel = 0;
    if (dot >= thresholdOne) desiredLevel = 3;
    else if (dot >= thresholdTwo) desiredLevel = 2;

    const canSwitch = (now - t.lastSwitchTime) > SWITCH_COOLDOWN;
    const currentLevel = t.hls.currentLevel;

    if (
      t.hls &&
      t.hls.levels &&
      desiredLevel < t.hls.levels.length &&
      canSwitch &&
      desiredLevel !== currentLevel
    ) {
      // t.hls.currentLevel = desiredLevel;
      t.hls.nextLevel = desiredLevel;

      t.lastSwitchTime = now;
      console.log(`Tile ${i} switched to level ${desiredLevel}`);
    }
  });
}, 1000); // check every second, but throttle per tile





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
  controls.update();
  renderer.render(scene, camera);
}
animate();
