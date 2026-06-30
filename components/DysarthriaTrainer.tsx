/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Mic,
  MicOff,
  Smile,
  Sparkles,
  Trophy,
  Volume2,
  RefreshCw,
  Brain,
  Play,
  Pause,
  CheckCircle,
  User,
  ShieldAlert,
  Info,
  Zap,
  Flame,
  Compass,
  Award,
  BookOpen,
  ChevronRight,
  Sparkle,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronUp,
  History,
  FileText
} from 'lucide-react';
import { ExerciseType, Exercise, SessionStats, SpeechDrillItem, SpeechAnalysisResult, AiFeedbackResponse } from '../types';
import { analyzeSpeechPerformance } from '../services/geminiService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  logOut as firebaseLogOut,
  getOrCreateUserProfile,
  saveUserProfile,
  saveTrainingSession,
  getUserSessions,
  UserProfileData
} from '../services/firebaseService';

// Available speech targets for the Articulation Drills grouped by Language/Mode
const DRILL_PHRASES_BY_LANG: Record<'en' | 'ko_std' | 'ko_phon' | 'ko_dialect', SpeechDrillItem[]> = {
  en: [
    { phrase: "Papa", difficulty: "Easy", category: "Bilabial Consonants (Lips)", targetPhoneme: "P" },
    { phrase: "Mama", difficulty: "Easy", category: "Bilabial Consonants (Lips)", targetPhoneme: "M" },
    { phrase: "Baby Blue Boat", difficulty: "Medium", category: "Plosives & Lip Rounding", targetPhoneme: "B" },
    { phrase: "Tea for Two", difficulty: "Medium", category: "Alveolar Sounds (Tongue Tip)", targetPhoneme: "T" },
    { phrase: "Red Leather Yellow Leather", difficulty: "Hard", category: "Lingual Coordination", targetPhoneme: "L & R" },
    { phrase: "She Sells Sea Shells", difficulty: "Hard", category: "Sibilants / Fricatives", targetPhoneme: "S & Sh" },
  ],
  ko_std: [
    { phrase: "아빠", difficulty: "Easy", category: "양순 파열음 (입술 소리)", targetPhoneme: "ㅃ" },
    { phrase: "엄마", difficulty: "Easy", category: "양순 비음 (입술 소리)", targetPhoneme: "ㅁ" },
    { phrase: "나비", difficulty: "Easy", category: "치조음 및 순음 조화", targetPhoneme: "ㄴ, ㅂ" },
    { phrase: "푸른 바다 바둑이", difficulty: "Medium", category: "입술 근육 및 성대 공명", targetPhoneme: "ㅍ, ㅂ, ㄷ" },
    { phrase: "간장공장 공장장", difficulty: "Hard", category: "설근음 및 연구개 발음 협응", targetPhoneme: "ㄱ, ㅈ" },
    { phrase: "경찰청 창살 외창살", difficulty: "Hard", category: "치조 마찰음 및 파찰음", targetPhoneme: "ㅊ, ㅅ" },
  ],
  ko_phon: [
    { phrase: "아빠 [아빠]", difficulty: "Easy", category: "경음화 실제 조음", targetPhoneme: "ㅃ" },
    { phrase: "엄마 [엄마]", difficulty: "Easy", category: "비음 유도 조음", targetPhoneme: "ㅁ" },
    { phrase: "국민 [궁민]", difficulty: "Easy", category: "자음 동화 (비음화)", targetPhoneme: "ㅇ" },
    { phrase: "같이 [가치]", difficulty: "Medium", category: "구개음화 현상", targetPhoneme: "ㅊ" },
    { phrase: "신라 [실라]", difficulty: "Medium", category: "유음화 현상", targetPhoneme: "ㄹ" },
    { phrase: "학력 [항녁]", difficulty: "Hard", category: "상호 비음화", targetPhoneme: "ㅇ, ㄴ" },
  ],
  ko_dialect: [
    { phrase: "가가 가가", difficulty: "Easy", category: "성조/고저 평탄도 구별 (그 사람이 그 사람이냐?)", targetPhoneme: "ㄱ" },
    { phrase: "밥 묵었나", difficulty: "Easy", category: "억양 하강 조절 (식사하셨습니까?)", targetPhoneme: "ㅂ, ㅁ" },
    { phrase: "우짜노 우짜노", difficulty: "Easy", category: "감정 표현 및 이완", targetPhoneme: "ㅉ" },
    { phrase: "블루베리 스무디", difficulty: "Medium", category: "고저 악센트 협응", targetPhoneme: "ㄹ, ㅂ" },
    { phrase: "맞나 아이가 맞다 카이", difficulty: "Hard", category: "어미 종결 및 조음 협응", targetPhoneme: "ㅁ, ㄴ, ㄷ" },
  ]
};

const MULTILINGUAL_UI = {
  en: {
    selectDrill: "Select Target Drill",
    difficultyEasy: "Easy",
    difficultyMedium: "Medium",
    difficultyHard: "Hard",
    sayFollowing: "Say the following phrase aloud:",
    targetPhoneme: "Target Phoneme(s)",
    stopListening: "Stop Listening",
    speakNow: "Speak Now",
    realtimeTranscript: "Speech Transcription Output",
    waitingSpeech: "Waiting for speech input...",
    accuracy: "Accuracy",
    success: "Success",
    practice: "Practice"
  },
  ko_std: {
    selectDrill: "목표 발음 훈련 선택",
    difficultyEasy: "쉬움",
    difficultyMedium: "보통",
    difficultyHard: "어려움",
    sayFollowing: "다음 문장을 소리내어 말하세요:",
    targetPhoneme: "집중 연습 자음/모음",
    stopListening: "인식 중단",
    speakNow: "지금 말하기",
    realtimeTranscript: "실시간 음성 인식 텍스트",
    waitingSpeech: "음성을 대기하고 있습니다...",
    accuracy: "정확도",
    success: "성공",
    practice: "도전!"
  },
  ko_phon: {
    selectDrill: "실제 발음 유도 훈련 선택",
    difficultyEasy: "쉬움",
    difficultyMedium: "보통",
    difficultyHard: "어려움",
    sayFollowing: "아래 실제 발음 표기대로 소리내어 말하세요:",
    targetPhoneme: "집중 조음 현상",
    stopListening: "인식 중단",
    speakNow: "지금 말하기",
    realtimeTranscript: "실시간 음성 인식 텍스트",
    waitingSpeech: "음성을 대기하고 있습니다...",
    accuracy: "정확도",
    success: "성공",
    practice: "도전!"
  },
  ko_dialect: {
    selectDrill: "경상 방언 억양 훈련 선택",
    difficultyEasy: "쉬움",
    difficultyMedium: "보통",
    difficultyHard: "어려움",
    sayFollowing: "방언의 억양과 고저 악센트를 살려 소리내어 말하세요:",
    targetPhoneme: "주요 조음/악센트",
    stopListening: "인식 중단",
    speakNow: "지금 말하기",
    realtimeTranscript: "실시간 음성 인식 텍스트",
    waitingSpeech: "음성을 대기하고 있습니다...",
    accuracy: "정확도",
    success: "성공",
    practice: "도전!"
  }
};

