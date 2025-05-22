import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";

const w = window.innerWidth;
const h = window.innerHeight;

// Initialize Three.js scene
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0,0,1);
// camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
// renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);
// document.getElementById('container').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 5);  // Point the camera to look forward
controls.update();
// controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = true;
controls.rotateSpeed = -1;

const videos = [];

const pathToVideos = "360-videos/roller-coaster/OG-tiles/";
const pathToLowVideos = "360-videos/roller-coaster/OG-tiles/low-quality/";

const sourceMap = {
  0: { high: pathToVideos + "tl.mp4", low: pathToLowVideos + "tl-low.mp4" },
  1: { high: pathToVideos + "tr.mp4", low: pathToLowVideos + "tr-low.mp4" },
  2: { high: pathToVideos + "bl.mp4", low: pathToLowVideos + "bl-low.mp4" },
  3: { high: pathToVideos + "br.mp4", low: pathToLowVideos + "br-low.mp4" }
};

function createQuadrant(index, phiStart, phiLength, thetaStart, thetaLength) {
  const highVid = document.createElement("video");
  const lowVid = document.createElement("video");
  [highVid, lowVid].forEach((v) => {
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    videos.push(v);
  });

  highVid.src = sourceMap[index].high;
  lowVid.src = sourceMap[index].low;

  const highTexture = new THREE.VideoTexture(highVid);
  const lowTexture = new THREE.VideoTexture(lowVid);
  [highTexture, lowTexture].forEach((tex) => {
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.encoding = THREE.sRGBEncoding;
  });

  const videoMaterial = new THREE.MeshBasicMaterial({
    map: lowTexture,
    side: THREE.DoubleSide
  });

  const geometry = new THREE.SphereGeometry(20, 64, 64, phiStart, phiLength, thetaStart, thetaLength);
  const mesh = new THREE.Mesh(geometry, videoMaterial);

  mesh.userData.textures = {
    high: highTexture,
    low: lowTexture
  };
  mesh.userData.videos = {
    high: highVid,
    low: lowVid
  };

  return mesh;
}

const quads = [
  createQuadrant(0, -Math.PI / 2, Math.PI, 0, Math.PI / 2), // Top Left
  createQuadrant(1, Math.PI / 2, Math.PI, 0, Math.PI / 2),  // Top Right
  createQuadrant(2, -Math.PI / 2, Math.PI, Math.PI / 2, Math.PI / 2), // Bottom Left
  createQuadrant(3, Math.PI / 2, Math.PI, Math.PI / 2, Math.PI / 2)   // Bottom Right
];

quads.forEach((q) => scene.add(q));


// ABR - 1 Get Camera Direction
const getCameraDirection = () => {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir; // This is a unit vector
};

// ABR - 2 Define the center direction of each quadrant
const quadrantDirections = [
  new THREE.Vector3(0, 1, 1),  // quad1
  new THREE.Vector3(0, 1, -1), // quad2
  new THREE.Vector3(0, -1, 1), // quad3
  new THREE.Vector3(0, -1, -1) // quad4
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

// ABR - 4 Dynamically switch quality based on the viewport
let currentQuadrant = -1;

setInterval(() => {
  const newQuadrant = getCurrentQuadrant();
  if (newQuadrant !== currentQuadrant) {
    currentQuadrant = newQuadrant;
    console.log(currentQuadrant);
    quads.forEach((q, i) => {
      q.material.map = q.userData.textures[i === currentQuadrant ? "high" : "low"];
      q.material.needsUpdate = true;
    });
  }
}, 500);


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
        videos.forEach((vid) => {
          vid.play().catch((e) => console.log("Autoplay prevented:", e));
        });
      }, 100);
    }
  });
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();
}
animate();
