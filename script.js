import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";

const w = window.innerWidth;
const h = window.innerHeight;

// Initialize Three.js scene
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(0,0,0);
// camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
// document.getElementById('container').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -1);  // Point the camera to look forward
controls.update();
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = true;
controls.rotateSpeed = -1;

// Create video element
const video = document.createElement('video');
video.src = "360-sun.mp4"; // Placeholder - replace with actual video URL
video.crossOrigin = "anonymous";
video.loop = true;
video.muted = true; // Muted to allow autoplay

// Create video texture
const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;

// Material with video texture
const videoMaterial = new THREE.MeshBasicMaterial({
  map: videoTexture,
  side: THREE.DoubleSide
});

// Create default shape (cube)
let currentGeometry = new THREE.BoxGeometry(3, 3, 3);
let object = new THREE.Mesh(currentGeometry, videoMaterial);
// scene.add(object);


// Create a quadrant
let quadGeometry = new THREE.SphereGeometry(50, 64, 64, 0, Math.PI, 0, Math.PI/2);

// Create a mesh
const quadMesh = new THREE.Mesh(quadGeometry, videoMaterial);

scene.add(quadMesh);


// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update(); // ✅ VERY IMPORTANT
}

// Start animation
animate();

// Try to autoplay the video (might be blocked by browser policies)
video.play().catch(e => {
  console.log('Video autoplay was prevented:', e);
  console.log('Please click the Play/Pause button to start the video');
});