const DRILL_GUIDES: Record<string, { mouth: string; tone: string; rhythm: string }> = {
  // English Drills
  "Papa": {
    mouth: "Close both lips firmly to build up air pressure, then release suddenly. Keep the jaw relaxed.",
    tone: "Voiceless explosion on 'P' followed by a voiced, clear vowel. Avoid breathy/whispered delivery.",
    rhythm: "Trochaic: STRESSED-unstressed ('PA-pa'). Equal emphasis on the first syllable."
  },
  "Mama": {
    mouth: "Keep lips gently closed while letting air flow entirely through the nose. Feel your lips vibrate.",
    tone: "Voiced, humming nasal resonance. Keep the pitch steady and natural.",
    rhythm: "Two evenly balanced syllables with smooth continuous vocalization."
  },
  "Baby Blue Boat": {
    mouth: "Active bilabial contact. Purse and round your lips forward for 'Blue' and 'Boat'.",
    tone: "Fully voiced consonants. Keep standard speaking volume throughout.",
    rhythm: "Staccato but steady three-beat sequence: BA-by / BLUE / BOAT."
  },
  "Tea for Two": {
    mouth: "Touch the tip of your tongue to the ridge behind your upper teeth, then release with air.",
    tone: "Clear plosive release on 'T'. Maintain consistent vocal support.",
    rhythm: "Light-heavy-strong pacing: tea - for - TWO."
  },
  "Red Leather Yellow Leather": {
    mouth: "Alternate pull-back of tongue tip ('R'), biting tip of tongue ('th'), and tongue-tip rise ('L').",
    tone: "Sustained vocal resonance. Avoid losing vocal power on transition consonants.",
    rhythm: "Alternating rhythmic swings. Keep a slow, metronome-like speed."
  },
  "She Sells Sea Shells": {
    mouth: "Form a narrow channel with your tongue. Push air through for 'Sh' (lips rounded) and 'S' (lips retracted).",
    tone: "High frequency sibilance. Maintain stable, controlled airflow without running out of breath.",
    rhythm: "Challenging alternating patterns; pause slightly between 'Sells' and 'Sea' to stabilize tongue."
  },

  // Korean Standard Drills
  "아빠": {
    mouth: "두 입술을 단단히 맞물려 공기를 모은 뒤, 일시에 터뜨리듯이 발음합니다. 턱을 가볍게 떨어뜨리세요.",
    tone: "강한 된소리(ㅃ)이므로 후두 긴장이 필요합니다. 숨을 뱉지 않고 단단히 목소리를 얹으세요.",
    rhythm: "두 음절을 1:1 길이로 정확하고 뚜렷하게 구분하여 발음합니다."
  },
  "엄마": {
    mouth: "입술을 부드럽게 닫고 공기를 완전히 코로 내보냅니다. 입술 주변과 코뼈 부근의 진동을 느끼세요.",
    tone: "부드럽고 긴 공명음입니다. 목소리 톤을 차분하게 낮추어 비음의 울림을 극대화합니다.",
    rhythm: "음절 사이를 끊지 말고 '엄~마'로 부드럽게 이어서 연속된 리듬으로 발화합니다."
  },
  "나비": {
    mouth: "혀끝을 윗잇몸에 대어 'ㄴ'을 내고, 부드럽게 입술을 닫아 'ㅂ' 조화로 이행합니다.",
    tone: "성대의 편안한 울림을 유지하며 부드럽고 맑은 목소리로 발성합니다.",
    rhythm: "흘러가듯이 가벼운 2박자 리듬을 유지합니다."
  },
  "푸른 바다 바둑이": {
    mouth: "공기를 강하게 뿜는 'ㅍ'에서 'ㅂ'과 'ㄷ'의 입술/치조 접촉으로 신속하게 전이합니다.",
    tone: "일정한 음량과 성량 복식 호흡을 유지하며, 단어 끝부분에서 목소리가 사그라들지 않게 통제합니다.",
    rhythm: "3단어 7음절의 호흡 조절 훈련입니다. 각 어절마다 균등하게 한 박자씩 배분하여 낭독합니다."
  },
  "간장공장 공장장": {
    mouth: "혀 뒷부분을 입천장 안쪽(연구개)에 깊게 밀착하여 'ㄱ'과 'ㅇ'을 정밀하게 조음합니다.",
    tone: "목 안쪽에 깊은 공명을 주고 성대의 텐션을 높여 발음이 뭉개지거나 새는 것을 방지합니다.",
    rhythm: "스타카토 리듬처럼 정밀하고 규칙적인 속도로 한 음절씩 또박또박 끊어 읽습니다."
  },
  "경찰청 창살 외창살": {
    mouth: "혀끝과 윗잇몸 사이의 좁은 틈으로 바람을 강하게 분출하는 마찰음/파찰음 협응 조음입니다.",
    tone: "발음 시 기류 방출이 많으므로 호흡이 성급하게 떨어지지 않게 배 주변의 압력을 조절합니다.",
    rhythm: "매우 빠른 조음 전환이 필요하므로 천천히 리듬을 타며 정박에 맞춰 또박또박 읽습니다."
  },

  // Korean Phonetic Drills
  "아빠 [아빠]": {
    mouth: "두 입술을 강하게 조여 공기 누출을 막았다가 한 번에 터뜨립니다. 된소리 실제 발음입니다.",
    tone: "성대 주위를 강하게 조여 압박을 가한 맑고 또렷한 된소리 톤을 유도합니다.",
    rhythm: "첫 글자보다 둘째 글자 '빠'에 살짝 악센트를 주어 1.2:1 리듬으로 발성합니다."
  },
  "엄마 [엄마]": {
    mouth: "비음 유도 훈련입니다. 입술을 완전히 차단한 상태에서 콧길로 바람을 흘려보냅니다.",
    tone: "콧잔등이 파르르 울리는 부드러운 중저음의 톤을 연습합니다.",
    rhythm: "끊어지지 않는 하나의 선처럼 부드럽고 매끄러운 소리의 흐름을 만듭니다."
  },
  "국민 [궁민]": {
    mouth: "자음동화(비음화) 규칙입니다. '국'의 기억(ㄱ) 받침이 뒤의 미음(ㅁ)을 만나 이응(ㅇ)으로 바뀝니다. 혀 뒷뿌리를 연구개에 밀착하십시오.",
    tone: "비음화로 인해 연해지고 편안해지는 유성음의 울림을 유지합니다.",
    rhythm: "글자 그대로인 '국-민'이 아니라 자연스럽고 이음새 없는 '궁-민'으로 신속하게 넘깁니다."
  },
  "같이 [가치]": {
    mouth: "구개음화 규칙입니다. 혀끝이 입천장 단단한 뼈(경구개)로 가면서 '티읕(ㅌ)'이 '치읓(ㅊ)'으로 조음 위치가 위쪽으로 이동합니다.",
    tone: "기류를 살짝 터뜨리는 파찰음의 예리한 톤을 표현합니다.",
    rhythm: "'갇-이'로 부러지거나 끊기지 않고 부드럽게 '가-치'로 연결합니다."
  },
  "신라 [실라]": {
    mouth: "유음화 규칙입니다. 니은(ㄴ)이 리을(ㄹ)을 만나 흘러가는 소리(ㄹ)로 변합니다. 혀끝을 윗잇몸에 대고 양옆으로 공기를 흐르게 합니다.",
    tone: "부드럽고 맑은 유음의 연속적인 공명을 만들어냅니다.",
    rhythm: "혀끝이 가볍게 튕기며 물 흐르듯이 유연한 리듬감을 구현합니다."
  },
  "학력 [항녁]": {
    mouth: "상호 비음화입니다. 기억(ㄱ)과 리을(ㄹ)이 충돌하여 이응(ㅇ)과 니은(ㄴ)으로 동시에 바뀝니다. 혀 안쪽과 혀끝이 차례로 접촉합니다.",
    tone: "과도한 목 긴장 없이 비강의 공명만을 이용해 편안하고 가벼운 톤을 만듭니다.",
    rhythm: "'학-력' 대신 리드미컬하고 자연스러운 두 글자 '항-녁' 흐름을 타십시오."
  },

  // Korean Dialect Drills
  "가가 가가": {
    mouth: "경상 방언 특유의 고저(성조)를 조절하기 위해 입을 적당히 벌리며 동일한 자음을 반복 발음합니다.",
    tone: "억양의 높낮이가 핵심입니다. 앞의 '가가'는 높게 올려 부르고, 뒤의 '가가'는 낮추어 의문문 억양을 살립니다.",
    rhythm: "올라갔다 내려오는 고저 파형의 선율적 리듬감을 살려 노래하듯 연습합니다."
  },
  "밥 묵었나": {
    mouth: "첫소리 '밥'에서 입술을 단단히 닫았다가 '묵었나'의 비강 조음으로 부드럽게 풀어줍니다.",
    tone: "경상도식 질문의 하강 억양입니다. 끝음 '나'에서 피치가 부드럽게 뚝 떨어지는 하강형 조절을 이룹니다.",
    rhythm: "앞부분 '밥 묵'은 강하고 신속히 끊고, '었나'에서 편안하게 풀며 마무리하는 템포입니다."
  },
  "우짜노 우짜노": {
    mouth: "쌍지읒(ㅉ)의 강한 구개 긴장 조음입니다. 혀 중간을 입천장에 강하게 댔다가 떼며 탄식하는 표정을 동반합니다.",
    tone: "감정이 실린 멜로디형 발성입니다. 중저음 톤에서 긴장감과 한탄 섞인 톤의 울림을 유지합니다.",
    rhythm: "3음절 패턴이 똑같은 길이로 반복되는 파도 모양의 낭독 리듬을 만듭니다."
  },
  "블루베리 스무디": {
    mouth: "어두 고저 악센트를 조절하는 연습입니다. '블루'에서 혀와 입술을 조화롭게 움직이고 '스무디'에서 이완시킵니다.",
    tone: "악센트 위치가 핵심입니다. 경상도 억양으로 '블'과 '스'에 강한 고음(Pitch Accent)을 확실히 부여합니다.",
    rhythm: "높은 음에서 시작해 계단식으로 툭 툭 떨어지는 악센트 리듬을 적용합니다."
  },
  "맞나 아이가 맞다 카이": {
    mouth: "미음, 이응, 디귿, 키읔 등 성대 폐쇄와 기류의 급격한 변화가 수반되는 입술-혀끝-목청 조음 협응 연습입니다.",
    tone: "끝말을 확신 있게 종결짓는 단단하고 확신에 찬 어조와 기류 밀기를 훈련합니다.",
    rhythm: "어절 사이를 '맞나! / 아이가~ / 맞다 카이!' 로 구분하여 명확히 끊고 지르는 3단계 호흡 구조입니다."
  }
};

const EXERCISE_LIST: Exercise[] = [
  {
    id: 'speech_drill',
    name: '조음 정확도 발음 훈련 (Speech Articulation Drill)',
    category: 'Articulation',
    description: '선택한 연습 단어 및 문장을 명확히 발음하여 구어 명료도와 조음 안면 협응을 향상시킵니다.',
    instructions: [
      '목록에서 조음 연습 단어 또는 문장을 선택합니다.',
      '\'지금 말하기(Speak Now)\' 버튼을 누른 후 화면을 보며 천천히 명확하게 낭독합니다.',
      '조음 기관(입술, 아래턱, 혀)의 가동성 향상을 위해 각 음절을 또박또박 과장되게 발음하세요.',
      '실시간으로 안면 입꼬리 대칭도, 미소 수축, 입술 오므리기, 구강 개방도 센서 피드백을 모니터링하여 명확한 모범 자세를 맞추세요.'
    ],
    targetValue: 80,
    iconName: 'speech'
  }
];

// Category and Tab Translations for UI display
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'Oral-Motor': '구강 안면 운동',
  'Breath Support': '호흡 및 발성 지원',
  'Articulation': '조음 안면 대칭 훈련'
};

const TAB_TRANSLATIONS: Record<string, string> = {
  'exercises': '실시간 조음 훈련',
  'analytics': '훈련 분석 및 기록',
  'about': '소개 및 원리'
};

