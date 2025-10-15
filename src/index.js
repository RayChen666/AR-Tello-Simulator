/* eslint-disable sort-imports */
import * as THREE from 'three';
import {Text} from 'troika-three-text';
import { XR_BUTTONS } from 'gamepad-wrapper';
import { init } from '../src/init.js';

/* General parameters */
let rightBallObj = null;
let leftBallObj = null;

// text object
let controlActivateText = null;
let controlDeactivateText = null;
let instructionText = null;
let landText = null;
let takeoffText = null;
let upText = null;
let turnLeftText = null;
let turnRightText = null;
let downText = null;
let forwardText = null;
let leftText = null;
let rightText = null;
let backwardText = null;

// button parameter
let landButtonObj = null;
let takeoffButtonObj = null;
let leftControlObj = null;
let rightControlObj = null;
let backgroundObj = null;

/* Define conditional parameters */

// Track control left activation state
let isBallInLeftCircle = false;
let wasBallInLeftCircle = false;
let isLeftCircleYellow = false;
let isLeftControlActive = false;

// Track control right activation state
let isBallInRightCircle = false;
let wasBallInRightCircle = false;
let isRightCircleYellow = false;
let isRightControlActive = false;

// Takeoff button state
let isTakeoffButtonActive = false;
let isBallInTakeoffButton = false;
let wasBallInTakeoffButton = false;
let isTakeoffButtonYellow = false;

// Land button state
let isLandButtonActive = false;
let isBallInLandButton = false;
let wasBallInLandButton = false;
let isLandButtonYellow = false;

// Left control panel interaction
let isOverLeftUpControl = false;
let isOverLeftDownControl = false;
let isOverLeftTurnLeftControl = false;
let isOverLeftTurnRightControl = false;
// Previous states to detect transitions
let wasOverLeftUpControl = false;
let wasOverLeftDownControl = false;
let wasOverLeftTurnLeftControl = false;
let wasOverLeftTurnRightControl = false;

// Right control panel interaction
let isOverRightForwardControl = false;
let isOverRightBackwardControl = false;
let isOverRightLeftControl = false;
let isOverRightRightControl = false;
// Previous states to detect transitions 
let wasOverRightForwardControl = false;
let wasOverRightBackwardControl = false;
let wasOverRightLeftControl = false;
let wasOverRightRightControl = false;

/* Define positional constants parameter */
const ballRadius = 0.05;
const controlActivateButtonRadius = 0.06;
const takeoffButtonRadius = 0.06;
const landButtonRadius = 0.06;
const controlActivateLeftButtonPos = {x: -0.4, y: 0.4, z: -0.2};
const controlActivateRightButtonPos = {x: 0.4, y: 0.4, z: -0.2};
const leftPanelRadius = 0.2;
const rightPanelRadius = 0.2;
const leftPanelCenter = {x:-0.36, y:-0.2, z:-0.4};
const rightPanelCenter = {x:0.36, y:-0.2, z:-0.4};
const takeoffButtonPos = {x: 0.6, y: 0.15, z: 0};
const landButtonPos = {x: -0.6, y: 0.15, z: 0};
// const offsetDirection = new THREE.Vector3(0, 0, -0.1);

/* Texture constants */
const controlActivateLeftButtonMaterial = new THREE.MeshBasicMaterial( { 
        color: 'purple', 
        emissive: 0x440000, // Slight glow
        roughness: 0.3,
        metalness: 0.2
    } ); 
const controlActivateRightButtonMaterial = new THREE.MeshBasicMaterial( { 
        color: 'purple', 
        emissive: 0x440000, // Slight glow
        roughness: 0.3,
        metalness: 0.2
    } ); 
const landButtonMaterial = new THREE.MeshBasicMaterial( { 
        color: 'white', 
        emissive: 0x440000, // Slight glow
        roughness: 0.3,
        metalness: 0.2
    } ); 
const takeoffButtonMaterial = new THREE.MeshBasicMaterial( { 
        color: 'white', 
        emissive: 0x440000, // Slight glow
        roughness: 0.3,
        metalness: 0.2
    } ); 
const controlPanelMaterial = new THREE.MeshBasicMaterial( { 
        color: 'white', 
        emissive: 0x440000, // Slight glow
        roughness: 0.3,
        metalness: 0.2
    } ); 

