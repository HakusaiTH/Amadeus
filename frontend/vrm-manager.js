import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin, VRMLookAtQuaternionProxy } from '@pixiv/three-vrm-animation';

const container = document.getElementById('vrm-container');
const loadingDiv = document.getElementById('vrm-loading');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30.0, container.clientWidth / container.clientHeight, 0.1, 20.0);
camera.position.set(0.0, 1.4, 2.0);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.screenSpacePanning = true;
controls.target.set(0.0, 1.4, 0.0);
controls.update();

const light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(1.0, 1.0, 1.0).normalize();
scene.add(light);

let currentVrm = null;
let currentMixer = null;

const clock = new THREE.Clock();

const gltfLoader = new GLTFLoader();
gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
gltfLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));

function loadVRM(url) {
    gltfLoader.load(url, (gltf) => {
        const vrm = gltf.userData.vrm;
        
        if (currentVrm) {
            scene.remove(currentVrm.scene);
            VRMUtils.deepDispose(currentVrm.scene);
        }

        currentVrm = vrm;
        scene.add(vrm.scene);
        
        // Disable frustum culling so it doesn't disappear when partially offscreen
        vrm.scene.traverse((obj) => {
            obj.frustumCulled = false;
        });

        // Rotate VRM 180 degrees so it faces the camera
        vrm.scene.rotation.y = Math.PI;

        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }

        window.setVRMAnimation('Idleloop');

    }, (progress) => {
        console.log('Loading VRM...', 100.0 * (progress.loaded / progress.total), '%');
    }, (error) => {
        console.error('Failed to load VRM:', error);
    });
}

window.setVRMAnimation = (name) => {
    if (!currentVrm) return;

    gltfLoader.load(`/static/VRMA/${name}.vrma`, (gltf) => {
        const vrmAnimations = gltf.userData.vrmAnimations;
        if (!vrmAnimations || vrmAnimations.length === 0) return;
        
        const vrmAnimation = vrmAnimations[0];

        if (currentMixer) {
            currentMixer.stopAllAction();
            currentMixer.uncacheRoot(currentVrm.scene);
        }

        currentMixer = new THREE.AnimationMixer(currentVrm.scene);

        // Suppress VRMLookAtQuaternionProxy warning
        if (currentVrm.lookAt) {
            let proxy = currentVrm.scene.children.find((obj) => obj.name === 'VRMLookAtQuaternionProxy');
            if (!proxy) {
                proxy = new VRMLookAtQuaternionProxy(currentVrm.lookAt);
                proxy.name = 'VRMLookAtQuaternionProxy';
                currentVrm.scene.add(proxy);
            }
        }

        const clip = createVRMAnimationClip(vrmAnimation, currentVrm);
        const action = currentMixer.clipAction(clip);
        action.play();
    });
};

window.updateMouth = (volume) => {
    if (currentVrm && currentVrm.expressionManager) {
        // Map volume (0-1) to 'aa' blendshape. Multiplying by 3 to amplify slightly
        currentVrm.expressionManager.setValue('aa', Math.min(volume * 3, 1.0));
    }
};

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (currentMixer) {
        currentMixer.update(deltaTime);
    }
    if (currentVrm) {
        currentVrm.update(deltaTime);
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

// Init
loadVRM('/static/VRM/default.vrm');
animate();
