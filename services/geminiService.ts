/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { AiFeedbackResponse } from "../types";

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
  console.error("API_KEY is missing from environment variables.");
}

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Analyzes speech performance and physical mouth tracking metrics
 * to provide clinical-quality feedback and custom corrective exercises.
 */
export const analyzeSpeechPerformance = async (
  targetPhrase: string,
  userTranscript: string,
  mouthMetrics: {
    maxSmileWidth: number;
    maxPuckerRatio: number;
    maxMouthOpen: number;
    leftRightAsymmetry: number;
  },
  voiceMetrics: {
    averageLoudness: number;
    volumeStability: number;
    vowelSustainDuration: number;
  },
  languageMode: 'en' | 'ko_std' | 'ko_phon' | 'ko_dialect' = 'ko_std'
): Promise<AiFeedbackResponse> => {
  const isEnglish = languageMode === 'en';

  const defaultFallback = (errorMsg: string): AiFeedbackResponse => ({
    assessment: isEnglish
      ? `Completed your speech exercise! (Note: AI detailed analysis is currently on standby. ${errorMsg})`
      : `구어 연습을 완료했습니다! (참고: AI 상세 분석이 대기 상태입니다. ${errorMsg})`,
    phoneticFeedback: isEnglish
      ? `Target phrase/word was "${targetPhrase}". You uttered: "${userTranscript || '(unclear / silent)'}".`
      : `목표 문장/단어는 "${targetPhrase}"였습니다. 발음하신 문장: "${userTranscript || '(인식 불가 / 무음)'}".`,
    scoreExplanation: isEnglish
      ? "Loudness and voice stability metrics indicate active participation and muscular coordination."
      : "성량과 구강 움직임 수치는 활발한 근육 조절 참여를 보여줍니다.",
    recommendedExercises: isEnglish
      ? [
          "Smile Hold (Activates lateral facial muscles and nerves)",
          "Vowel Resonation Hold (Practice 'Ah' and 'Oo' sounds to improve lung capacity)"
        ]
      : [
          "양옆 입꼬리 당기기 유지 (안면 근육 및 신경 활성화)",
          "모음 공명 연습 ('아' 및 '우' 발음 연습)"
        ],
    customDrills: isEnglish
      ? [
          "Please pass the polished plates.",
          "Many monkeys mimic movement."
        ]
      : [
          "추천 맞춤 문장: '예쁜 나비가 나라로 날아갑니다.'",
          "추천 맞춤 문장: '푸른 바다 위에 보트가 있습니다.'"
        ]
  });

  if (!ai) {
    return defaultFallback(isEnglish ? "API Key is missing from your environment." : "API 키가 환경 변수에 설정되어 있지 않습니다.");
  }

  const systemRole = isEnglish
    ? "You are an expert Speech-Language Pathologist (SLP) specializing in motor speech disorders, specifically Dysarthria rehabilitation in English."
    : `You are an expert Speech-Language Pathologist (SLP) specializing in motor speech disorders, specifically Dysarthria rehabilitation in Korean (${
        languageMode === 'ko_dialect' ? 'with particular focus on regional Gyeongsang dialect speech and intonation patterns' : 'with standard Seoul dialect'
      }).`;

  const instructions = isEnglish
    ? `
    1. Conduct a brief, professional, and compassionate assessment of the speech and mouth movement performance in English.
    2. Provide specialized "phonetic feedback" explaining how the user's speech articulators (lips, tongue, jaw, vocal cords) may have operated. Analyze phonetic differences between target and user transcript specifically for English phonology, explicitly covering (a) Mouth and articulator control, (b) Voicing tone and pitch stability, and (c) Speaking rhythm and syllabic pacing.
    3. Explain their score and metrics in an easy-to-understand, supportive manner in English.
    4. Recommend 2 existing exercises that will help them build strength where their metrics show weakness in English.
    5. Generate 2 new custom drill sentences/phrases tailored exactly to their needs in English.
    `
    : `
    1. Conduct a brief, professional, and compassionate assessment of the speech and mouth movement performance in Korean.
    2. Provide specialized "phonetic feedback" in Korean explaining how the user's speech articulators (lips, tongue, jaw, vocal cords) may have operated. Analyze phonetic differences between target and user transcript specifically for Korean phonology, explicitly covering (a) 구강 입술 제어 및 혀의 위치 (Mouth/lips/tongue control), (b) 발성 성대 톤 및 공명 (Voicing tone/pitch stability), and (c) 발화 리듬과 억양 템포 (Speaking rhythm/intonation pacing).
    3. Explain their score and metrics in an easy-to-understand, supportive manner in Korean.
    4. Recommend 2 existing exercises that will help them build strength where their metrics show weakness in Korean.
    5. Generate 2 new custom drill sentences/phrases tailored exactly to their needs in Korean.
    `;

  const prompt = `
    ${systemRole}
    You will analyze a user's practice session metrics and provide motivating, clinical-grade coaching feedback, phonetic analysis, and custom-tailored drills.
    ALL returned texts MUST be in the correct language (${isEnglish ? 'English' : 'Korean'}).

    ### PRACTICE SESSION DATA:
    - Target Phrase/Word: "${targetPhrase}"
    - Speech Recognition Transcript: "${userTranscript || "(No transcription captured - silence or slurred speech)"}"
    
    ### ORAL-MOTOR (MOUTH TRACKING) METRICS:
    - Maximum Smile Width (horizontal stretch ratio): ${mouthMetrics.maxSmileWidth.toFixed(2)} (Values above 1.15 represent good horizontal labial stretch)
    - Maximum Lip Pucker Ratio (vertical/horizontal lip ratio): ${mouthMetrics.maxPuckerRatio.toFixed(2)} (High values represent tight puckering/lip rounding)
    - Maximum Mouth Opening (jaw lowering vertical ratio): ${mouthMetrics.maxMouthOpen.toFixed(2)} (Values above 0.35 represent healthy jaw excursion)
    - Lip Left-to-Right Symmetry Deviation: ${(mouthMetrics.leftRightAsymmetry * 100).toFixed(1)}% (Values under 8% represent good bilateral balance; higher values suggest unilateral weakness)

    ### VOICE / BREATHING SUPPORT METRICS:
    - Average Vocal Loudness: ${voiceMetrics.averageLoudness.toFixed(1)} dB relative (Values above 40 represent strong voice projection)
    - Volume Stability: ${voiceMetrics.volumeStability.toFixed(1)}% (Higher means steady breath support; lower means shaky breath)
    - Sustained Vowel Duration: ${voiceMetrics.vowelSustainDuration.toFixed(1)} seconds (Target is 5+ seconds for proper respiration)

    ### INSTRUCTIONS:
    ${instructions}

    Return ONLY a JSON response matching this schema:
    {
      "assessment": "${isEnglish ? 'Detailed encouraging SLP assessment...' : '상세하고 격려가 되는 언어치료사의 한국어 평가...'}",
      "phoneticFeedback": "${isEnglish ? 'A helpful analysis of phonetic placement...' : '조음 기관(입술, 혀, 턱 등)의 움직임 및 실제 발음 요령...'}",
      "scoreExplanation": "${isEnglish ? 'Explanation of physical and voice progress...' : '대칭성, 성량 및 지속 시간 진행 상황에 대한 친절한 설명...'}",
      "recommendedExercises": [
        "${isEnglish ? 'Exercise Name 1 (reason)' : '추천 운동 명칭 1 (이유)'}",
        "${isEnglish ? 'Exercise Name 2 (reason)' : '추천 운동 명칭 2 (이유)'}"
      ],
      "customDrills": [
        "${isEnglish ? 'Tailored phrase 1' : '맞춤형 연습 문장 1'}",
        "${isEnglish ? 'Tailored phrase 2' : '맞춤형 연습 문장 2'}"
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assessment: { type: Type.STRING },
            phoneticFeedback: { type: Type.STRING },
            scoreExplanation: { type: Type.STRING },
            recommendedExercises: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            customDrills: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["assessment", "phoneticFeedback", "scoreExplanation", "recommendedExercises", "customDrills"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response received from Gemini.");
    }

    return JSON.parse(jsonText) as AiFeedbackResponse;
  } catch (error) {
    console.error("Error analyzing speech performance with Gemini:", error);
    return defaultFallback(`(Analysis connection error: ${error instanceof Error ? error.message : String(error)})`);
  }
};
