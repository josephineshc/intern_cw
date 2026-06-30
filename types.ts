/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export type ExerciseType = 'lip_stretch' | 'lip_pucker' | 'mouth_open' | 'breath_support' | 'speech_drill';

export interface Exercise {
  id: ExerciseType;
  name: string;
  category: 'Oral-Motor' | 'Breath Support' | 'Articulation';
  description: string;
  instructions: string[];
  targetValue: number; // e.g., hold time in seconds or accuracy percentage
  iconName: string;
}

export interface SessionStats {
  completedExercises: Record<ExerciseType, number>;
  points: number;
  streak: number;
  history: Record<string, any>[];
}

export interface SpeechDrillItem {
  phrase: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  targetPhoneme: string;
}

export interface SpeechAnalysisResult {
  transcript: string;
  accuracy: number; // 0 to 100
  levenshteinClarity: number; // calculated similarity
  feedback: string;
  suggestions: string[];
  targetWord: string;
}

export interface AiFeedbackResponse {
  assessment: string; // Clinical-style encouraging assessment
  phoneticFeedback: string; // Specific phonetic breakdown
  scoreExplanation: string; // Reason for score
  recommendedExercises: string[]; // Tailored exercises list
  customDrills: string[]; // Tailored daily drill sentences
}

export interface DebugInfo {
  latency: number;
  promptContext: string;
  rawResponse: string;
  timestamp: string;
}

// MediaPipe Type Definitions (Augmenting window)
declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    FACEMESH_LIPS: any;
    FACEMESH_TESSELATION: any;
  }
}