/* Drone server handling parameters */
let isDroneConnected = false;
let connectionInProgress = false;
let keepAliveInterval = null;
let lastConnectionAttempt = 0;
const CONNECTION_COOLDOWN = 5000; // 5 seconds between attempts
let movementCooldown = false;
const MOVEMENT_COOLDOWN_TIME = 1000; // 1 second cooldown
let hasSentTakeoffCommand = false;
let hasSentLandCommand = false;

// Drone API for interacting with the server
const DroneAPI = {
    connect() {
        connectionInProgress = true;
        console.log("Attempting to connect to drone...");
        
        return new Promise((resolve, reject) => {
            // Create a direct fetch request to the server endpoint
            fetch('/drone/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                console.log("Drone connection response:", data);
                
                if (data.success) {
                    this.startKeepAlive();
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
            .catch(err => {
                isDroneConnected = false;
                reject(err);
            })
            .finally(() => {
                connectionInProgress = false; // Always reset this flag
            });
        });
    },
    
    sendCommand(command) {
        console.log("DroneAPI.sendCommand called with:", command);
        
        return new Promise((resolve, reject) => {
            // Map VR interface commands to drone socket commands
            const commandMap = {
                'takeoff': 'takeoff',
                'land': 'land',
                'up': 'up 50',
                'down': 'down 50',
                'left': 'left 50',
                'right': 'right 50',
                'forward': 'forward 50',
                'backward': 'back 50',
                'rotate_left': 'ccw 45',
                'rotate_right': 'cw 45'
            };
            
            // Translate the command if it exists in the map
            const socketCommand = commandMap[command] || command;
            console.log("Translated command:", socketCommand);
            
            // Make direct fetch request to the server endpoint
            fetch('/drone/control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command: socketCommand })
            })
            .then(response => response.json())
            .then(data => {
                console.log(`Command '${socketCommand}' response:`, data);
                resolve(data.success);
            })
            .catch(err => {
                console.error(`Command '${socketCommand}' error:`, err);
                reject(err);
            });
        });
    },

    startKeepAlive() {
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
        }
        
        console.log("Starting drone keep-alive signal");
        keepAliveInterval = setInterval(() => {
            if (isDroneConnected) {
                this.sendCommand('rc 0 0 0 0')
                    .catch(err => {
                        console.error("Keep-alive error:", err);
                        this.stopKeepAlive();
                    });
            }
        }, 8000); // Every 8 seconds
    },
    
    stopKeepAlive() {
        if (keepAliveInterval) {
            console.log("Stopping drone keep-alive signal");
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
            
            // Optional: Send a command to stop movement
            this.sendCommand('rc 0 0 0 0');
        }
    },

    checkStatus() {
        return new Promise((resolve, reject) => {
            // Make direct fetch request to check status
            fetch('/drone/status')
                .then(response => response.json())
                .then(data => {
                    isDroneConnected = data.connected;
                    resolve(isDroneConnected);
                })
                .catch(err => {
                    console.error('Drone status check error:', err);
                    isDroneConnected = false;
                    reject(err);
                });
        });
    }
};


if (!window.server) {
    window.server = {
        droneConnect() {
            return fetch('/drone/connect', {
                method: 'POST'
            }).then(response => response.json());
        },
        
        droneCommand(command) {
            return fetch('/drone/control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command })
            }).then(response => response.json());
        },
        
        droneStatus() {
            return fetch('/drone/status')
                .then(response => response.json());
        }
    };
}

