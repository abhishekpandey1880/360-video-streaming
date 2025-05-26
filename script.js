import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";

const w = window.innerWidth;
const h = window.innerHeight;

// Three.js Scene Setup
const scene = new THREE.Scene();

// Camera Setup
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0, 0, 0.01);

// Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
camera.lookAt(new THREE.Vector3(1, 0, 0)); // Look at the front
controls.target.set(1, 0, 0);
controls.update();
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = true;
controls.rotateSpeed = -1;

// Video Setup
const video = document.createElement("video");
video.src = "360-videos/roller-coaster/OG-roller-coaster-flip.mp4"; // You can change this
video.crossOrigin = "anonymous";
video.loop = true;
video.muted = true;
video.play();

// Video Texture
const texture = new THREE.VideoTexture(video);
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.encoding = THREE.sRGBEncoding;

// Sphere Geometry (inward-facing)
const geometry = new THREE.SphereGeometry(20, 64, 64);
geometry.scale(1, 1, 1); // Flip the normals

const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.BackSide
});

const mesh = new THREE.Mesh(geometry, material);
// mesh.rotation.y = Math.PI / 2;
scene.add(mesh);

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();
}
animate();
