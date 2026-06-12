import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin, VRMLookAtQuaternionProxy } from '@pixiv/three-vrm-animation';
import { getVolume } from '../utils/audioSystem';

export default function VrmViewer({ isTalking }) {
    const containerRef = useRef(null);
    const vrmRef = useRef(null);
    const mixerRef = useRef(null);
    const requestRef = useRef(null);
    const clockRef = useRef(new THREE.Clock());

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
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

        const gltfLoader = new GLTFLoader();
        gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
        gltfLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));

        gltfLoader.load('/VRM/default.vrm', (gltf) => {
            const vrm = gltf.userData.vrm;
            vrmRef.current = vrm;
            scene.add(vrm.scene);
            
            vrm.scene.traverse((obj) => { obj.frustumCulled = false; });
            vrm.scene.rotation.y = Math.PI;

            loadAnimation('Idleloop');
        });

        const loadAnimation = (name) => {
            gltfLoader.load(`/VRMA/${name}.vrma`, (gltf) => {
                if (!vrmRef.current) return;
                const vrmAnimations = gltf.userData.vrmAnimations;
                if (!vrmAnimations || vrmAnimations.length === 0) return;
                
                const vrmAnimation = vrmAnimations[0];

                if (mixerRef.current) {
                    mixerRef.current.stopAllAction();
                    mixerRef.current.uncacheRoot(vrmRef.current.scene);
                }

                mixerRef.current = new THREE.AnimationMixer(vrmRef.current.scene);

                if (vrmRef.current.lookAt) {
                    let proxy = vrmRef.current.scene.children.find((obj) => obj.name === 'VRMLookAtQuaternionProxy');
                    if (!proxy) {
                        proxy = new VRMLookAtQuaternionProxy(vrmRef.current.lookAt);
                        proxy.name = 'VRMLookAtQuaternionProxy';
                        vrmRef.current.scene.add(proxy);
                    }
                }

                const clip = createVRMAnimationClip(vrmAnimation, vrmRef.current);
                const action = mixerRef.current.clipAction(clip);
                action.play();
            });
        };

        // Expose function globally for the hooks or other components if needed,
        // but it's cleaner to handle it via props/useEffect
        window.setVRMAnimation = loadAnimation;

        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            const deltaTime = clockRef.current.getDelta();

            if (mixerRef.current) mixerRef.current.update(deltaTime);
            if (vrmRef.current) {
                // Lip Sync Update
                const volume = getVolume();
                if (vrmRef.current.expressionManager) {
                    vrmRef.current.expressionManager.setValue('aa', Math.min(volume * 3, 1.0));
                }
                vrmRef.current.update(deltaTime);
            }

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            container.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    useEffect(() => {
        if (window.setVRMAnimation) {
            window.setVRMAnimation(isTalking ? 'Talk' : 'Idleloop');
        }
    }, [isTalking]);

    return (
        <div ref={containerRef} className="vrm-canvas-container" />
    );
}
