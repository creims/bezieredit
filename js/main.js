import * as THREE from "./three.module.js";
import { OrbitControls } from "./OrbitControls.js";

const COLOR_PRIMARY = 0x00aa00;
const COLOR_SECONDARY = 0x0044ff;
const COLOR_SELECTED = 0xff0000;

var renderer, scene, camera, loader, raycaster, controls;
var cameraTargetReticule, bezierCurve, draggingPlane, axes;

var selectedObject = undefined;

var mouse = {
    dragging: false,
    pos: new THREE.Vector2(),
};

function init() {
    // scene, cam, renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(5, 0, 0);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Texture loader
    loader = new THREE.TextureLoader();

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.rotateSpeed = 3.0;
    controls.panSpeed = 3.0;
    controls.zoomSpeed = 3.0;
    controls.screenSpacePanning = true;
    
    controls.update();
    
    // Raycaster
    raycaster = new THREE.Raycaster();
    
    initScene();
    
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
}

function setRayCaster() {
    mouse.pos.x = (event.clientX / window.innerWidth ) * 2 - 1;
	mouse.pos.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse.pos, camera);
}

function onDocumentMouseDown(e) {
    e.preventDefault();
    
    setRayCaster();
    var intersectedObjects = raycaster.intersectObjects(bezierCurve.children);
    if(intersectedObjects.length > 0) {
        selectObject(intersectedObjects[0].object);
        mouse.dragging = true;
        controls.enabled = false;
    }
}

function onDocumentMouseUp(e) {
    e.preventDefault();
    mouse.dragging = false;
    controls.enabled = true;
}

function onDocumentMouseMove(e) {
    e.preventDefault();
    if(mouse.dragging) {
        updatedSelectedPosition();
    }
}

function updatedSelectedPosition() {
    setRayCaster();
    var intersection = raycaster.intersectObject(draggingPlane);
    selectedObject.position.copy(intersection[0].point);
    axes.position.copy(selectedObject.position);
    renderCurve(selectedObject.parent);
}

function controlPoint(x, y, z, color = COLOR_PRIMARY) {
    var geometry = new THREE.SphereBufferGeometry(0.1, 32, 32);
    var material = new THREE.MeshBasicMaterial( {color: color} );
    var sphere = new THREE.Mesh(geometry, material);
    
    sphere.position.set(x, y, z);
    
    return sphere;
}

function addCurve() {
    bezierCurve = new THREE.Group();
    
    bezierCurve.add(controlPoint(0, -2, 0));
    bezierCurve.add(controlPoint(-1, -0.5, 0, COLOR_SECONDARY));
    bezierCurve.add(controlPoint(0, 1, 3, COLOR_SECONDARY));
    bezierCurve.add(controlPoint(1, 2, 2));
    
    scene.add(bezierCurve);
    
    renderCurve(bezierCurve);
}

function renderCurve(curve) {
    var curvePts = curve.children;
    
    var cubic = new THREE.CubicBezierCurve3(
        curvePts[0].position, curvePts[1].position,
        curvePts[2].position, curvePts[3].position
    );

    var points = cubic.getPoints(50);
    var geometry = new THREE.BufferGeometry().setFromPoints(points);

    var material = new THREE.LineBasicMaterial({ color : 0xff0000 });

    var curveObject = new THREE.Line(geometry, material);
    
    if(curve.currentRender) scene.remove(curve.currentRender);
    curve.currentRender = curveObject;
    
    scene.add(curveObject);
}

function selectObject(obj) {
    if(selectedObject != obj) {
        if(selectedObject !== undefined) selectedObject.material.color.setHex(selectedObject.originalColor);

        selectedObject = obj;
        selectedObject.originalColor = selectedObject.material.color.getHex();
        selectedObject.material.color.setHex(COLOR_SELECTED);
        axes.position.copy(obj.position);
    } 
    
    // Point plane at the camera, then move it to the object's location
    // so we can drag it at the proper distance
    draggingPlane.position.copy(controls.target);
    draggingPlane.lookAt(camera.position);
    draggingPlane.position.copy(selectedObject.position);
}

function initScene() {
    // Skybox
    var materialArray = [
        new THREE.MeshBasicMaterial( { map: loader.load('images/purple-nebula-skybox_right1.png') }),
        new THREE.MeshBasicMaterial( { map: loader.load('images/purple-nebula-skybox_left2.png') }),
        new THREE.MeshBasicMaterial( { map: loader.load('images/purple-nebula-skybox_top3.png') }),
        new THREE.MeshBasicMaterial( { map: loader.load('images/purple-nebula-skybox_bottom4.png') }),
        new THREE.MeshBasicMaterial( { map: loader.load('images/purple-nebula-skybox_front5.png') }),
        new THREE.MeshBasicMaterial( { map: loader.load('images/purple-nebula-skybox_back6.png') })
    ];
    
    for (var i = 0; i < 6; i++)
       materialArray[i].side = THREE.BackSide;

    var skyboxGeom = new THREE.CubeGeometry(5000, 5000, 5000, 1, 1, 1);
    var skybox = new THREE.Mesh(skyboxGeom, materialArray);
    scene.add(skybox);
    
    // Directional light
    var light = new THREE.DirectionalLight(0xffffff, 1);
	light.position.set(1, 1, 1).normalize();
	scene.add(light);
    
    // Reticule indicating the camera target
    var dotGeometry = new THREE.Geometry();
    dotGeometry.vertices.push(new THREE.Vector3());
    var dotMaterial = new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, color: 0xFF0000 });
    cameraTargetReticule
       = new THREE.Points(dotGeometry, dotMaterial);
    scene.add(cameraTargetReticule);
        
    // Axes - these are moved to selected objects
    axes = new THREE.AxesHelper(0.5);
    scene.add(axes);
    
    // Plane to allow us to drag objects intuitively
    draggingPlane = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000));
    draggingPlane.visible = false;
    scene.add(draggingPlane);
    
    // Curve
    addCurve();
}

function animate() {
    requestAnimationFrame(animate);
    
    controls.update();
    cameraTargetReticule.position.set(controls.target.x, controls.target.y, controls.target.z);
    
    renderer.render(scene, camera);
}

init();
animate();