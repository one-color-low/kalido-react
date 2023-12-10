import React, { useEffect, useRef} from 'react';

import * as THREE from 'three';
import { VRM, VRMHumanBoneName, VRMUtils, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import * as Kalidokit from 'kalidokit'
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import { Pose, Results, POSE_CONNECTIONS } from '@mediapipe/pose';


function KalidoReact() {

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // They should be declared in useEffect() too.
    let videoElement = videoRef.current
    let guideCanvas = canvasRef.current

    const drawArea = useRef<HTMLDivElement>(null); // Append VRM View to here.

    /* THREEJS WORLD SETUP */
    let currentVrm: VRM;

    // renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // camera
    const orbitCamera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    orbitCamera.position.set(0.0, 1.4, 3.0);

    const scene = new THREE.Scene();

    // // controls
    const orbitControls = new OrbitControls(orbitCamera, renderer.domElement);
    orbitControls.screenSpacePanning = true;
    orbitControls.target.set(0.0, 1.4, 0.0);
    orbitControls.update();

    // light
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    // Main Render Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        if (currentVrm) {
            // Update model to render physics
            currentVrm.update(clock.getDelta());
        }
        renderer.render(scene, orbitCamera);
    }
    animate();

    /* VRM CHARACTER SETUP */

    // Import Character VRM
    const loader = new GLTFLoader();
    loader.crossOrigin = "anonymous";

    // By adding this, avoid error of "'scene' not found"
    const helperRoot = new THREE.Group();
    loader.register((parser) => new VRMLoaderPlugin(parser, { helperRoot: helperRoot }));

    loader.load(
        "https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAshtra.vrm?v=1630342336981",

        (gltf) => {

            VRMUtils.removeUnnecessaryJoints(gltf.scene);

            const vrm = gltf.userData.vrm;
            scene.add(vrm.scene);

            currentVrm = vrm;
            currentVrm.scene.rotation.y = Math.PI;

        },

        (progress) => console.log("Loading model...", 100.0 * (progress.loaded / progress.total), "%"),

        (error) => console.error(error)
    );

    // Animate Rotation Helper function
    const rigRotation = (name: VRMHumanBoneName, rotation = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
        if (!currentVrm) {
            return;
        }

        const Part = currentVrm.humanoid.getNormalizedBoneNode(name);

        if (!Part) {
            console.log("Part not found")
            return;
        }

        let euler = new THREE.Euler(
            rotation.x * dampener,
            rotation.y * dampener,
            rotation.z * dampener,
            // rotation.rotationOrder || "XYZ"
        );
        let quaternion = new THREE.Quaternion().setFromEuler(euler);
        Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
    };

    // Animate Position Helper Function
    const rigPosition = (name: VRMHumanBoneName, position = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
        if (!currentVrm) {
            return;
        }

        const Part = currentVrm.humanoid.getNormalizedBoneNode(name);

        if (!Part) {
            return;
        }
        let vector = new THREE.Vector3(position.x * dampener, position.y * dampener, position.z * dampener);
        Part.position.lerp(vector, lerpAmount); // interpolate
    };

    /* VRM Character Animator */
    const animateVRM = (vrm: VRM, results: Results) => {
        if (!vrm) {
            console.log("vrm not found")
            return;
        }

        let riggedPose;

        // Pose 3D Landmarks are with respect to Hip distance in meters
        const pose3DLandmarks = results.poseWorldLandmarks;
        // Pose 2D landmarks are with respect to videoWidth and videoHeight
        const pose2DLandmarks = results.poseLandmarks;


        // Animate Pose
        if (pose2DLandmarks && pose3DLandmarks) {
            riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
                runtime: "mediapipe",
                video: videoElement,
            });
            if (riggedPose) {
                rigRotation(VRMHumanBoneName.Hips, riggedPose.Hips.rotation, 0.7);
                rigPosition(
                    VRMHumanBoneName.Hips,
                    {
                        x: riggedPose.Hips.position.x, // Reverse direction
                        y: riggedPose.Hips.position.y + 1, // Add a bit of height
                        z: -riggedPose.Hips.position.z, // Reverse direction
                    },
                    1,
                    0.07
                );

                rigRotation(VRMHumanBoneName.Chest, riggedPose.Spine, 0.25, 0.3);
                rigRotation(VRMHumanBoneName.Spine, riggedPose.Spine, 0.45, 0.3);

                rigRotation(VRMHumanBoneName.RightUpperArm, riggedPose.RightUpperArm, 1, 0.3);
                rigRotation(VRMHumanBoneName.RightLowerArm, riggedPose.RightLowerArm, 1, 0.3);
                rigRotation(VRMHumanBoneName.LeftUpperArm, riggedPose.LeftUpperArm, 1, 0.3);
                rigRotation(VRMHumanBoneName.LeftLowerArm, riggedPose.LeftLowerArm, 1, 0.3);

                rigRotation(VRMHumanBoneName.LeftUpperLeg, riggedPose.LeftUpperLeg, 1, 0.3);
                rigRotation(VRMHumanBoneName.LeftLowerLeg, riggedPose.LeftLowerLeg, 1, 0.3);
                rigRotation(VRMHumanBoneName.RightUpperLeg, riggedPose.RightUpperLeg, 1, 0.3);
                rigRotation(VRMHumanBoneName.RightLowerLeg, riggedPose.RightLowerLeg, 1, 0.3);
            }
        }
    };

    const onResults = (results: any) => {

        // Draw landmark guides
        drawResults(results); 

        // Animate model
        animateVRM(currentVrm, results); 

    };

    const pose = new Pose({
        locateFile: (file) => {
            if (file.startsWith("pose"))
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`; // by unknown reason. Sometimes holistic file would trying to be loaded in here
        }
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.2,
        minTrackingConfidence: 0.2
    });

    pose.onResults(onResults);

    const drawResults = (results: any) => {

        if (guideCanvas && videoElement) {

            guideCanvas.width = videoElement.videoWidth;
            guideCanvas.height = videoElement.videoHeight;
            let canvasCtx = guideCanvas.getContext("2d");
            if (canvasCtx) {
                canvasCtx.save();
                canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
                // Use `Mediapipe` drawing functions
                drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
                    color: "#00cff7",
                    lineWidth: 4,
                });
                drawLandmarks(canvasCtx, results.poseLandmarks, {
                    color: "#ff0364",
                    lineWidth: 2,
                });
                if (results.faceLandmarks && results.faceLandmarks.length === 478) {
                    //draw pupils
                    drawLandmarks(canvasCtx, [results.faceLandmarks[468], results.faceLandmarks[468 + 5]], {
                        color: "#ffe603",
                        lineWidth: 2,
                    });
                }
                drawLandmarks(canvasCtx, results.leftHandLandmarks, {
                    color: "#00cff7",
                    lineWidth: 2,
                });
                drawLandmarks(canvasCtx, results.rightHandLandmarks, {
                    color: "#ff0364",
                    lineWidth: 2,
                });
            }
        } else {
            console.log("guide canvas not found");
        }
    };

    useEffect(() => {

        guideCanvas = canvasRef.current;
        videoElement = videoRef.current;

        if (drawArea.current) {
            drawArea.current.appendChild(renderer.domElement)
        }

        // Use `Mediapipe` utils to get camera - lower resolution = higher fps
        const videoRefCurrent = videoRef.current 
        if (videoRefCurrent) {
            const camera = new Camera(videoRefCurrent, {
                onFrame: async () => {
                    await pose.send({ image: videoRefCurrent });
                },
                width: 640,
                height: 480,
            });
            camera.start();
        }

    }, [])


    return (
        <div>
            <div>
                <p>Kalido on React</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 10 }}>
                    <video
                        ref={videoRef}
                        style={{
                            zIndex: 9,
                            width: 100,
                            height: 70,
                        }}
                    ></video>
                    <canvas
                        ref={canvasRef}
                        style={{
                            width: 300,
                            height: 210,
                            marginLeft: 10, 
                        }}>
                    </canvas>
                </div>
            </div>
            <div
                id="drawAreaa"
                ref={drawArea}
                style={{
                    width: 300,
                    height: 210,
                    marginLeft: 10, 
                }}>
            </div>

        </div>
    );

}

export default KalidoReact;