import * as THREE from 'three';
import { MeshBasicMaterial } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById("canvas");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 0.1, 1000);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const selectedLayerDOM = document.getElementById("selectedLayer");
let isPlaying = false;
let playSpeed = 1000;

const renderer = new THREE.WebGLRenderer({
	powerPreference: "high-performance",
	antialias: false,
	stencil: false,
	depth: false,	
	canvas:canvas
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls( camera, renderer.domElement);
const cameraStartPos = new THREE.Vector3(0,130,0);
camera.position.set(cameraStartPos.x,cameraStartPos.y,cameraStartPos.z);
controls.update();

var gridSize = {x:100,y:0,z:100};
const rules = {
	underpopulation: 2,
	overpopulation: 3,
	respawnLower: 3,
	respawnUpper: 3
};
var cubes = [];
var deadCubes = []
var drag = false;
var currentYLevel = 0;
var selectionCube;

document.addEventListener("keyup", keydown, false);
window.addEventListener("pointermove", pointerMove );
canvas.addEventListener("mouseup", mousePress);
canvas.addEventListener("mousedown", () => {drag = false});
canvas.addEventListener("mousemove", () => {drag = true});

document.getElementById("Apply").addEventListener("click", start);
document.getElementById("Step").addEventListener("click", step);
document.getElementById("AddLayer").addEventListener("click", addLayer)
document.getElementById("x").value = gridSize.x;
document.getElementById("y").value = gridSize.y;
document.getElementById("z").value = gridSize.z;
document.getElementById("overpop").value = rules.overpopulation;
document.getElementById("underpop").value = rules.underpopulation;
document.getElementById("respawnLower").value = rules.respawnLower;
document.getElementById("respawnUpper").value = rules.respawnUpper;	
document.getElementById("play").addEventListener("click", () => {
	let play = document.getElementById("play");
	isPlaying = !isPlaying;
	if(isPlaying){
		play.innerText = "Stop";
		playLoop();
		return;
	}
	play.innerText = "Play";
});
selectedLayerDOM.addEventListener("change", () => {
	if(selectedLayerDOM.value > gridSize.y-2)
		selectedLayerDOM.value = gridSize.y-2;
	if(selectedLayerDOM.value < 0)
		selectedLayerDOM.value = 0;
	currentYLevel = selectedLayerDOM.value;
});
document.getElementById("resetView").addEventListener("click", () => {
	camera.position.set(cameraStartPos.x,cameraStartPos.y,cameraStartPos.z);
});
controls.addEventListener("change", () => renderer.render(scene, camera));
const delay = ms => new Promise(res => setTimeout(res, ms));
async function playLoop(){
	while(isPlaying){
		step();
		await delay(playSpeed)
	}
}

let point = null;
function pointerMove(event) {
	pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
	pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(pointer, camera);
	let t = (currentYLevel-raycaster.ray.origin.y)/raycaster.ray.direction.y;
	let o = raycaster.ray.origin;
	let d = raycaster.ray.direction;
	point = new THREE.Vector3(o.x+t*d.x,o.y+t*d.y,o.z+t*d.z);
	point.x = Math.round(point.x);
	point.z = Math.round(point.z);
	
	selectionCube.position.set(point.x,currentYLevel,point.z);
	renderer.render(scene, camera);
}
function translatePointCoords(vect){
	let output = new THREE.Vector3(vect.x,vect.y,vect.z);
	output.x = Math.round(output.x+(gridSize.x/2));
	output.z = Math.round(output.z+(gridSize.z/2));
	printVec3(output);
	return output;
}
function translateMatrixCoords(x,y,z){
	let output = new THREE.Vector3(x - Math.round(gridSize.x/2),y,z-Math.round(gridSize.z/2));
	return output;
}
function destroyCube(cube){
	cube.visible = false;
	deadCubes.push(cube);
	//scene.remove(cube);
}
function createCube(point){
	//console.log(deadCubes.length)
	if(deadCubes.length > 0){
		deadCubes[deadCubes.length-1].position.set(point.x,point.y,point.z);
		deadCubes[deadCubes.length-1].updateMatrix();
		deadCubes[deadCubes.length-1].visible = true;
		return deadCubes.pop();
	}
	const geometry = new THREE.BoxGeometry(1, 1, 1);
	const material = new THREE.MeshBasicMaterial( { color: 0x0 } );
	const cube = new THREE.Mesh( geometry, material );
	cube.position.set(point.x,point.y,point.z);
	scene.add(cube);
	cube.matrixAutoUpdate = false;
	cube.updateMatrix();
	return cube;
}
function mousePress(event){
	if(drag)
		return;
	let transPoint = translatePointCoords(point);
	if(cubes[transPoint.x][currentYLevel][transPoint.z] != null){
		destroyCube(cubes[transPoint.x][currentYLevel][transPoint.z])
		cubes[transPoint.x][currentYLevel][transPoint.z] = null;
		return;
	}
	cubes[transPoint.x][currentYLevel][transPoint.z] = createCube(point);
}
function addLayer(){
	for(let x = 0; x < gridSize.x; x++){
		cubes[x].push([]);
		for(let z = 0; z < gridSize.z; z++)
			cubes[x][gridSize.y-1].push(null);
	}
	document.getElementById("y").value = gridSize.y;
	gridSize.y++;
}
function start(){
	while(scene.children.length > 0)
		scene.remove(scene.children[0]);
	
	selectionCube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0x0}));
	scene.add(selectionCube);
	cubes = [];
	gridSize.x = document.getElementById("x").value;
	gridSize.z = document.getElementById("z").value;
	gridSize.y = 1;
	currentYLevel = 0;
	selectedLayerDOM.value = currentYLevel;
	for(let x = 0; x < gridSize.x; x++)
		cubes.push([]);
	addLayer();
}
function getSafeIndex(x,y,z){
	if(x < 0 || y < 0 || z < 0)
		return false;
	if(x >= gridSize.x || y >= gridSize.y || z >= gridSize.z )
		return false;
	return [x,y,z];
}
function countNeighbours(x,y,z){
	let counter = 0;
	for(let x1 = x-1; x1 <= x+1; x1++){
		for(let y1 = y-1; y1 <= y+1; y1++){
			for(let z1 = z-1; z1 <= z+1; z1++){
				let xyz = getSafeIndex(x1,y1-1,z1);
				if(xyz == false || cubes[xyz[0]][xyz[1]][xyz[2]] == null || (x1 == x && y1-1 == y && z1 == z))
					continue;
				counter++;
			}
		}
	}
	return counter;
}
function keydown(event) {
	var keyCode = event.which;
	switch(keyCode){
		case 32: 
			step();
			break;
		case 38:
			currentYLevel = THREE.MathUtils.clamp(currentYLevel+1,0,gridSize.y-2);
			selectedLayerDOM.value = currentYLevel;
			break;
		case 40:
			currentYLevel = THREE.MathUtils.clamp(currentYLevel-1,0,gridSize.y-2);
			selectedLayerDOM.value = currentYLevel;
			break; 	
	}
}
var adjustedCount = [];