function setupScene({ scene, camera}) {
    // Control deactivate text
    controlDeactivateText = new Text();
    scene.add(controlDeactivateText);
    controlDeactivateText.text = 'CONTROL DEACTIVATED';
    controlDeactivateText.fontSize = 0.2;
    controlDeactivateText.color =  0x800080; //Medium purple
    controlDeactivateText.position.set(-1.1, 1.2, -1);
    controlDeactivateText.sync();

    // control activate text
    controlActivateText = new Text();
    scene.add(controlActivateText);
    controlActivateText.text = 'CONTROL ACTIVATED';
    controlActivateText.fontSize = 0.2;
    controlActivateText.color = 0xFFFF00; // Yellow
    controlActivateText.position.set(-0.98, 1.2, -1);
    controlActivateText.sync();

    // Instrution text
    instructionText = new Text();
    scene.add(instructionText);
    instructionText.fontSize = 0.1;
    instructionText.text = ' To activate TELLO control \nmove both controller balls \n       into circles above';
    instructionText.color = 'white';
    instructionText.position.set(-0.6, 0.2, -0.7);
    instructionText.sync();

    // land text
    landText = new Text();
    scene.add(landText);
    landText.fontSize = 0.05;
    landText.text = 'LAND';
    landText.color = 'white';
    landText.position.set(-0.632, 0.3, 0.054);
    landText.rotateY(Math.PI / 3);
    landText.sync();

    // takeoff text
    takeoffText = new Text();
    scene.add(takeoffText);
    takeoffText.fontSize = 0.05;
    takeoffText.text = 'TAKEOFF';
    takeoffText.color = 'white';
    takeoffText.position.set(0.55, 0.3, -0.085);
    takeoffText.rotateY(-Math.PI / 3);
    takeoffText.sync();

    // Add background
    const background = new THREE.PlaneGeometry(6, 6);
    const backgroundMaterial = new THREE.MeshStandardMaterial({ color: 'black' });
    backgroundObj = new THREE.Mesh(background, backgroundMaterial);
    scene.add(backgroundObj);
    backgroundObj.rotateZ(-Math.PI / 2);
    backgroundObj.position.set(0,0,-2);

    // Add left activation button
    const controlActivateLeftButton = new THREE.TorusGeometry( 10, 1, 16, 100 ); 
    const controlActivateLeftButtonObj = new THREE.Mesh( controlActivateLeftButton, controlActivateLeftButtonMaterial ); 
    scene.add( controlActivateLeftButtonObj );
    controlActivateLeftButtonObj.position.set(-0.4, 0.4, -0.2);
    controlActivateLeftButtonObj.scale.set(0.006,0.006,0.006); 
    controlActivateLeftButtonObj.rotateY(Math.PI / 6);

    // Add right activation button
    const controlActivateRightButton = new THREE.TorusGeometry( 10, 1, 16, 100 ); 
    const controlActivateRightButtonObj = new THREE.Mesh(controlActivateRightButton, controlActivateRightButtonMaterial); 
    scene.add(controlActivateRightButtonObj);
    controlActivateRightButtonObj.position.set(0.4, 0.4, -0.2);
    controlActivateRightButtonObj.scale.set(0.006,0.006,0.006);
    controlActivateRightButtonObj.rotateY(-Math.PI / 6);

    // Add land button
    const landButton = new THREE.TorusGeometry( 10, 0.5, 16, 100 ); 
    landButtonObj = new THREE.Mesh(landButton, landButtonMaterial);
    scene.add(landButtonObj);
    landButtonObj.position.set(-0.6, 0.15, 0);
    landButtonObj.scale.set(0.006,0.006,0.006);
    landButtonObj.rotateY(Math.PI / 3);

    // add takeoff button
    const takeoffButton = new THREE.TorusGeometry( 10, 0.5, 16, 100 );
    takeoffButtonObj = new THREE.Mesh(takeoffButton, takeoffButtonMaterial);
    scene.add(takeoffButtonObj);
    takeoffButtonObj.position.set(0.6, 0.15, 0);
    takeoffButtonObj.scale.set(0.006,0.006,0.006);
    takeoffButtonObj.rotateY(-Math.PI / 3);

    // add left control panel
    const leftControl = new THREE.TorusGeometry( 10, 0.1, 16, 100 );
    leftControlObj = new THREE.Mesh(leftControl, controlPanelMaterial);
    scene.add(leftControlObj);
    leftControlObj.position.set(-0.36, -0.2, -0.4);
    leftControlObj.scale.set(0.02, 0.02, 0.02);

    // add right control panel
    const rightControl = new THREE.TorusGeometry( 10, 0.1, 16, 100 );
    rightControlObj = new THREE.Mesh(rightControl, controlPanelMaterial);
    scene.add(rightControlObj);
    rightControlObj.position.set(0.36, -0.2, -0.4);
    rightControlObj.scale.set(0.02, 0.02, 0.02);

    // add control direction texts
    upText = new Text();
    scene.add(upText);
    upText.fontSize = 0.05;
    upText.text = 'U---P';
    upText.color = 'white';
    upText.position.set(-0.42, 0, -0.4);
    upText.sync();

    downText = new Text();
    scene.add(downText);
    downText.fontSize = 0.05;
    downText.text = 'DWN';
    downText.color = 'white';
    downText.position.set(-0.42, -0.32, -0.4);
    downText.sync();

    turnLeftText = new Text();
    scene.add(turnLeftText);
    turnLeftText.fontSize = 0.05;
    turnLeftText.text = 'TNL';
    turnLeftText.color = 'white';
    turnLeftText.position.set(-0.55, -0.16, -0.4);
    turnLeftText.sync();

    turnRightText = new Text();
    scene.add(turnRightText);
    turnRightText.fontSize = 0.05;
    turnRightText.text = 'TNR';
    turnRightText.color = 'white';
    turnRightText.position.set(-0.265, -0.16, -0.4);
    turnRightText.sync();

    leftText = new Text();
    scene.add(leftText);
    leftText.fontSize = 0.05;
    leftText.text = 'LFT';
    leftText.color = 'white';
    leftText.position.set(0.17, -0.16, -0.4);
    leftText.sync();
    
    rightText = new Text();
    scene.add(rightText);
    rightText.fontSize = 0.05;
    rightText.text = 'RIT';
    rightText.color = 'white';
    rightText.position.set(0.47, -0.16, -0.4);
    rightText.sync();

    forwardText = new Text();
    scene.add(forwardText);
    forwardText.fontSize = 0.05;
    forwardText.text = 'FWD';
    forwardText.color = 'white';
    forwardText.position.set(0.31, 0, -0.4);
    forwardText.sync();

    backwardText = new Text();
    scene.add(backwardText);
    backwardText.fontSize = 0.05;
    backwardText.text = 'BWD';
    backwardText.color = 'white';
    backwardText.position.set(0.31, -0.32, -0.4);
    backwardText.sync();

    // Left controller ball
    const leftBall = new THREE.SphereGeometry(ballRadius); 
    const leftBallMaterial = new THREE.MeshStandardMaterial({ 
        color: 'green',  // green color
        emissive: 0x440000, // Slight glow
        roughness: 0.3,
        metalness: 0.2
    });
    leftBallObj = new THREE.Mesh(leftBall, leftBallMaterial);
    leftBallObj.name = 'leftBall';
    leftBallObj.position.set(0,0,0);
    leftBallObj.scale.set(0,0,0);
    scene.add(leftBallObj);

    // Right controller ball
    const rightBall = new THREE.SphereGeometry(0.05); 
    const rightBallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,  // Red color
        emissive: 0x440000, // Slight glow
        roughness: 0.3,
        metalness: 0.2
    });
    rightBallObj = new THREE.Mesh(rightBall, rightBallMaterial);
    rightBallObj.name = 'rightBall';
    rightBallObj.position.set(0,0,0);
    rightBallObj.scale.set(0,0,0);
    scene.add(rightBallObj);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
}