export default function DysarthriaTrainer() {
  // State variables
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [sessionsHistory, setSessionsHistory] = useState<any[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [dismissedWelcome, setDismissedWelcome] = useState(false);

  // Calibration references
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [restingSmileWidth, setRestingSmileWidth] = useState(0.38);
  const [restingPuckerRatio, setRestingPuckerRatio] = useState(0.12);
  const [restingMouthOpen, setRestingMouthOpen] = useState(0.06);
  const [calibrationCounter, setCalibrationCounter] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Live trackers
  const [liveSmile, setLiveSmile] = useState(0);
  const [livePucker, setLivePucker] = useState(0);
  const [liveOpen, setLiveOpen] = useState(0);
  const [liveSymmetry, setLiveSymmetry] = useState(1);
  const [liveLoudness, setLiveLoudness] = useState(0);
  const [speechSuccessRate, setSpeechSuccessRate] = useState<number | null>(null);

  // High Performance Trackers for Session Analytics (Passed to Gemini)
  const [sessionMaxSmile, setSessionMaxSmile] = useState(0);
  const [sessionMaxPucker, setSessionMaxPucker] = useState(0);
  const [sessionMaxMouthOpen, setSessionMaxMouthOpen] = useState(0);
  const [sessionSymmetryDeviation, setSessionSymmetryDeviation] = useState(0);
  const [sessionAvgLoudness, setSessionAvgLoudness] = useState(0);
  const [sessionLoudnessCount, setSessionLoudnessCount] = useState(0);
  const [sessionSustainDuration, setSessionSustainDuration] = useState(0);

  // Exercise state
  const [isRunning, setIsRunning] = useState(false);
  const [holdTimer, setHoldTimer] = useState(0);
  const [exerciseComplete, setExerciseComplete] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AiFeedbackResponse | null>(null);

  // Media references
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPreviewOnly, setCameraPreviewOnly] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Web Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioAnimationFrameRef = useRef<number | null>(null);
  const [audioPermissionError, setAudioPermissionError] = useState(false);

  // Speech Recognition refs
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Refs for tracking animation frames & Mediapipe loop
  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const isPinchingRef = useRef<boolean>(false); // Used to avoid updates if component unmounts

  const [languageMode, setLanguageMode] = useState<'en' | 'ko_std' | 'ko_phon' | 'ko_dialect'>('ko_std');
  const [activeTab, setActiveTab] = useState<'exercises' | 'analytics' | 'about'>('exercises');
  const [selectedExercise, setSelectedExercise] = useState<Exercise>(() => {
    return EXERCISE_LIST[0];
  });
  const [selectedDrill, setSelectedDrill] = useState<SpeechDrillItem>(() => {
    return DRILL_PHRASES_BY_LANG['ko_std'][0];
  });

  // Sync selected drill when language mode changes
  useEffect(() => {
    setSelectedDrill(DRILL_PHRASES_BY_LANG[languageMode][0]);
    resetLivePerformanceMetrics();
  }, [languageMode]);

  // Tracking Stats
  const [stats, setStats] = useState<SessionStats>(() => {
    const saved = localStorage.getItem('dysarthria_trainer_stats_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      completedExercises: {
        lip_stretch: 0,
        lip_pucker: 0,
        mouth_open: 0,
        breath_support: 0,
        speech_drill: 0
      },
      points: 0,
      streak: 1,
      history: []
    };
  });

  // Saving stats to localstorage
  useEffect(() => {
    localStorage.setItem('dysarthria_trainer_stats_v2', JSON.stringify(stats));
  }, [stats]);

  // Listen to Auth State changes and pull profiles from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await getOrCreateUserProfile(user);
          setUserProfile(profile);

          setIsCalibrated(profile.isCalibrated);
          setRestingSmileWidth(profile.restingSmileWidth ?? 0.38);
          setRestingPuckerRatio(profile.restingPuckerRatio ?? 0.12);
          setRestingMouthOpen(profile.restingMouthOpen ?? 0.06);

          setStats({
            completedExercises: (profile.completedExercises as any) || {
              lip_stretch: 0,
              lip_pucker: 0,
              mouth_open: 0,
              breath_support: 0,
              speech_drill: 0
            },
            points: profile.points ?? 0,
            streak: profile.streak ?? 1,
            history: [] // We use firestore-driven sessions history
          });

          // Fetch user's completed sessions from firestore
          const sessions = await getUserSessions(user.uid);
          setSessionsHistory(sessions);
        } catch (err) {
          console.error("Failed to fetch or create user profile in Firestore:", err);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setSessionsHistory([]);
        // Revert to local storage stats
        const saved = localStorage.getItem('dysarthria_trainer_stats_v2');
        if (saved) {
          try {
            setStats(JSON.parse(saved));
          } catch (e) {
            console.error(e);
          }
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Save updated calibration metrics to Firestore when calibration is finalized
  useEffect(() => {
    if (isCalibrated && currentUser) {
      saveUserProfile(currentUser.uid, {
        isCalibrated: true,
        restingSmileWidth,
        restingPuckerRatio,
        restingMouthOpen
      }).then(() => {
        // Refresh profile state
        getOrCreateUserProfile(currentUser).then(setUserProfile);
      }).catch(err => console.error("Error updating profile calibration data:", err));
    }
  }, [isCalibrated, restingSmileWidth, restingPuckerRatio, restingMouthOpen, currentUser]);

  // Save accumulated XP and program counts to Firestore
  useEffect(() => {
    if (currentUser) {
      saveUserProfile(currentUser.uid, {
        points: stats.points,
        completedExercises: stats.completedExercises,
        streak: stats.streak
      }).catch(err => console.error("Error saving updated points stats to profile:", err));
    }
  }, [stats.points, stats.completedExercises, stats.streak, currentUser]);

  // Reset metrics function
  function resetLivePerformanceMetrics() {
    setSessionMaxSmile(0);
    setSessionMaxPucker(0);
    setSessionMaxMouthOpen(0);
    setSessionSymmetryDeviation(0);
    setSessionAvgLoudness(0);
    setSessionLoudnessCount(0);
    setSessionSustainDuration(0);
    setSpeechSuccessRate(null);
    setSpeechTranscript('');
    setAiFeedback(null);
    setExerciseComplete(false);
    setHoldTimer(0);
  }

  // Switch exercise
  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsRunning(false);
    resetLivePerformanceMetrics();
  };

  // Start/Stop voice recognition (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Safari에서 다시 시도해 주세요.");
      return;
    }

    try {
      setSpeechTranscript('');
      setSpeechError(null);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = languageMode === 'en' ? 'en-US' : 'ko-KR';

      rec.onstart = () => {
        setIsListening(true);
        setIsRunning(true);
        resetLivePerformanceMetrics();
        startAudioTracking();
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        setSpeechTranscript(currentText);

        // Grade accuracy
        if (finalTranscript) {
          gradeSpeechAccuracy(finalTranscript, selectedDrill.phrase);
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        const errorType = err?.error;
        const messageByError: Record<string, string> = {
          'not-allowed': "마이크 권한이 차단되었습니다. 브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요.",
          'service-not-allowed': "브라우저 음성 인식 서비스가 차단되었습니다. Chrome 또는 Safari에서 마이크 권한을 확인해 주세요.",
          'audio-capture': "마이크를 찾을 수 없습니다. 입력 장치가 연결되어 있는지 확인해 주세요.",
          'no-speech': "음성이 감지되지 않았습니다. 버튼을 다시 누른 뒤 조금 더 가까이 말해 주세요.",
          'network': "음성 인식 서비스에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
          'language-not-supported': "선택한 언어의 음성 인식이 이 브라우저에서 지원되지 않습니다."
        };
        setSpeechError(messageByError[errorType] || "음성 인식을 시작하지 못했습니다. 마이크 권한을 확인한 뒤 다시 시도해 주세요.");
        setIsListening(false);
        setIsRunning(false);
        stopAudioTracking();
      };

      rec.onend = () => {
        setIsListening(false);
        setIsRunning(false);
        stopAudioTracking();
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error(e);
      setSpeechError("음성 인식을 시작하지 못했습니다. 마이크 권한을 확인한 뒤 다시 시도해 주세요.");
      setIsListening(false);
      setIsRunning(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setIsRunning(false);
    stopAudioTracking();
  };

  const gradeSpeechAccuracy = (spoken: string, target: string) => {
    // Standardize and normalize strings
    const bracketRegex = /\[(.*?)\]/;
    const match = target.match(bracketRegex);
    let targetOrthography = target;
    let targetPhonetic = target;

    if (match) {
      targetOrthography = target.replace(bracketRegex, '').trim();
      targetPhonetic = match[1].trim();
    }

    const sNormalized = spoken.toLowerCase().replace(/[^ㄱ-ㅎ가-힣0-9a-zA-Z ]/g, '').trim();
    const tOrthNormalized = targetOrthography.toLowerCase().replace(/[^ㄱ-ㅎ가-힣0-9a-zA-Z ]/g, '').trim();
    const tPhonNormalized = targetPhonetic.toLowerCase().replace(/[^ㄱ-ㅎ가-힣0-9a-zA-Z ]/g, '').trim();

    // Word-based exact match check
    const sWords = sNormalized.split(/\s+/);
    const tOrthWords = tOrthNormalized.split(/\s+/);
    const tPhonWords = tPhonNormalized.split(/\s+/);

    let orthMatches = 0;
    tOrthWords.forEach(w => {
      if (sWords.includes(w) || sNormalized.includes(w) || w.includes(sNormalized)) {
        orthMatches++;
      }
    });
    const orthWordAccuracy = tOrthWords.length > 0 ? Math.round((orthMatches / tOrthWords.length) * 100) : 0;

    let phonMatches = 0;
    tPhonWords.forEach(w => {
      if (sWords.includes(w) || sNormalized.includes(w) || w.includes(sNormalized)) {
        phonMatches++;
      }
    });
    const phonWordAccuracy = tPhonWords.length > 0 ? Math.round((phonMatches / tPhonWords.length) * 100) : 0;

    const wordAccuracy = Math.max(orthWordAccuracy, phonWordAccuracy);

    // Character-based matching fallback for short syllables (e.g. "아빠", "엄마")
    let orthCharMatches = 0;
    const cleanSpoken = sNormalized.replace(/\s+/g, '');
    const cleanOrthTarget = tOrthNormalized.replace(/\s+/g, '');
    for (const char of cleanOrthTarget) {
      if (cleanSpoken.includes(char)) {
        orthCharMatches++;
      }
    }
    const orthCharAccuracy = cleanOrthTarget.length > 0 ? Math.round((orthCharMatches / cleanOrthTarget.length) * 100) : 0;

    let phonCharMatches = 0;
    const cleanPhonTarget = tPhonNormalized.replace(/\s+/g, '');
    for (const char of cleanPhonTarget) {
      if (cleanSpoken.includes(char)) {
        phonCharMatches++;
      }
    }
    const phonCharAccuracy = cleanPhonTarget.length > 0 ? Math.round((phonCharMatches / cleanPhonTarget.length) * 100) : 0;

    const charAccuracy = Math.max(orthCharAccuracy, phonCharAccuracy);

    // Take the best scoring approach
    const finalAccuracy = Math.max(wordAccuracy, charAccuracy);
    setSpeechSuccessRate(finalAccuracy);

    // Trigger success if accuracy meets target
    if (finalAccuracy >= selectedExercise.targetValue) {
      setExerciseComplete(true);
      awardExercisePoints();
    }
  };

  // Generate real-time clinical-grade feedback based on active facial sensors
  const getLiveClinicalFeedback = () => {
    if (!isCalibrated) {
      return languageMode === 'en'
        ? "Please calibrate first for accurate clinical readings."
        : "정확한 실시간 분석을 위해 먼저 안면 기준 보정을 완료해 주세요.";
    }

    if (!isListening && !isRunning) {
      return languageMode === 'en'
        ? "Ready. Click 'Speak Now' to begin your articulation analysis."
        : "대기 중. '지금 말하기' 버튼을 누르고 발음 연습을 시작하세요.";
    }

    const feedbacks: string[] = [];

    // 1. Symmetry clinical feedback
    if (liveSymmetry > 0.94) {
      feedbacks.push(
        languageMode === 'en'
          ? "✓ Excellent lip symmetry balance maintained."
          : "✓ 우수한 입술 좌우 대칭 균형 상태를 유지하고 있습니다."
      );
    } else if (liveSymmetry < 0.88) {
      feedbacks.push(
        languageMode === 'en'
          ? "⚠️ Mild lip asymmetry detected. Try to equalize tension on both sides."
          : "⚠️ 약간의 좌우 입꼬리 비대칭이 관찰됩니다. 양측 근육에 균등한 힘을 줘보세요."
      );
    }

    // 2. Smile/Retraction feedback
    const smileTarget = restingSmileWidth * 1.05;
    if (liveSmile >= smileTarget) {
      feedbacks.push(
        languageMode === 'en'
          ? "✓ Active lip retraction (horizontal muscle contraction) is prominent."
          : "✓ 입꼬리 수축 및 구륜근의 가로 긴장도가 충분히 활성화되었습니다."
      );
    }

    // 3. Pucker/Protrusion feedback
    const puckerTarget = restingPuckerRatio * 1.5;
    if (livePucker >= puckerTarget) {
      feedbacks.push(
        languageMode === 'en'
          ? "✓ Good lip protrusion and rounding (pucker coordination) active."
          : "✓ 입술 돌출 및 오므리기 협응(구륜근 전방 돌출)이 매우 원활합니다."
      );
    }

    // 4. Jaw Open excursion feedback
    const openTarget = restingMouthOpen * 1.4;
    if (liveOpen >= openTarget) {
      feedbacks.push(
        languageMode === 'en'
          ? "✓ Ample jaw excursion and mouth opening for clear phoneme expansion."
          : "✓ 충분한 아래턱 이완 및 구강 개방도로 모음 음의 명료도를 확보하고 있습니다."
      );
    } else if (liveOpen < restingMouthOpen * 1.08 && isListening) {
      feedbacks.push(
        languageMode === 'en'
          ? "ℹ️ Slight mumble or narrow opening. Try opening your mouth slightly wider."
          : "ℹ️ 구강 개방도가 소폭 낮습니다. 입을 조금만 더 넓히면 발음 전달력이 향상됩니다."
      );
    }

    if (feedbacks.length === 0) {
      return languageMode === 'en'
        ? "Analyzing real-time lip and jaw movements..."
        : "실시간 입술 및 아래턱 조음 움직임을 분석하는 중입니다...";
    }

    return feedbacks[feedbacks.length - 1]; // return the most active recent clinical alert
  };

  // Play standard exemplar using Web Speech Synthesis TTS
  const playTTS = (phrase: string) => {
    if (!window.speechSynthesis) return;

    // Stop any active speech
    window.speechSynthesis.cancel();

    // Extract orthographic phrase by removing phonetic annotation inside brackets
    const cleanText = phrase.split('[')[0].trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Configure voice language based on training mode
    if (languageMode === 'en') {
      utterance.lang = 'en-US';
    } else {
      utterance.lang = 'ko-KR';
    }

    // Slightly deliberate and steady tempo for optimal clinical modeling
    utterance.rate = 0.8;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  // Trigger Gemini Analysis
  const triggerAiReview = async () => {
    setAiAnalyzing(true);
    try {
      // Setup average loudness
      const averageLoudnessValue = sessionLoudnessCount > 0 ? (sessionAvgLoudness / sessionLoudnessCount) : 15;
      const feedback = await analyzeSpeechPerformance(
        selectedExercise.id === 'speech_drill' ? selectedDrill.phrase : selectedExercise.name,
        speechTranscript,
        {
          maxSmileWidth: sessionMaxSmile > 0 ? sessionMaxSmile : liveSmile,
          maxPuckerRatio: sessionMaxPucker > 0 ? sessionMaxPucker : livePucker,
          maxMouthOpen: sessionMaxMouthOpen > 0 ? sessionMaxMouthOpen : liveOpen,
          leftRightAsymmetry: sessionSymmetryDeviation
        },
        {
          averageLoudness: averageLoudnessValue,
          volumeStability: 85, // estimate stability
          vowelSustainDuration: sessionSustainDuration
        },
        languageMode
      );
      setAiFeedback(feedback);

      // If logged in, save the detailed analysis session to Firestore
      if (currentUser) {
        try {
          await saveTrainingSession(currentUser.uid, {
            exerciseId: selectedExercise.id,
            exerciseName: selectedExercise.name,
            score: speechSuccessRate || 80,
            targetPhrase: selectedExercise.id === 'speech_drill' ? selectedDrill.phrase : selectedExercise.name,
            transcript: speechTranscript,
            metrics: {
              maxSmileWidth: sessionMaxSmile > 0 ? sessionMaxSmile : liveSmile,
              maxPuckerRatio: sessionMaxPucker > 0 ? sessionMaxPucker : livePucker,
              maxMouthOpen: sessionMaxMouthOpen > 0 ? sessionMaxMouthOpen : liveOpen,
              leftRightAsymmetry: sessionSymmetryDeviation,
              averageLoudness: averageLoudnessValue,
              vowelSustainDuration: sessionSustainDuration
            },
            feedback: {
              assessment: feedback.assessment,
              phoneticFeedback: feedback.phoneticFeedback,
              scoreExplanation: feedback.scoreExplanation,
              recommendedExercises: feedback.recommendedExercises,
              customDrills: feedback.customDrills
            }
          });
          // Reload sessions
          const sessions = await getUserSessions(currentUser.uid);
          setSessionsHistory(sessions);
        } catch (dbErr) {
          console.error("Error saving detailed training session to Firestore:", dbErr);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Award Points
  const awardExercisePoints = async () => {
    const pointsGain = 100;

    setStats(prev => {
      const updatedCompleted = { ...prev.completedExercises };
      updatedCompleted[selectedExercise.id] = (updatedCompleted[selectedExercise.id] || 0) + 1;

      // Update history
      const now = new Date();
      const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newHistoryItem = {
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        timestamp,
        points: pointsGain
      };

      return {
        ...prev,
        completedExercises: updatedCompleted,
        points: prev.points + pointsGain,
        history: [newHistoryItem, ...prev.history].slice(0, 15) // Limit to last 15
      };
    });

    // If logged in, save session history to Firestore
    if (currentUser) {
      try {
        const averageLoudnessValue = sessionLoudnessCount > 0 ? (sessionAvgLoudness / sessionLoudnessCount) : 15;
        await saveTrainingSession(currentUser.uid, {
          exerciseId: selectedExercise.id,
          exerciseName: selectedExercise.name,
          score: selectedExercise.id === 'speech_drill' ? (speechSuccessRate || 80) : 100,
          targetPhrase: selectedExercise.id === 'speech_drill' ? selectedDrill.phrase : selectedExercise.name,
          transcript: selectedExercise.id === 'speech_drill' ? speechTranscript : '',
          metrics: {
            maxSmileWidth: sessionMaxSmile > 0 ? sessionMaxSmile : liveSmile,
            maxPuckerRatio: sessionMaxPucker > 0 ? sessionMaxPucker : livePucker,
            maxMouthOpen: sessionMaxMouthOpen > 0 ? sessionMaxMouthOpen : liveOpen,
            leftRightAsymmetry: sessionSymmetryDeviation,
            averageLoudness: averageLoudnessValue,
            vowelSustainDuration: sessionSustainDuration
          },
          feedback: {
            assessment: languageMode === 'en'
              ? `Completed ${selectedExercise.name} exercise successfully.`
              : `${selectedExercise.name} 구어 연습을 성공적으로 마쳤습니다.`,
            phoneticFeedback: languageMode === 'en'
              ? "Good articulation muscle stability detected by clinical tracking sensors."
              : "실시간 센서 측정 결과, 조음 안면 근육의 대칭적 제어 상태가 양호합니다.",
            scoreExplanation: languageMode === 'en'
              ? "Your mouth metrics show proper muscle activity and balanced bilateral extension."
              : "안면 가동 수치가 우수한 대칭 가동성 및 유지 안정성을 나타냅니다.",
            recommendedExercises: [],
            customDrills: []
          }
        });
        // Reload sessions
        const sessions = await getUserSessions(currentUser.uid);
        setSessionsHistory(sessions);
      } catch (err) {
        console.error("Error saving training session to Firestore:", err);
      }
    }
  };

  // Start Calibration
  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationCounter(0);
    setRestingSmileWidth(0);
    setRestingPuckerRatio(0);
    setRestingMouthOpen(0);
  };

  // Web Audio microphone capture for Loudness/Oscilloscope
  const startAudioTracking = async () => {
    try {
      setAudioPermissionError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioAnalyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Begin animation loop for audio drawing & analysis
      drawOscilloscope();
    } catch (err) {
      console.error("Audio capture failed:", err);
      setAudioPermissionError(true);
      setSpeechError("마이크 입력을 열 수 없습니다. 브라우저 권한에서 마이크를 허용해 주세요.");
    }
  };

  const stopAudioTracking = () => {
    if (audioAnimationFrameRef.current) {
      cancelAnimationFrame(audioAnimationFrameRef.current);
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setLiveLoudness(0);
  };

  // Oscillo animation
  const drawOscilloscope = () => {
    const canvas = audioCanvasRef.current;
    const analyser = audioAnalyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      audioAnimationFrameRef.current = requestAnimationFrame(renderFrame);

      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#111827'; // Dark grayish tailwind
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      // Beautiful glowing gradient line for speech support
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#14b8a6'); // Teal
      gradient.addColorStop(0.5, '#06b6d4'); // Cyan
      gradient.addColorStop(1, '#06b6d4');

      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      // Audio volume level check
      let sumSquares = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalized -1 to 1
        const y = (v * canvas.height) / 2;

        const valNormalized = Math.abs(dataArray[i] - 128);
        sumSquares += valNormalized * valNormalized;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Calculate loudness in decibels-like scale (0 to 100)
      const rms = Math.sqrt(sumSquares / bufferLength);
      const loudnessScore = Math.min(100, Math.round(rms * 4.5));
      setLiveLoudness(loudnessScore);

      // Save voice metrics during exercises
      if (isRunning) {
        setSessionAvgLoudness(p => p + loudnessScore);
        setSessionLoudnessCount(p => p + 1);

        // Vocal breath sustain tracking
        if (loudnessScore > 20) {
          setSessionSustainDuration(p => p + (1 / 60)); // Assumes ~60fps
        }
      }
    };

    renderFrame();
  };

  // Run or stop exercise
  const toggleExercise = () => {
    if (isRunning) {
      setIsRunning(false);
      if (selectedExercise.id === 'breath_support') {
        stopAudioTracking();
      }
    } else {
      resetLivePerformanceMetrics();
      setIsRunning(true);
      if (selectedExercise.id === 'breath_support') {
        startAudioTracking();
      }
    }
  };

  // Handle mouth metrics thresholds inside frame rendering
  const handleOralMotorMetrics = useCallback((smileValue: number, puckerValue: number, openValue: number, symmetryValue: number) => {
    if (!isRunning) return;

    // Track sessions peaks
    setSessionMaxSmile(p => Math.max(p, smileValue));
    setSessionMaxPucker(p => Math.max(p, puckerValue));
    setSessionMaxMouthOpen(p => Math.max(p, openValue));

    // Average out asymmetry deviation (closer to 1 is perfect, so deviation is 1 - symmetry)
    const deviation = 1 - symmetryValue;
    setSessionSymmetryDeviation(p => p * 0.95 + deviation * 0.05);

    // Evaluate target holds
    let targetMet = false;

    if (selectedExercise.id === 'lip_stretch') {
      // Need width relative to resting to be stretched
      const stretchRequired = restingSmileWidth * 1.15; // 15% stretch
      if (smileValue >= stretchRequired) {
        targetMet = true;
      }
    } else if (selectedExercise.id === 'lip_pucker') {
      // Lip vertical to horizontal ratio must rise, width must shrink
      const puckerRequired = restingPuckerRatio * 2.5;
      if (puckerValue >= puckerRequired && smileValue < restingSmileWidth * 0.95) {
        targetMet = true;
      }
    } else if (selectedExercise.id === 'mouth_open') {
      // Vertical distance must exceed resting by multiple
      const openRequired = restingMouthOpen * 2.8;
      if (openValue >= openRequired) {
        targetMet = true;
      }
    }

    if (targetMet) {
      setHoldTimer(prev => {
        const next = prev + (1 / 30); // Approx 30fps from mediapipe send
        if (next >= selectedExercise.targetValue) {
          setIsRunning(false);
          setExerciseComplete(true);
          awardExercisePoints();
          return selectedExercise.targetValue;
        }
        return next;
      });
    } else {
      // Decay timer slightly if they slip, encouraging holding the pose
      setHoldTimer(prev => Math.max(0, prev - (1 / 15)));
    }
  }, [isRunning, selectedExercise, restingSmileWidth, restingPuckerRatio, restingMouthOpen]);

  // Handle Calibration frame
  const handleCalibrationFrame = useCallback((smileValue: number, puckerValue: number, openValue: number) => {
    if (!isCalibrating) return;

    setRestingSmileWidth(p => p + smileValue);
    setRestingPuckerRatio(p => p + puckerValue);
    setRestingMouthOpen(p => p + openValue);
    setCalibrationCounter(c => {
      const next = c + 1;
      if (next >= 3) { // Calibrate over 3 frames
        setIsCalibrating(false);
        setIsCalibrated(true);
        // Average the accumulated resting metrics
        setRestingSmileWidth(p => p / 3);
        setRestingPuckerRatio(p => p / 3);
        setRestingMouthOpen(p => p / 3);
      }
      return next;
    });
  }, [isCalibrating]);

  const isCalibratingLatestRef = useRef(isCalibrating);
  const isRunningLatestRef = useRef(isRunning);
  const isCalibratedLatestRef = useRef(isCalibrated);
  const handleCalibrationFrameLatestRef = useRef(handleCalibrationFrame);
  const handleOralMotorMetricsLatestRef = useRef(handleOralMotorMetrics);

  useEffect(() => {
    isCalibratingLatestRef.current = isCalibrating;
    isRunningLatestRef.current = isRunning;
    isCalibratedLatestRef.current = isCalibrated;
    handleCalibrationFrameLatestRef.current = handleCalibrationFrame;
    handleOralMotorMetricsLatestRef.current = handleOralMotorMetrics;
  }, [isCalibrating, isRunning, isCalibrated, handleCalibrationFrame, handleOralMotorMetrics]);

  // MediaPipe FaceMesh initialization
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setCameraLoading(true);
    setCameraError(null);
    setCameraPreviewOnly(false);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFaceMesh: any = null;
    let localPreviewStream: MediaStream | null = null;
    let previewFrameId: number | null = null;
    let manualTrackingFrameId: number | null = null;

    const startCameraPreviewOnly = async (message: string) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("이 브라우저는 카메라 입력을 지원하지 않습니다. Chrome 또는 Safari에서 다시 시도해 주세요.");
        setCameraLoading(false);
        return;
      }

      try {
        localPreviewStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        video.srcObject = localPreviewStream;
        await video.play();
        setCameraPreviewOnly(true);
        setCameraError(message);
        setCameraLoading(false);

        const drawPreview = () => {
          if (!videoRef.current || !canvasRef.current) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          ctx.restore();
          previewFrameId = requestAnimationFrame(drawPreview);
        };
        drawPreview();
      } catch (err: any) {
        console.error("Camera preview failed:", err);
        const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
        setCameraError(
          denied
            ? "카메라 권한이 차단되었습니다. 브라우저 주소창의 권한 설정에서 카메라를 허용해 주세요."
            : "카메라를 열 수 없습니다. 다른 앱이 카메라를 사용 중인지 확인해 주세요."
        );
        setCameraPreviewOnly(false);
        setCameraLoading(false);
      }
    };

    const startManualFaceTracking = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !localFaceMesh) {
        startCameraPreviewOnly("정밀 얼굴 추적을 시작하지 못해 카메라 미리보기만 표시합니다. 브라우저 권한과 네트워크 상태를 확인해 주세요.");
        return;
      }

      try {
        localPreviewStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        video.srcObject = localPreviewStream;
        await video.play();
        setCameraPreviewOnly(false);
        setCameraError(null);
        setCameraLoading(false);

        const sendFrame = async () => {
          if (!videoRef.current || !localFaceMesh) return;
          try {
            await localFaceMesh.send({ image: videoRef.current });
          } catch (e) {
            console.error("Manual frame processing error:", e);
          }
          manualTrackingFrameId = requestAnimationFrame(sendFrame);
        };
        sendFrame();
      } catch (err: any) {
        console.error("Manual face tracking camera failed:", err);
        const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
        setCameraError(
          denied
            ? "카메라 권한이 차단되었습니다. 브라우저 주소창의 권한 설정에서 카메라를 허용해 주세요."
            : "카메라를 열 수 없습니다. 다른 앱이 카메라를 사용 중인지 확인해 주세요."
        );
        setCameraPreviewOnly(false);
        setCameraLoading(false);
      }
    };

    const onResults = (results: any) => {
      setCameraLoading(false);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Begin mirrored context block for video & overlay tracking sync
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Draw the mirrored webcam image to canvas
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // Extract mesh landmarks
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Specific indices for Mouth and face shape
        const leftCorner = landmarks[78];   // Lip corner left
        const rightCorner = landmarks[308]; // Lip corner right
        const topLip = landmarks[13];       // Upper inner lip
        const bottomLip = landmarks[14];    // Lower inner lip
        const cheekLeft = landmarks[234];   // Left face contour edge
        const cheekRight = landmarks[454];  // Right face contour edge
        const centerNose = landmarks[4];     // Center of nose (midline)

        if (leftCorner && rightCorner && topLip && bottomLip && cheekLeft && cheekRight) {
          // Normalize distances based on overall cheek-to-cheek horizontal distance
          const cheekDist = Math.sqrt(
            Math.pow(cheekLeft.x - cheekRight.x, 2) +
            Math.pow(cheekLeft.y - cheekRight.y, 2)
          );

          // Oral Metrics Calculations
          const lipWidthRaw = Math.sqrt(
            Math.pow(leftCorner.x - rightCorner.x, 2) +
            Math.pow(leftCorner.y - rightCorner.y, 2)
          );
          const lipHeightRaw = Math.sqrt(
            Math.pow(topLip.x - bottomLip.x, 2) +
            Math.pow(topLip.y - bottomLip.y, 2)
          );

          const smileRatio = cheekDist > 0 ? (lipWidthRaw / cheekDist) : 0.38;
          const openRatio = cheekDist > 0 ? (lipHeightRaw / cheekDist) : 0.06;
          const puckerRatio = lipWidthRaw > 0 ? (lipHeightRaw / lipWidthRaw) : 0.12;

          // Symmetry check: compare distances from center of cheeks to mouth corners
          const midlineX = centerNose ? centerNose.x : (cheekLeft.x + cheekRight.x) / 2;
          const leftMouthDist = Math.abs(leftCorner.x - midlineX);
          const rightMouthDist = Math.abs(rightCorner.x - midlineX);
          const rawSymmetry = (leftMouthDist + rightMouthDist) > 0
            ? 1 - (Math.abs(leftMouthDist - rightMouthDist) / (leftMouthDist + rightMouthDist))
            : 1.0;

          // Push live states to UI
          setLiveSmile(smileRatio);
          setLivePucker(puckerRatio);
          setLiveOpen(openRatio);
          setLiveSymmetry(rawSymmetry);

          // Manage calibration accumulation
          if (isCalibratingLatestRef.current) {
            handleCalibrationFrameLatestRef.current(smileRatio, puckerRatio, openRatio);
          }

          // Exercise validation holds
          if (isRunningLatestRef.current && isCalibratedLatestRef.current) {
            handleOralMotorMetricsLatestRef.current(smileRatio, puckerRatio, openRatio, rawSymmetry);
          }

          // Draw clinical overlays on the canvas (directly mapped in mirrored coords)
          const mappedLeft = { x: leftCorner.x * canvas.width, y: leftCorner.y * canvas.height };
          const mappedRight = { x: rightCorner.x * canvas.width, y: rightCorner.y * canvas.height };
          const mappedTop = { x: topLip.x * canvas.width, y: topLip.y * canvas.height };
          const mappedBottom = { x: bottomLip.x * canvas.width, y: bottomLip.y * canvas.height };
          const mappedMidline = midlineX * canvas.width;

          // 1. Draw glowing lips connectors (Custom implementation to avoid Mediapipe drawing_utils double-mirroring / transform reset bugs)
          if (window.FACEMESH_LIPS && landmarks) {
            ctx.beginPath();
            for (const connection of window.FACEMESH_LIPS) {
              const start = landmarks[connection[0]];
              const end = landmarks[connection[1]];
              if (start && end) {
                ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
                ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
              }
            }
            ctx.strokeStyle = isListening ? '#14b8a6' : '#22d3ee'; // Teal or Cyan
            ctx.lineWidth = 3.5;
            ctx.stroke();
          }

          // 2. Draw midline symmetry reference axis
          ctx.beginPath();
          ctx.setLineDash([6, 6]);
          ctx.moveTo(mappedMidline, 0);
          ctx.lineTo(mappedMidline, canvas.height);
          ctx.strokeStyle = rawSymmetry > 0.92 ? '#22c55e' : '#f59e0b'; // Green or Amber symmetry
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]); // reset

          // 3. Highlight critical tracking indicators
          ctx.fillStyle = '#f43f5e'; // Rose dots for key corners
          [mappedLeft, mappedRight, mappedTop, mappedBottom].forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });

          // Draw alignment line between left & right lip corners
          ctx.beginPath();
          ctx.moveTo(mappedLeft.x, mappedLeft.y);
          ctx.lineTo(mappedRight.x, mappedRight.y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Restore normal coordinate system
      ctx.restore();

      // If no face mesh landmarks are detected, draw the error message in unmirrored view
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText('No Face Detected in Camera Feed', canvas.width / 2, canvas.height / 2);
      }
    };

    if (window.FaceMesh) {
      localFaceMesh = new window.FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559585/${file}`,
      });
      localFaceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      localFaceMesh.onResults(onResults);
      startManualFaceTracking();
    } else {
      startCameraPreviewOnly("MediaPipe FaceMesh를 불러오지 못해 정밀 얼굴 추적 없이 카메라 미리보기만 표시합니다. 네트워크 또는 CDN 차단을 확인해 주세요.");
    }

    faceMeshRef.current = localFaceMesh;
    cameraRef.current = null;

    return () => {
      if (previewFrameId !== null) cancelAnimationFrame(previewFrameId);
      if (manualTrackingFrameId !== null) cancelAnimationFrame(manualTrackingFrameId);
      if (localPreviewStream) localPreviewStream.getTracks().forEach(track => track.stop());
      if (video.srcObject) video.srcObject = null;
      if (localFaceMesh) localFaceMesh.close();
      stopAudioTracking();
      stopSpeechRecognition();
    };
  }, []);

  // Handle auto speech audio state cleanup
  useEffect(() => {
    if (selectedExercise.id !== 'breath_support') {
      stopAudioTracking();
    }
    if (selectedExercise.id !== 'speech_drill') {
      stopSpeechRecognition();
    }
  }, [selectedExercise]);

  // Audio exercise completion trigger
  useEffect(() => {
    if (selectedExercise.id === 'breath_support' && isRunning) {
      if (sessionSustainDuration >= selectedExercise.targetValue) {
        setIsRunning(false);
        stopAudioTracking();
        setExerciseComplete(true);
        awardExercisePoints();
      }
    }
  }, [sessionSustainDuration, isRunning, selectedExercise]);

  const completedExerciseCounts: number[] = Object.values(stats.completedExercises).map(Number);
  const totalCompletedExercises = completedExerciseCounts.reduce((total, count) => total + count, 0);
  const maxCompletedExercises = Math.max(...completedExerciseCounts, 1);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans select-none antialiased">
      {/* Header navigation bar */}
      <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500/10 p-2 rounded-xl border border-teal-500/20 text-teal-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                렉시톤 <span className="text-xs bg-teal-500/20 text-teal-400 font-medium px-2 py-0.5 rounded-full border border-teal-500/30">구어 재활 AI</span>
              </h1>
              <p className="text-xs text-gray-400">구강 안면 및 호흡 조음 근육 재활 치료</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
            {(['exercises', 'analytics', 'about'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab
                    ? 'bg-gray-800 text-teal-400 shadow-md border border-gray-700/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                  }`}
              >
                {TAB_TRANSLATIONS[tab]}
              </button>
            ))}
          </nav>

          {/* Trophy, Streaks & Auth Account */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full text-rose-400">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold font-mono">{currentUser ? `${stats.streak}일 연속` : '3일 연속'}</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-400">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-bold font-mono">{stats.points} XP</span>
            </div>

            {/* Google Authentication Panel */}
            {authLoading ? (
              <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-teal-400 animate-spin" />
            ) : currentUser ? (
              <div className="flex items-center gap-2.5 bg-gray-950/80 border border-gray-800 rounded-xl p-1 pr-2.5">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="User"
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-lg border border-teal-500/30 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xs uppercase">
                    {(currentUser.displayName || 'U')[0]}
                  </div>
                )}
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold text-white max-w-[80px] truncate">{currentUser.displayName || '사용자'}</span>
                  <span className="text-[8px] text-teal-400 font-medium">Connected</span>
                </div>
                <button
                  onClick={() => firebaseLogOut()}
                  title="로그아웃 (Sign Out)"
                  className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-gray-950 px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-teal-500/5 transition-all font-sans"
              >
                <LogIn className="w-3.5 h-3.5" />
                Google 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'exercises' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Clinical Camera & Patient Profile */}
              <div className="lg:col-span-5 space-y-4">
                {/* Camera / Tracking Board */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                  {/* Title Bar */}
                  <div className="p-4 bg-gray-900/40 border-b border-gray-800 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] bg-teal-500/10 text-teal-400 border border-teal-500/25 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                        CLINICAL SENSORS
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1">실시간 안면 및 구강 가동성 센서</h3>
                    </div>
                    {isListening && (
                      <div className="flex items-center gap-1.5 bg-rose-500/15 text-rose-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-rose-500/20 animate-pulse">
                        <span className="w-2 h-2 bg-rose-500 rounded-full shrink-0" />
                        LIVE TRACKING
                      </div>
                    )}
                  </div>

                  {/* Interactive tracking canvas board */}
                  <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center">
                    {/* Live Video placeholder loaded hidden */}
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      width="640"
                      height="480"
                      className="hidden"
                    />

                    {/* MediaPipe Processing Canvas overlay */}
                    <canvas
                      ref={canvasRef}
                      width="640"
                      height="480"
                      className="w-full h-full object-cover"
                    />

                    {/* Camera Loading Spinner */}
                    {cameraLoading && (
                      <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-10 h-10 text-teal-400 animate-spin" />
                        <p className="text-sm text-gray-400">얼굴 움직임 정밀 추적 센서를 가동하고 있습니다...</p>
                      </div>
                    )}

                    {/* Camera Error Message */}
                    {cameraError && !cameraPreviewOnly && (
                      <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center p-6 text-center gap-3">
                        <ShieldAlert className="w-12 h-12 text-rose-500 animate-bounce" />
                        <h4 className="font-bold text-lg">카메라 연결 실패</h4>
                        <p className="text-sm text-gray-400 max-w-sm">{cameraError}</p>
                      </div>
                    )}

                    {cameraError && cameraPreviewOnly && (
                      <div className="absolute left-4 right-4 bottom-4 bg-gray-950/90 backdrop-blur-md border border-amber-500/30 rounded-2xl p-3 text-left shadow-lg">
                        <div className="flex gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-amber-300">정밀 얼굴 추적 비활성화</h4>
                            <p className="text-[11px] text-gray-300 mt-0.5">{cameraError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Live Metric Overlays while doing drills */}
                    {(isRunning || isListening) && (
                      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none w-[170px] z-10">
                        {/* Smile Width Stretch Gauge */}
                        <div className="bg-gray-950/90 backdrop-blur-md p-2 rounded-xl border border-gray-800/80 shadow-lg w-full">
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">입꼬리 가로 미소 비율</p>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-extrabold text-teal-400 font-mono">{(liveSmile * 10).toFixed(1)}</span>
                            <span className="text-[8px] text-gray-500">{(restingSmileWidth * 10).toFixed(1)} 기준</span>
                          </div>
                          <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-teal-500 transition-all duration-75"
                              style={{ width: `${Math.min(100, (liveSmile / (restingSmileWidth * 1.3)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Lip Pucker Gauge */}
                        <div className="bg-gray-950/90 backdrop-blur-md p-2 rounded-xl border border-gray-800/80 shadow-lg w-full">
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">입술 오므리기 비율</p>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-extrabold text-cyan-400 font-mono">{(livePucker).toFixed(2)}</span>
                            <span className="text-[8px] text-gray-500">{(restingPuckerRatio * 2.5).toFixed(2)} 목표</span>
                          </div>
                          <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-cyan-500 transition-all duration-75"
                              style={{ width: `${Math.min(100, (livePucker / (restingPuckerRatio * 2.5)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Mouth Open Height Gauge */}
                        <div className="bg-gray-950/90 backdrop-blur-md p-2 rounded-xl border border-gray-800/80 shadow-lg w-full">
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">구강 개방도 (턱 내림)</p>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-extrabold text-amber-400 font-mono">{(liveOpen * 10).toFixed(1)}</span>
                            <span className="text-[8px] text-gray-500">{(restingMouthOpen * 10 * 2).toFixed(1)} 목표</span>
                          </div>
                          <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-amber-500 transition-all duration-75"
                              style={{ width: `${Math.min(100, (liveOpen / (restingMouthOpen * 2)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Real-time Facial Symmetry Box */}
                        <div className="bg-gray-950/90 backdrop-blur-md p-2 rounded-xl border border-gray-800/80 shadow-lg w-full">
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">입꼬리 대칭 균형도</p>
                          <div className="flex items-baseline justify-between">
                            <span className={`text-xs font-extrabold font-mono ${(liveSymmetry * 100) > 92 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {Math.round(liveSymmetry * 100)}%
                            </span>
                            <span className="text-[8px] text-gray-500">좌우 균형</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Clinician's Real-time Feedback Ticker */}
                    <div className="absolute bottom-4 left-4 right-4 bg-gray-950/90 backdrop-blur-md border border-teal-500/20 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl pointer-events-none z-10">
                      <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-bold text-teal-400 uppercase tracking-wider block">실시간 임상 조음 피드백 (Clinician Feed)</span>
                        <p className="text-xs text-white font-medium truncate">
                          {getLiveClinicalFeedback()}
                        </p>
                      </div>
                    </div>

                    {/* SUCCESS ANIMATION CONTAINER */}
                    {exerciseComplete && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-teal-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="bg-teal-500/20 p-5 rounded-full border border-teal-500/40 text-teal-400 mb-4"
                        >
                          <Award className="w-14 h-14" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-white tracking-tight">발음 연습 완료!</h3>
                        <p className="text-teal-200 text-sm mt-2 max-w-sm">
                          훌륭한 대칭 조화와 조음 안면 협응력을 보여주셨습니다. <span className="font-bold text-teal-300">+100 XP</span>를 획득하셨습니다.
                        </p>

                        <div className="flex gap-3 mt-8">
                          <button
                            onClick={resetLivePerformanceMetrics}
                            className="bg-teal-500 hover:bg-teal-400 text-gray-950 font-bold text-sm px-6 py-2.5 rounded-2xl shadow transition"
                          >
                            다시 연습하기
                          </button>

                          {/* Generate AI Analysis Button */}
                          <button
                            onClick={triggerAiReview}
                            disabled={aiAnalyzing}
                            className="bg-gray-950 hover:bg-gray-800 border border-gray-700 font-semibold text-sm px-6 py-2.5 rounded-2xl flex items-center gap-2 transition text-white"
                          >
                            {aiAnalyzing ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin text-teal-400" /> SLP 전문 인공지능 분석 중...
                              </>
                            ) : (
                              <>
                                <Brain className="w-4 h-4 text-teal-400" /> Gemini 전문 임상 피드백 받기
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Patient Profile & Progress Overview */}
                <div className="bg-gray-900 border border-gray-800/80 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-800 p-2.5 rounded-full text-gray-300 border border-gray-700">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">개인 구어 프로필</h4>
                      <p className="text-xs text-gray-400">대칭 보정 가동 상태</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>보정 프로필 상태</span>
                        <span className={isCalibrated ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                          {isCalibrated ? '인증됨 ✓' : '미보정 ⚠️'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-950 rounded-full overflow-hidden">
                        <div className={`h-full ${isCalibrated ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: isCalibrated ? '100%' : '15%' }} />
                      </div>
                    </div>

                    {!isCalibrated ? (
                      <p className="text-xs text-gray-400 leading-relaxed">
                        ⚠️ 보다 정밀하고 객관적인 임상 조음 피드백을 위해, 말하기 전에 안면 보정을 완료해 주세요. 무표정한 편안한 자세에서 시작할 수 있습니다.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-400 bg-gray-950 p-3 rounded-xl border border-gray-800">
                        <div>평시 가로폭: {restingSmileWidth.toFixed(2)}</div>
                        <div>평시 오므리기: {restingPuckerRatio.toFixed(2)}</div>
                        <div>평시 상하폭: {restingMouthOpen.toFixed(2)}</div>
                        <div className="text-emerald-400 text-right">보정 승인 완료 ✓</div>
                      </div>
                    )}

                    <button
                      onClick={startCalibration}
                      disabled={isCalibrating}
                      className="w-full bg-gray-950 hover:bg-gray-800 disabled:opacity-50 text-xs py-2 px-3 rounded-xl border border-gray-800 hover:border-gray-700 text-teal-400 transition-all font-medium flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin text-teal-400' : ''}`} />
                      {isCalibrating ? `보정 진행 중 (${calibrationCounter}/3)...` : '안면 기준 보정 시작 (Calibrate)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Active Exercise Workspace (Speech Articulation Drills) */}
              <div className="lg:col-span-7 space-y-6">

                {/* Workspace Board */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                  {/* Title Bar */}
                  <div className="p-6 bg-gray-900/40 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/25 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                        {CATEGORY_TRANSLATIONS[selectedExercise.category] || selectedExercise.category}
                      </span>
                      <h2 className="text-xl font-bold text-white mt-1.5">{selectedExercise.name}</h2>
                      <p className="text-xs text-gray-400 mt-1">{selectedExercise.description}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-950/60 space-y-5">

                    {/* Language & Accent Mode Selector */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">재활 발음 언어 및 버전 선택 (Training Language & Mode)</label>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-gray-900/80 p-1.5 rounded-2xl border border-gray-800/80">
                        <button
                          type="button"
                          onClick={() => setLanguageMode('en')}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${languageMode === 'en'
                              ? 'bg-teal-500 text-gray-950 font-bold shadow-lg shadow-teal-500/10'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                          <span className="text-sm">🇺🇸</span> English (en-US)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguageMode('ko_std')}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${languageMode === 'ko_std'
                              ? 'bg-teal-500 text-gray-950 font-bold shadow-lg shadow-teal-500/10'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                          <span className="text-sm">🇰🇷</span> 한국어 (표준어)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguageMode('ko_phon')}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${languageMode === 'ko_phon'
                              ? 'bg-teal-500 text-gray-950 font-bold shadow-lg shadow-teal-500/10'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                          <span className="text-sm">🇰🇷</span> 실제 발음법 표기
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguageMode('ko_dialect')}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${languageMode === 'ko_dialect'
                              ? 'bg-teal-500 text-gray-950 font-bold shadow-lg shadow-teal-500/10'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                          <span className="text-sm">🇰🇷</span> 경상 방언/억양
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                      {/* List of custom drills */}
                      <div className="md:col-span-5 space-y-2">
                        <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                          {MULTILINGUAL_UI[languageMode].selectDrill}
                        </label>
                        <div className="max-h-56 overflow-y-auto space-y-1.5 border border-gray-800 rounded-2xl p-2 bg-gray-950">
                          {DRILL_PHRASES_BY_LANG[languageMode].map((drill, idx) => {
                            const isSelected = selectedDrill.phrase === drill.phrase;
                            const ui = MULTILINGUAL_UI[languageMode];
                            const difficultyLabel = drill.difficulty === 'Easy' ? ui.difficultyEasy :
                              drill.difficulty === 'Medium' ? ui.difficultyMedium :
                                ui.difficultyHard;
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSelectedDrill(drill);
                                  resetLivePerformanceMetrics();
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${isSelected
                                    ? 'bg-teal-500/15 border-teal-500/35 text-teal-300 font-semibold'
                                    : 'hover:bg-gray-900 border-transparent text-gray-400'
                                  }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold">"{drill.phrase}"</span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${drill.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                                      drill.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                                        'bg-rose-500/10 text-rose-400'
                                    }`}>
                                    {difficultyLabel}
                                  </span>
                                </div>
                                <span className="text-[9px] text-gray-500 block mt-0.5">{drill.category}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Interactive Speech Rec Controller */}
                      <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                            {MULTILINGUAL_UI[languageMode].sayFollowing}
                          </span>
                          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 text-center">
                            <p className="text-xl font-bold text-white tracking-wide">"{selectedDrill.phrase}"</p>
                            <p className="text-[10px] text-teal-400 mt-1.5 font-medium">
                              {MULTILINGUAL_UI[languageMode].targetPhoneme}: /{selectedDrill.targetPhoneme}/
                            </p>
                          </div>
                        </div>

                        {/* Controls & Speech Transcription output */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={toggleSpeechRecognition}
                              className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition ${isListening
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse'
                                  : 'bg-gray-900 hover:bg-gray-800 text-teal-400 border-gray-800'
                                }`}
                            >
                              {isListening ? (
                                <>
                                  <MicOff className="w-4 h-4 text-rose-400" /> {MULTILINGUAL_UI[languageMode].stopListening}
                                </>
                              ) : (
                                <>
                                  <Mic className="w-4 h-4 text-teal-400" /> {MULTILINGUAL_UI[languageMode].speakNow}
                                </>
                              )}
                            </button>
                          </div>

                          {/* Captured Speech Output */}
                          <div className="bg-gray-950 p-3 rounded-2xl border border-gray-800/80 min-h-[50px] flex items-center justify-between text-xs">
                            <div className="flex-1">
                              <span className="text-[9px] text-gray-500 block uppercase font-bold">
                                {MULTILINGUAL_UI[languageMode].realtimeTranscript}
                              </span>
                              <p className="text-white italic mt-1 font-medium">
                                {speechTranscript || <span className="text-gray-600 font-normal">"{MULTILINGUAL_UI[languageMode].waitingSpeech}"</span>}
                              </p>
                              {(speechError || audioPermissionError) && (
                                <p className="text-[11px] text-rose-300 mt-2 not-italic font-medium">
                                  {speechError || "마이크 권한이 필요합니다. 브라우저 권한 설정을 확인해 주세요."}
                                </p>
                              )}
                            </div>
                            {speechSuccessRate !== null && (
                              <div className="text-right shrink-0 bg-gray-900 px-3 py-1 rounded-xl border border-gray-800 ml-4">
                                <span className="text-[9px] text-gray-500 block font-bold uppercase">
                                  {MULTILINGUAL_UI[languageMode].accuracy}
                                </span>
                                <span className={`text-sm font-bold font-mono ${speechSuccessRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {speechSuccessRate}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Interactive Pronunciation Guide & Answer Sheet Helper */}
                    <div className="pt-5 border-t border-gray-800/80 mt-6">
                      <div className="bg-gray-950/85 border border-teal-500/15 rounded-2xl p-5 space-y-4 shadow-inner">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Volume2 className="w-5 h-5 text-teal-400" />
                            <div>
                              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                                임상 조음 모범 답안 <span className="text-[10px] bg-teal-500/15 text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-500/20 uppercase">안내서 (Answer Sheet)</span>
                              </h4>
                              <p className="text-[10px] text-gray-400">전문 언어치료사의 발성 억양, 호흡 조절 및 오디오 정박 템포 기준표</p>
                            </div>
                          </div>

                          {/* Standard Pronunciation Playback Button */}
                          <button
                            type="button"
                            onClick={() => playTTS(selectedDrill.phrase)}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-gray-950 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-teal-500/10 active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {languageMode === 'en' ? 'Play Standard Audio' : '모범 표준 발음 듣기'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
                          {/* Mouth Control */}
                          <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/80 space-y-1.5 hover:border-teal-500/10 transition-all duration-200">
                            <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider block flex items-center gap-1.5">
                              👄 {languageMode === 'en' ? 'Mouth & Lip Control' : '구강 및 입술 제어'}
                            </span>
                            <p className="text-gray-300 font-medium leading-relaxed">
                              {DRILL_GUIDES[selectedDrill.phrase]?.mouth || (languageMode === 'en' ? 'Place speech articulators naturally.' : '조음 기관을 바르게 위치시키고 명확히 조음하십시오.')}
                            </p>
                          </div>

                          {/* Voicing Tone */}
                          <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/80 space-y-1.5 hover:border-teal-500/10 transition-all duration-200">
                            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                              🗣️ {languageMode === 'en' ? 'Voicing Tone & Resonance' : '발성 톤 및 성대 조절'}
                            </span>
                            <p className="text-gray-300 font-medium leading-relaxed">
                              {DRILL_GUIDES[selectedDrill.phrase]?.tone || (languageMode === 'en' ? 'Keep a stable, steady voice pitch.' : '성대 긴장을 조율하며 안정적인 목소리 톤을 내십시오.')}
                            </p>
                          </div>

                          {/* Rhythm & Pacing */}
                          <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/80 space-y-1.5 hover:border-teal-500/10 transition-all duration-200">
                            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider block flex items-center gap-1.5">
                              ⏱️ {languageMode === 'en' ? 'Rhythm & Pacing' : '발화 리듬 및 템포'}
                            </span>
                            <p className="text-gray-300 font-medium leading-relaxed">
                              {DRILL_GUIDES[selectedDrill.phrase]?.rhythm || (languageMode === 'en' ? 'Speak with steady, deliberate timing.' : '음절 간 길이를 고르게 배분하고 또박또박 낭독하십시오.')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Gemini AI Clinical Feedback Section */}
                <AnimatePresence>
                  {(aiFeedback || aiAnalyzing) && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="bg-gray-900 border border-teal-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden"
                    >
                      {/* Beautiful ambient teal glow background decoration */}
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-center gap-2 text-teal-400 font-bold text-sm tracking-wide mb-4">
                        <Brain className="w-5 h-5" />
                        <span>GEMINI 실시간 언어 재활 AI 코파일럿</span>
                        <span className="ml-auto text-xs bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 uppercase">인공지능 분석 결과</span>
                      </div>

                      {aiAnalyzing ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
                          <p className="text-sm text-gray-400">Gemini 언어치료 모델이 발음 정확도와 안면 대칭성을 정밀 분석하고 있습니다...</p>
                        </div>
                      ) : (
                        <div className="space-y-5 text-sm text-gray-300 leading-relaxed">

                          {/* Assessment */}
                          <div className="space-y-1">
                            <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
                              <Sparkles className="w-4 h-4 text-teal-400" /> 언어 임상적 종합 진단
                            </h4>
                            <p className="text-gray-300 text-xs bg-gray-950 p-4 rounded-2xl border border-gray-800 leading-relaxed">
                              {aiFeedback?.assessment}
                            </p>
                          </div>

                          {/* Phonetic Feedback */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800/80 space-y-1">
                              <h5 className="font-semibold text-white text-xs flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-cyan-400" /> 조음 동작 및 음소 피드백
                              </h5>
                              <p className="text-gray-400 text-xs leading-relaxed pt-1">
                                {aiFeedback?.phoneticFeedback}
                              </p>
                            </div>

                            {/* Score Explanation */}
                            <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800/80 space-y-1">
                              <h5 className="font-semibold text-white text-xs flex items-center gap-1.5">
                                <Trophy className="w-3.5 h-3.5 text-amber-400" /> 근육 활용도 및 강도 분석
                              </h5>
                              <p className="text-gray-400 text-xs leading-relaxed pt-1">
                                {aiFeedback?.scoreExplanation}
                              </p>
                            </div>
                          </div>

                          {/* Exercises & Drills list */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-800/80 pt-4">

                            {/* Recommended exercises */}
                            <div className="space-y-2">
                              <h5 className="text-xs text-teal-300 font-bold uppercase">추천 구강 안면 강화 운동</h5>
                              <ul className="space-y-1.5">
                                {aiFeedback?.recommendedExercises.map((rec, i) => (
                                  <li key={i} className="text-xs flex items-start gap-2 text-gray-400">
                                    <span className="text-teal-400 shrink-0">✓</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Custom drills */}
                            <div className="space-y-2">
                              <h5 className="text-xs text-cyan-300 font-bold uppercase font-mono">맞춤형 추가 발음 훈련 단어</h5>
                              <div className="space-y-1.5">
                                {aiFeedback?.customDrills.map((drill, i) => (
                                  <div key={i} className="text-xs bg-gray-950/80 px-3 py-2 rounded-xl border border-gray-800/80 text-white font-medium italic">
                                    "{drill}"
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>

                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-8"
            >
              {/* Overall Progress Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl shadow-sm text-center">
                  <span className="text-xs text-gray-400 uppercase tracking-wider block font-bold">총 완료 훈련 횟수</span>
                  <p className="text-4xl font-extrabold text-white mt-2 font-mono">
                    {totalCompletedExercises}회
                  </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl shadow-sm text-center">
                  <span className="text-xs text-gray-400 uppercase tracking-wider block font-bold">재활 레벨</span>
                  <p className="text-4xl font-extrabold text-teal-400 mt-2 font-mono">
                    레벨 {Math.floor(stats.points / 500) + 1}
                  </p>
                  <span className="text-[10px] text-gray-500 block mt-1">(다음 레벨까지: {stats.points % 500} / 500 XP)</span>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl shadow-sm text-center">
                  <span className="text-xs text-gray-400 uppercase tracking-wider block font-bold">연속 훈련 기록</span>
                  <p className="text-4xl font-extrabold text-orange-400 mt-2 font-mono flex items-center justify-center gap-1.5">
                    <Flame className="w-8 h-8 text-orange-500 fill-current" />
                    3일째
                  </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl shadow-sm text-center">
                  <span className="text-xs text-gray-400 uppercase tracking-wider block font-bold">평균 대칭성 지수</span>
                  <p className="text-4xl font-extrabold text-emerald-400 mt-2 font-mono">
                    94%
                  </p>
                  <span className="text-[10px] text-gray-500 block mt-1">매우 훌륭한 좌우 균형</span>
                </div>
              </div>

              {/* Grid: Completed History & Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Exercise Distribution */}
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl">
                  <h3 className="text-base font-bold text-white mb-4">재활 훈련 프로그램 분포 및 통계</h3>
                  <div className="space-y-4">
                    {EXERCISE_LIST.map((ex) => {
                      const count = stats.completedExercises[ex.id] || 0;
                      const percent = (count / maxCompletedExercises) * 100;
                      return (
                        <div key={ex.id} className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-300">
                            <span className="font-semibold">{ex.name}</span>
                            <span className="font-mono text-gray-400 font-bold">{count}회 완료</span>
                          </div>
                          <div className="h-2 w-full bg-gray-950 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Training Session Logs */}
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl lg:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-teal-400" />
                      {currentUser ? '개인 맞춤형 AI 재활 정밀 리포트' : '세션별 상세 훈련 로그'}
                    </h3>
                    {currentUser && (
                      <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                        Firestore Cloud Sync Active
                      </span>
                    )}
                  </div>

                  {!currentUser && (
                    <div className="mb-4 bg-teal-950/20 border border-teal-500/20 p-3.5 rounded-2xl flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="text-xs text-gray-300 leading-relaxed">
                        <strong className="text-teal-400 block font-semibold mb-0.5">스마트 클라우드 동기화 권장</strong>
                        Google 계정으로 로그인하시면 모든 재활 세션 데이터와 안면 기준 보정 값, Gemini 정밀 분석 리포트가 클라우드에 안전하게 보관되며 언제든지 다시 열람하실 수 있습니다.
                      </div>
                    </div>
                  )}

                  {currentUser ? (
                    sessionsHistory.length === 0 ? (
                      <div className="py-12 text-center text-sm text-gray-500">
                        완료된 재활 훈련이 클라우드에 없습니다. 첫 번째 훈련을 완료해 보세요!
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {sessionsHistory.map((session, idx) => {
                          const isExpanded = expandedSessionId === session.id;
                          const formattedDate = session.timestamp
                            ? new Date(session.timestamp).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            : '날짜 정보 없음';

                          return (
                            <div
                              key={session.id || idx}
                              className={`bg-gray-950 rounded-2xl border transition-all duration-200 overflow-hidden ${isExpanded ? 'border-teal-500/40 shadow-lg shadow-teal-500/5' : 'border-gray-800/80 hover:border-gray-700'
                                }`}
                            >
                              {/* Session Header Card */}
                              <div
                                onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                className="p-4 flex justify-between items-center cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="bg-teal-500/10 p-2.5 rounded-xl text-teal-400 border border-teal-500/10">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white flex items-center gap-2">
                                      {session.exerciseName}
                                      <span className="text-[10px] bg-gray-900 border border-gray-800 text-gray-400 font-normal px-2 py-0.5 rounded-full">
                                        Level {Math.floor(stats.points / 500) + 1}
                                      </span>
                                    </p>
                                    <span className="text-[9px] text-gray-500 font-mono block mt-1">{formattedDate}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <span className="text-[10px] text-gray-500 block">수행 점수</span>
                                    <span className="text-sm font-bold font-mono text-teal-400">{session.score}%</span>
                                  </div>
                                  <div className="text-right border-l border-gray-800 pl-4">
                                    <span className="text-[10px] text-gray-500 block">보상</span>
                                    <span className="text-sm font-bold font-mono text-amber-400">+100 XP</span>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  )}
                                </div>
                              </div>

                              {/* Expanded Session Details */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-gray-900 bg-gray-950/40 p-5 space-y-5 text-xs text-gray-300"
                                  >
                                    {/* Metrics Grid */}
                                    {session.metrics && (
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-gray-900/40 border border-gray-900 p-3 rounded-xl">
                                          <span className="text-[10px] text-gray-500 uppercase font-semibold">입꼬리 가동 범위</span>
                                          <p className="text-sm font-bold font-mono text-white mt-0.5">{(session.metrics.maxSmileWidth || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="bg-gray-900/40 border border-gray-900 p-3 rounded-xl">
                                          <span className="text-[10px] text-gray-500 uppercase font-semibold">입술 돌출 비율</span>
                                          <p className="text-sm font-bold font-mono text-white mt-0.5">{(session.metrics.maxPuckerRatio || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="bg-gray-900/40 border border-gray-900 p-3 rounded-xl">
                                          <span className="text-[10px] text-gray-500 uppercase font-semibold">구강 수직 개방도</span>
                                          <p className="text-sm font-bold font-mono text-white mt-0.5">{(session.metrics.maxMouthOpen || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="bg-gray-900/40 border border-gray-900 p-3 rounded-xl">
                                          <span className="text-[10px] text-gray-500 uppercase font-semibold">좌우 비대칭 편차</span>
                                          <p className="text-sm font-bold font-mono text-rose-400 mt-0.5">
                                            {((session.metrics.leftRightAsymmetry || 0) * 100).toFixed(1)}%
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Targets and Transcripts */}
                                    {session.targetPhrase && (
                                      <div className="bg-gray-900/30 border border-gray-900 p-3 rounded-xl space-y-1.5">
                                        <p className="font-bold text-white text-[10px] uppercase">목표 문장 vs 실제 조음 낭독</p>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[9px] bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/20">목표</span>
                                          <span className="font-medium text-white">{session.targetPhrase}</span>
                                        </div>
                                        {session.transcript && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">인식</span>
                                            <span className="font-semibold text-gray-200">{session.transcript}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Feedback Block */}
                                    {session.feedback && (
                                      <div className="space-y-3.5 border-t border-gray-900 pt-4">
                                        {/* Assessment */}
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-teal-400 block flex items-center gap-1">
                                            <Brain className="w-3.5 h-3.5" /> Gemini AI 전문 언어치료 진단
                                          </span>
                                          <p className="bg-gray-900/50 p-3.5 rounded-xl border border-gray-900 text-gray-300 leading-relaxed text-xs">
                                            {session.feedback.assessment}
                                          </p>
                                        </div>

                                        {/* Phonetic & Score Detail */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div className="bg-gray-900/30 p-3.5 rounded-xl border border-gray-900/80 space-y-1">
                                            <span className="font-semibold text-white text-[10px] flex items-center gap-1 text-cyan-400">
                                              <Activity className="w-3 h-3" /> 조음 동작 분석
                                            </span>
                                            <p className="text-gray-400 text-[11px] leading-relaxed pt-1">
                                              {session.feedback.phoneticFeedback}
                                            </p>
                                          </div>
                                          <div className="bg-gray-900/30 p-3.5 rounded-xl border border-gray-900/80 space-y-1">
                                            <span className="font-semibold text-white text-[10px] flex items-center gap-1 text-amber-400">
                                              <Trophy className="w-3 h-3" /> 호흡 성량 가동성 분석
                                            </span>
                                            <p className="text-gray-400 text-[11px] leading-relaxed pt-1">
                                              {session.feedback.scoreExplanation}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Recommendations */}
                                        {session.feedback.recommendedExercises && session.feedback.recommendedExercises.length > 0 && (
                                          <div className="bg-teal-950/10 border border-teal-500/10 p-3.5 rounded-xl space-y-1.5">
                                            <span className="text-[10px] font-bold text-teal-400 block">💡 추천 맞춤 후속 자가 운동</span>
                                            <ul className="list-disc list-inside space-y-1 text-gray-300 text-[11px]">
                                              {session.feedback.recommendedExercises.map((rec: string, rIdx: number) => (
                                                <li key={rIdx}>{rec}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {stats.history.map((item, idx) => (
                        <div key={idx} className="bg-gray-950 p-3 rounded-2xl border border-gray-800/80 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-white">{item.exerciseName}</p>
                            <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{item.timestamp}</span>
                          </div>
                          <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono">
                            +{item.points} XP
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-3xl mx-auto space-y-6 text-sm text-gray-300 leading-relaxed"
            >
              <h3 className="text-xl font-bold text-white">마비성 구어장애 언어 재활 치료 프로그램 안내</h3>

              <p>
                <strong>렉시톤 마비성 구어장애 AI 트레이너(LexiTone Dysarthria Trainer)</strong>는 뇌졸중, 외상성 뇌손상, 또는 신경계통 질환 이후 발음 마비, 구어 실행증, 안면 근력 저하 및 대칭성 비대칭 문제를 겪고 계신 환자분들을 위한 첨단 바이오 피드백 자가 훈련 시스템입니다.
              </p>

              <div className="space-y-4 pt-4 border-t border-gray-800">
                <h4 className="font-semibold text-teal-400 text-base">훈련별 작용 원리 및 과학적 기반 요법:</h4>
                <ul className="space-y-3">
                  <li className="flex gap-2">
                    <span className="text-teal-400 font-bold shrink-0">1.</span>
                    <div>
                      <strong>구강 안면 운동 및 근기능 개선</strong>: 안면 정밀 인식 장치(MediaPipe FaceMesh)를 통하여 입술 옆으로 당기기(미소), 오므리기, 턱 벌리기 등을 정밀 추적하고 안면 좌우 균형도를 실시간 센싱하여 대칭적 근력 회복을 도모합니다.
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-400 font-bold shrink-0">2.</span>
                    <div>
                      <strong>호흡 지지 및 성대 진동 안정화</strong>: 브라우저 실시간 웹 오디오 엔진을 이용해 지속적인 모음 발성 소리의 크기(Loudness)와 안정 유효 시간(Sustain)을 측정하여 성대 접촉 강도와 조절 능력을 훈련합니다.
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-400 font-bold shrink-0">3.</span>
                    <div>
                      <strong>음소 정밀 조음 및 혀 근육 훈련</strong>: 실시간 음성 수집 및 AI 처리를 적용하여 특히 둔감해지기 쉬운 자음 및 조음점 훈련 문장을 따라 하고 발음의 일치도를 비교 분석합니다.
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-400 font-bold shrink-0">4.</span>
                    <div>
                      <strong>Gemini 임상 지능 비서</strong>: 마치 병원의 언어재활사와 일대일로 훈련을 진행하듯, 수집된 안면 비율 및 목소리 유지 능력 지표를 분석하여 격려 멘트와 더불어 다음 훈련 권장 사항을 맞춤형으로 제공합니다.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 text-xs text-gray-500 leading-normal">
                💡 <em>주의사항 및 안내: 본 소프트웨어는 집에서도 일상의 언어 연습과 자가 재활을 지속적으로 흥미 있게 도울 수 있도록 설계된 교육 목적의 스마트 도구이며, 전문 병원의 신경과 정식 치료, 전문 임상 언어 재활사와의 대면 전문 치료를 전적으로 대체할 수는 없습니다.</em>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Welcome & Authentication Overlay Screen */}
      <AnimatePresence>
        {!currentUser && !dismissedWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-gray-900 border border-gray-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl shadow-teal-500/5"
            >
              <div className="flex justify-center">
                <div className="bg-teal-500/10 p-4 rounded-2xl border border-teal-500/20 text-teal-400">
                  <Activity className="w-12 h-12 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  렉시톤 구어 재활 AI
                </h2>
                <p className="text-sm text-gray-400">
                  LexiTone Dysarthria AI Trainer
                </p>
              </div>

              <div className="text-xs text-gray-400 leading-relaxed bg-gray-950/50 p-4 rounded-2xl border border-gray-800/80 text-left space-y-2.5">
                <p className="font-semibold text-teal-400 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5" /> 스마트 클라우드 동기화 혜택
                </p>
                <p>
                  Google 계정으로 간편하게 로그인하시면 아래의 프리미엄 기능을 안전하게 이용하실 수 있습니다:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-gray-300">
                  <li>안면 기준 정밀 캘리브레이션 값 클라우드 보관</li>
                  <li>모든 재활 운동 세션의 누적 통계 및 데이터 저장</li>
                  <li>Gemini AI 기반 전문 언어치료 맞춤 진단 피드백 백업</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => signInWithGoogle()}
                  className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-gray-950 py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-teal-500/10 transition-all duration-200 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Google 계정으로 시작하기
                </button>

                <button
                  onClick={() => setDismissedWelcome(true)}
                  className="bg-transparent hover:bg-gray-800/50 text-gray-400 hover:text-white py-3 rounded-2xl text-xs font-semibold transition-all duration-200 border border-transparent hover:border-gray-800 cursor-pointer"
                >
                  로그인 없이 게스트로 계속하기 (체험 모드)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