function step(){
	adjustedCount = [];
	for(let x = 0; x < gridSize.x; x++)
		for(let y = 0; y < currentYLevel+1; y++)
			for(let z = 0; z < gridSize.z; z++){
				//console.log(x + ' ' + y + " " + z)
				let c = countNeighbours(x,y,z); 
				if(c != 0 || cubes[x][y][z] != null){
					adjustedCount.push({cube:cubes[x][y][z], x:x,y:y,z:z, count:c});
					//console.log(cubes[x][y][z])
				}

			}
		
	rules.overpopulation = document.getElementById("overpop").value;
	rules.underpopulation = document.getElementById("underpop").value;
	rules.respawnLower = document.getElementById("respawnLower").value;
	rules.respawnUpper = document.getElementById("respawnUpper").value;	

	//console.log(adjustedCount);

	for(let i = 0; i < adjustedCount.length; i++){
		let count = adjustedCount[i].count;
		let cube = adjustedCount[i].cube;
		if(cube != null && (count < rules.underpopulation || count > rules.overpopulation)){
			destroyCube(cube);
			cubes[adjustedCount[i].x][adjustedCount[i].y][adjustedCount[i].z] = null;
		}
		else if(count >= rules.respawnLower && count <= rules.respawnUpper && adjustedCount[i].cube == null){
			let newCoords = translateMatrixCoords(adjustedCount[i].x,adjustedCount[i].y,adjustedCount[i].z);
			let cube = createCube({x:newCoords.x,y:newCoords.y,z:newCoords.z});
			cubes[adjustedCount[i].x][adjustedCount[i].y][adjustedCount[i].z] = cube;
		}
	}
	renderer.render(scene, camera);
	/*for(let i = 0; i < scene.children.length; i++){
		console.log(scene.children[i].position);
	}*/
}
function printVec3(v3){
	//console.log("Vec3 " + v3.x + "," +v3.y+","+v3.z);
}
function animate() {
	requestAnimationFrame( animate );

	controls.update();

	//const intersects = raycaster.intersectObjects(scene.children);

	/*if(highlightedObject != null){
		highlightedObject.material.color.set(0x0);
		highlightedObject.material.opacity = wasVisible;
	}*/

	/*for (let i = 0; i < intersects.length; i++) {
		//intersects[i].object.material.color.set(0xff0000);
		
		if(intersects[i].object.position.y == gridSize.y-1){
			intersects[i].object.material.color.set(0xffff00);
			
			highlightedObject = intersects[i].object;
			wasVisib/const intersects = raycaster.intersectObjects(scene.children);

	/*if(highlightedObject != null){
		highlightedObject.material.color.set(0x0);
		highlightedObject.material.opacity = wasVisible;
	}*/

	/*for (let i = 0; i < intersects.length; i++) {
		//intersects[i].object.material.color.set(0xff0000);
		
		if(intersects[i].object.position.y == gridSize.y-1){
			intersects[i].object.material.color.set(0xffff00);
			
			highlightedObject = intersects[i].object;
			wasVisible = highlightedObject.material.opacity;
			highlightedObject.material.opacity = 0.7;
			renderer.render(scene, camera);
			break;
		}
			
	}*/
}

start();