function onFrame(delta, time, {scene, camera, renderer, player, controllers }){

    if (controllers.left) {
        const { gamepad, raySpace } = controllers.left;
        // Make left controller ball appears
        if (leftBallObj){
            raySpace.getWorldPosition(leftBallObj.position);
            // Optional: offset the ball slightly in front of the controller
            const offsetDirection = new THREE.Vector3(0, 0, -0.1);
            offsetDirection.applyQuaternion(raySpace.quaternion);
            leftBallObj.position.add(offsetDirection);
            
            // Scale based on trigger state - pressed = visible, released = invisible
            if (gamepad.getButton(XR_BUTTONS.TRIGGER)) {
                // Scale up to 1 if trigger is pressed (can animate this for smoother transition)
                leftBallObj.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 8);
                // ball position during animation
                const leftBallPos = leftBallObj.position;
                // check if the ball is inside the left activation button
                const dx = leftBallPos.x - controlActivateLeftButtonPos.x;
                const dy = leftBallPos.y - controlActivateLeftButtonPos.y;
                const dz = leftBallPos.z - controlActivateLeftButtonPos.z;
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                isBallInLeftCircle = distance < (controlActivateButtonRadius - ballRadius * 0.8);
                
                if(isBallInLeftCircle && !wasBallInLeftCircle){
                    isLeftCircleYellow = !isLeftCircleYellow;
                }
                // Update previous state
                wasBallInLeftCircle = isBallInLeftCircle;

                if (isLeftControlActive && isRightControlActive){
                    // calculate distance btw ball to left panel center
                    const lpx = leftBallPos.x - leftPanelCenter.x;
                    const lpy = leftBallPos.y - leftPanelCenter.y;
                    const lpz = leftBallPos.z - leftPanelCenter.z;
                    const leftPanelDistance = Math.sqrt(lpx*lpx + lpy*lpy + lpz*lpz);

                    // check if ball within the panel radius
                    if (leftPanelDistance < leftPanelRadius){
                        const normalizedX = lpx / leftPanelRadius;
                        const normalizedY = lpy / leftPanelRadius;

                        // Reset all states
                        isOverLeftUpControl = false;
                        isOverLeftDownControl = false;
                        isOverLeftTurnLeftControl = false;
                        isOverLeftTurnRightControl = false;

                        if (normalizedY > 0.5){
                            isOverLeftUpControl = true;
                        } else if (normalizedY < -0.5){
                            isOverLeftDownControl = true;
                        } else if(normalizedX < -0.5){
                            isOverLeftTurnLeftControl = true;
                        } else if (normalizedX > 0.5) {
                            isOverLeftTurnRightControl = true;
                        }

                        // highLight the active region
                        if (isOverLeftUpControl){
                            upText.color = 'yellow';
                        } else{
                            upText.color = 'white';
                        }
                        if (isOverLeftDownControl){
                            downText.color = 'yellow';
                        }else{
                            downText.color = 'white';
                        }
                        if (isOverLeftTurnLeftControl){
                            turnLeftText.color = 'yellow';
                        }else{
                            turnLeftText.color = 'white';
                        }
                        if (isOverLeftTurnRightControl){
                            turnRightText.color = 'yellow';
                        } else{
                            turnRightText.color = 'white';
                        }

                        // Detect transitions and send commands if not in cooldown
                        if (!movementCooldown) {
                            if (isOverLeftUpControl && !wasOverLeftUpControl) {
                                console.log("Sending UP command");
                                DroneAPI.sendCommand('up')
                                    .then(() => {
                                        console.log("UP command sent successfully");
                                    })
                                    .catch(err => {
                                        console.error("Failed to send UP command:", err);
                                    });
                                
                                // Set cooldown
                                movementCooldown = true;
                                setTimeout(() => {
                                    movementCooldown = false;
                                }, MOVEMENT_COOLDOWN_TIME);
                            }
                            
                            if (isOverLeftDownControl && !wasOverLeftDownControl) {
                                console.log("Sending DOWN command");
                                DroneAPI.sendCommand('down')
                                    .then(() => {
                                        console.log("DOWN command sent successfully");
                                    })
                                    .catch(err => {
                                        console.error("Failed to send DOWN command:", err);
                                    });
                                
                                movementCooldown = true;
                                setTimeout(() => {
                                    movementCooldown = false;
                                }, MOVEMENT_COOLDOWN_TIME);
                            }
                            
                            if (isOverLeftTurnLeftControl && !wasOverLeftTurnLeftControl) {
                                console.log("Sending TURN LEFT command");
                                DroneAPI.sendCommand('rotate_left')
                                    .then(() => {
                                        console.log("TURN LEFT command sent successfully");
                                    })
                                    .catch(err => {
                                        console.error("Failed to send TURN LEFT command:", err);
                                    });
                                
                                movementCooldown = true;
                                setTimeout(() => {
                                    movementCooldown = false;
                                }, MOVEMENT_COOLDOWN_TIME);
                            }
                            
                            if (isOverLeftTurnRightControl && !wasOverLeftTurnRightControl) {
                                console.log("Sending TURN RIGHT command");
                                DroneAPI.sendCommand('rotate_right')
                                    .then(() => {
                                        console.log("TURN RIGHT command sent successfully");
                                    })
                                    .catch(err => {
                                        console.error("Failed to send TURN RIGHT command:", err);
                                    });
                                
                                movementCooldown = true;
                                setTimeout(() => {
                                    movementCooldown = false;
                                }, MOVEMENT_COOLDOWN_TIME);
                            }
                        }
                    }

                    // Update previous states
                    wasOverLeftUpControl = isOverLeftUpControl;
                    wasOverLeftDownControl = isOverLeftDownControl;
                    wasOverLeftTurnLeftControl = isOverLeftTurnLeftControl;
                    wasOverLeftTurnRightControl = isOverLeftTurnRightControl;

                    // check ball in land button
                    const lx = leftBallPos.x - landButtonPos.x;
                    const ly = leftBallPos.y - landButtonPos.y;
                    const lz = leftBallPos.z - landButtonPos.z;
                    const lDistance = Math.sqrt(lx*lx + ly*ly + lz*lz);
                    isBallInLandButton = lDistance < (landButtonRadius - ballRadius * 0.8);
                    if(isBallInLandButton && !wasBallInLandButton) {
                        isLandButtonYellow = !isLandButtonYellow;
                        if (isLandButtonYellow) {
                            isTakeoffButtonYellow = false;
                            hasSentTakeoffCommand = false;

                            if (!hasSentLandCommand) {
                                console.log("Sending land command to drone");
                                DroneAPI.sendCommand('land').then(() => {
                                    console.log("Land command successfully sent");
                                    // Confirm command was sent successfully
                                    hasSentLandCommand = true;
                                                            
                                    // Stop keep-alive
                                    DroneAPI.stopKeepAlive();
                                }).catch((err) => {
                                    // Handle potential command failure
                                    console.error("Land command failed:", err);
                                    hasSentLandCommand = false;
                                    isLandButtonYellow = false;
                                });
                            }
                        }else{
                            hasSentLandCommand = false;
                        }
                    }
                    wasBallInLandButton = isBallInLandButton;
                } else{
                    isBallInLandButton = false;
                    wasBallInLandButton = false;
                } // END of land button check

            } else {
                // Scale down to 0 if trigger is not pressed
                leftBallObj.scale.lerp(new THREE.Vector3(0, 0, 0), delta * 8);
                isBallInLeftCircle = false;
                wasBallInLeftCircle = false;

                isOverLeftUpControl = false;
                isOverLeftDownControl = false;
                isOverLeftTurnLeftControl = false;
                isOverLeftTurnRightControl = false;

                wasOverLeftUpControl = false;
                wasOverLeftDownControl = false;
                wasOverLeftTurnLeftControl = false;
                wasOverLeftTurnRightControl = false;
            }
            if (isLeftCircleYellow){
                controlActivateLeftButtonMaterial.color.set('yellow');
                isLeftControlActive = true;
            }else{
                controlActivateLeftButtonMaterial.color.set('purple');
                isLeftControlActive = false;
            }
        }
    }


    if (controllers.right) {
        const { gamepad, raySpace } = controllers.right;

        // Make right controller ball appears
        if (rightBallObj){
            raySpace.getWorldPosition(rightBallObj.position);
            // Optional: offset the ball slightly in front of the controller
            const offsetDirection = new THREE.Vector3(0, 0, -0.1);
            offsetDirection.applyQuaternion(raySpace.quaternion);
            rightBallObj.position.add(offsetDirection);
            
            // Scale based on trigger state - pressed = visible, released = invisible
            if (gamepad.getButton(XR_BUTTONS.TRIGGER)) {
                // Scale up to 1 if trigger is pressed (can animate this for smoother transition)
                rightBallObj.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 8);
                const rightBallPos = rightBallObj.position;
                const dx = rightBallPos.x - controlActivateRightButtonPos.x;
                const dy = rightBallPos.y - controlActivateRightButtonPos.y;
                const dz = rightBallPos.z - controlActivateRightButtonPos.z;
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                isBallInRightCircle = distance < (controlActivateButtonRadius - ballRadius * 0.8);
                if(isBallInRightCircle && !wasBallInRightCircle){
                    isRightCircleYellow = !isRightCircleYellow;
                }
                // Update previous state
                wasBallInRightCircle = isBallInRightCircle;

                if (isLeftControlActive && isRightControlActive){
                    // calculate distance btw ball to left panel center
                    const rpx = rightBallPos.x - rightPanelCenter.x;
                    const rpy = rightBallPos.y - rightPanelCenter.y;
                    const rpz = rightBallPos.z - rightPanelCenter.z;
                    const rightPanelDistance = Math.sqrt(rpx*rpx + rpy*rpy + rpz*rpz);

                    // check if ball within the panel radius
                    if (rightPanelDistance < rightPanelRadius){
                        const normalizedX = rpx / rightPanelRadius;
                        const normalizedY = rpy / rightPanelRadius;

                        // Reset all states
                        isOverRightForwardControl = false;
                        isOverRightBackwardControl = false;
                        isOverRightLeftControl = false;
                        isOverRightRightControl = false;

                        if (normalizedY > 0.5){
                            isOverRightForwardControl = true;
                        } else if (normalizedY < -0.5){
                            isOverRightBackwardControl = true;
                        } else if(normalizedX < -0.5){
                            isOverRightLeftControl = true;
                        } else if (normalizedX > 0.5) {
                            isOverRightRightControl = true;
                        }

                        // highLight the active region
                        if (isOverRightForwardControl){
                            forwardText.color = 'yellow';
                        } else{
                            forwardText.color = 'white';
                        }
                        if (isOverRightLeftControl){
                            leftText.color = 'yellow';
                        }else{
                            leftText.color = 'white';
                        }
                        if (isOverRightRightControl){
                            rightText.color = 'yellow';
                        }else{
                            rightText.color = 'white';
                        }
                        if (isOverRightBackwardControl){
                            backwardText.color = 'yellow';
                        } else{
                            backwardText.color = 'white';
                        }


                        if (!movementCooldown) {
                            if (isOverRightForwardControl && !wasOverRightForwardControl) {
                                console.log("Sending FORWARD command");
                                DroneAPI.sendCommand('forward')
                                    .then(() => {
                                        console.log("FORWARD command sent successfully");
                                    })
                                    .catch(err => {
                                        console.error("Failed to send FORWARD command:", err);
                                    });
                                
                                // Set cooldown
                                movementCooldown = true;
                                setTimeout(() => {
                                    movementCooldown = false;
                                }, MOVEMENT_COOLDOWN_TIME);
                            }
                            
                            if (isOverRightBackwardControl && !wasOverRightBackwardControl) {
                                console.log("Sending BACKWARD command");
                                DroneAPI.sendCommand('backward')
                                    .then(() => {
                                        console.log("BACKWARD command sent successfully");
                                    })
                                    .catch(err => {
                                        console.error("Failed to send BACKWARD command:", err);
                                    });
                                
                                movementCooldown = true;
                                setTimeout(() => {
                                    movementCooldown = false;
                                }, MOVEMENT_COOLDOWN_TIME);
                            }
                            
                            if (isOverRightLeftControl && !wasOverRightLeftControl) {
                                console.log("Sending LEFT command");
                                DroneAPI.sendCommand('left')
                                    .then(() => {
                                        console.log("LEFT command sent successfully");
                                    })
                                    .catch(err => {
                                        console.error("Failed to send LEFT command:", err);
                                    });
                                
                                movementCooldown = true;
                                setTimeout(() => {
                                    movementCooldown = false;
                                }, MOVEMENT_COOLDOWN_TIME);
                            }
                            
                            if (isOverRightRightControl && !wasOverRightRightControl) {
                                console.log("Sending RIGHT command");
                                DroneAPI.sendCommand('right')
                                    .then(() => {
                                        console.log("RIGHT command sent successfully");
                                    })
                                    .catch(err => {
                                        console.error("Failed to send RIGHT command:", err);
                                    });
                                
                                movementCooldown = true;
                                setTimeout(() => {
                                    movementCooldown = false;
                                }, MOVEMENT_COOLDOWN_TIME);
                            }
                        }

                    }

                    // Update previous states
                    wasOverRightForwardControl = isOverRightForwardControl;
                    wasOverRightBackwardControl = isOverRightBackwardControl;
                    wasOverRightLeftControl = isOverRightLeftControl;
                    wasOverRightRightControl = isOverRightRightControl;

                    // check ball in takeoff button
                    const tx = rightBallPos.x - takeoffButtonPos.x;
                    const ty = rightBallPos.y - takeoffButtonPos.y;
                    const tz = rightBallPos.z - takeoffButtonPos.z;
                    const tDistance = Math.sqrt(tx*tx + ty*ty + tz*tz);
                    isBallInTakeoffButton = tDistance < (takeoffButtonRadius - ballRadius * 0.8);
                    if (isBallInTakeoffButton && !wasBallInTakeoffButton){
                        isTakeoffButtonYellow = !isTakeoffButtonYellow;
                        if (isTakeoffButtonYellow) {
                            isLandButtonYellow = false;
                            hasSentLandCommand = false;
                            if (!hasSentTakeoffCommand) {
                                console.log("Sending takeoff command to drone");

                                DroneAPI.sendCommand('takeoff').then(() => {
                                    console.log("Takeoff command successfully sent");
                                    hasSentTakeoffCommand = true;
                                    DroneAPI.startKeepAlive();
                                }).catch((err) => {
                                    // Handle potential command failure
                                    console.error("Takeoff command failed:", err);
                                    hasSentTakeoffCommand = false;
                                    isTakeoffButtonYellow = false; 
                                });
                            }

                        }else{
                            hasSentTakeoffCommand = false;
                        }
                    }
                    wasBallInTakeoffButton = isBallInTakeoffButton;

                } else{
                    isBallInTakeoffButton = false;
                    wasBallInTakeoffButton = false;
                } // END of takeoff button check

            } else {
                // Scale down to 0 if trigger is not pressed
                rightBallObj.scale.lerp(new THREE.Vector3(0, 0, 0), delta * 8);
                isBallInRightCircle = false;
                wasBallInRightCircle = false;

                // Reset control panel states when trigger released
                isOverRightForwardControl = false;
                isOverRightBackwardControl = false;
                isOverRightLeftControl = false;
                isOverRightRightControl = false;

                wasOverRightForwardControl = false;
                wasOverRightBackwardControl = false;
                wasOverRightLeftControl = false;
                wasOverRightRightControl = false;
            }
            if (isRightCircleYellow){
                controlActivateRightButtonMaterial.color.set('yellow');
                isRightControlActive = true;
            }else{
                controlActivateRightButtonMaterial.color.set('purple');
                isRightControlActive = false;
            }

        }      
    }

    // change indication of land and takeoff button
    if (isTakeoffButtonYellow){
        takeoffText.color = 'yellow';
        takeoffButtonMaterial.color.set('yellow');
        isTakeoffButtonActive = true;
    } else{
        takeoffText.color = 'white';
        takeoffButtonMaterial.color.set('white');
        isTakeoffButtonActive = false;
    }

    if (isLandButtonYellow){
        landText.color = 'yellow';
        landButtonMaterial.color.set('yellow');
        isLandButtonActive = true;
    } else{
        landText.color = 'white';
        landButtonMaterial.color.set('white');
        isLandButtonActive = false;
    }

    // Update control activate / deactivate text
    if (isLeftControlActive && isRightControlActive) {

        backgroundObj.scale.set(0,0,0);
        controlDeactivateText.scale.set(0, 0, 0);
        controlActivateText.scale.set(1,1,1);
        
        instructionText.scale.set(0,0,0);
        landText.scale.set(1,1,1);
        takeoffText.scale.set(1,1,1);
        landButtonObj.scale.set(0.006,0.006,0.006);
        takeoffButtonObj.scale.set(0.006,0.006,0.006);

        leftControlObj.scale.set(0.02,0.02,0.02);
        upText.scale.set(1,1,1);
        downText.scale.set(1,1,1);
        turnLeftText.scale.set(1,1,1);
        turnRightText.scale.set(1,1,1);

        rightControlObj.scale.set(0.02,0.02,0.02);
        forwardText.scale.set(1,1,1);
        leftText.scale.set(1,1,1);
        rightText.scale.set(1,1,1);
        backwardText.scale.set(1,1,1);

    } else{

        backgroundObj.scale.set(1,1,1);
        controlDeactivateText.scale.set(1, 1, 1);
        controlActivateText.scale.set(0,0,0);

        instructionText.scale.set(1,1,1);
        landText.scale.set(0,0,0);
        takeoffText.scale.set(0,0,0);
        landButtonObj.scale.set(0,0,0);
        takeoffButtonObj.scale.set(0,0,0);

        leftControlObj.scale.set(0,0,0);
        upText.scale.set(0,0,0);
        downText.scale.set(0,0,0);
        turnLeftText.scale.set(0,0,0);
        turnRightText.scale.set(0,0,0);

        rightControlObj.scale.set(0,0,0);
        forwardText.scale.set(0,0,0);
        leftText.scale.set(0,0,0);
        rightText.scale.set(0,0,0);
        backwardText.scale.set(0,0,0);

    }

    // handle drone connect API call
    const now = Date.now();
    // Check if both control buttons are active and we should connect to the drone
    if (isLeftControlActive && isRightControlActive && 
            !isDroneConnected && !connectionInProgress) {
        if (now - lastConnectionAttempt > CONNECTION_COOLDOWN){
            lastConnectionAttempt = now;
            connectionInProgress = true;
            console.log("Attempting drone connection...");
                    
            // Try to connect to the drone
            DroneAPI.connect();
        }
    }

}

init(setupScene, onFrame);