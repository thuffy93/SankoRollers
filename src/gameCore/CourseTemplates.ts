// src/gameCore/CourseTemplates.ts
import * as THREE from 'three';
import { CourseElementType } from './CourseGenerator';

/**
 * Collection of predefined courses
 */

/**
 * Basic tutorial course
 */
export function createTutorialCourse() {
  return {
    name: "Tutorial Course",
    terrain: {
      width: 30,
      height: 30
    },
    startPosition: new THREE.Vector3(0, 1, -10),
    par: 3,
    elements: [
      // Walls to enclose the course
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(0, 1, 15),
        scale: new THREE.Vector3(30, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(0, 1, -15),
        scale: new THREE.Vector3(30, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(15, 1, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: new THREE.Vector3(30, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(-15, 1, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: new THREE.Vector3(30, 2, 1)
      },
      
      // A single target to learn targeting
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(0, 1, 0),
        properties: { radius: 0.6 }
      },
      
      // Hole (only appears when all targets are hit)
      {
        type: CourseElementType.HOLE,
        position: new THREE.Vector3(0, 0, 10)
      }
    ]
  };
}

/**
 * Standard course
 */
export function createStandardCourse() {
  return {
    name: "Standard Course",
    terrain: {
      width: 30,
      height: 30
    },
    startPosition: new THREE.Vector3(0, 1, 0),
    par: 3,
    elements: [
      // Walls to enclose the course
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(0, 1, 15),
        scale: new THREE.Vector3(30, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(0, 1, -15),
        scale: new THREE.Vector3(30, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(15, 1, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: new THREE.Vector3(30, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(-15, 1, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: new THREE.Vector3(30, 2, 1)
      },
      
      // Obstacles
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(5, 1, 5),
        rotation: new THREE.Euler(0, Math.PI / 4, 0),
        scale: new THREE.Vector3(8, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(-5, 1, -5),
        rotation: new THREE.Euler(0, Math.PI / 4, 0),
        scale: new THREE.Vector3(8, 2, 1)
      },
      
      // Bumper
      {
        type: CourseElementType.BUMPER,
        position: new THREE.Vector3(8, 1, -8),
        properties: { radius: 1 }
      },
      
      // Sand trap
      {
        type: CourseElementType.SAND_TRAP,
        position: new THREE.Vector3(-8, 0.05, 8),
        scale: new THREE.Vector3(5, 0.1, 5)
      },
      
      // Boost pad
      {
        type: CourseElementType.BOOST_PAD,
        position: new THREE.Vector3(-10, 0.05, -10),
        scale: new THREE.Vector3(3, 0.1, 3)
      },
      
      // Targets
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(10, 1, 0),
        properties: { radius: 0.6 }
      },
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(-10, 1, 0),
        properties: { radius: 0.6 }
      },
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(0, 1, 10),
        properties: { radius: 0.6 }
      },
      
      // Hole (only appears when all targets are hit)
      {
        type: CourseElementType.HOLE,
        position: new THREE.Vector3(0, 0, -10)
      }
    ]
  };
}

/**
 * Advanced course with more obstacles and complexity
 */
export function createAdvancedCourse() {
  return {
    name: "Advanced Course",
    terrain: {
      width: 40,
      height: 40
    },
    startPosition: new THREE.Vector3(-15, 1, -15),
    par: 5,
    elements: [
      // Walls to enclose the course
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(0, 1, 20),
        scale: new THREE.Vector3(40, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(0, 1, -20),
        scale: new THREE.Vector3(40, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(20, 1, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: new THREE.Vector3(40, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(-20, 1, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: new THREE.Vector3(40, 2, 1)
      },
      
      // Center maze
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(0, 1, 7),
        scale: new THREE.Vector3(20, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(0, 1, -7),
        scale: new THREE.Vector3(20, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(5, 1, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: new THREE.Vector3(14, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(-5, 1, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: new THREE.Vector3(14, 2, 1)
      },
      
      // Bumper pathway
      {
        type: CourseElementType.BUMPER,
        position: new THREE.Vector3(10, 1, 10),
        properties: { radius: 1 }
      },
      {
        type: CourseElementType.BUMPER,
        position: new THREE.Vector3(13, 1, 13),
        properties: { radius: 1 }
      },
      {
        type: CourseElementType.BUMPER,
        position: new THREE.Vector3(16, 1, 16),
        properties: { radius: 1 }
      },
      
      // Sand trap zone
      {
        type: CourseElementType.SAND_TRAP,
        position: new THREE.Vector3(-10, 0.05, 10),
        scale: new THREE.Vector3(8, 0.1, 8)
      },
      
      // Ice zone (slippery)
      {
        type: CourseElementType.SAND_TRAP, // Using sand trap for now, needs ICE implementation
        position: new THREE.Vector3(-10, 0.05, -10),
        scale: new THREE.Vector3(8, 0.1, 8),
        properties: { surfaceType: 'ICE' }
      },
      
      // Boost pads
      {
        type: CourseElementType.BOOST_PAD,
        position: new THREE.Vector3(10, 0.05, -10),
        scale: new THREE.Vector3(3, 0.1, 3)
      },
      {
        type: CourseElementType.BOOST_PAD,
        position: new THREE.Vector3(10, 0.05, -7),
        scale: new THREE.Vector3(3, 0.1, 3)
      },
      
      // Targets (scattered throughout the course)
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(15, 1, 15),
        properties: { radius: 0.6 }
      },
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(-15, 1, 15),
        properties: { radius: 0.6 }
      },
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(15, 1, -15),
        properties: { radius: 0.6 }
      },
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(-15, 1, -5),
        properties: { radius: 0.6 }
      },
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(0, 1, 0),
        properties: { radius: 0.6 }
      },
      
      // Hole (in the center of the maze)
      {
        type: CourseElementType.HOLE,
        position: new THREE.Vector3(0, 0, 0)
      }
    ]
  };
}

/**
 * Get all available courses
 */
export function getAllCourses() {
  return [
    createTutorialCourse(),
    createStandardCourse(),
    createAdvancedCourse()
  ];
}