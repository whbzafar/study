/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ExamPilot Pakistan Backend',
    timestamp: new Date().toISOString(),
  });
});

// Endpoint: AI PDF / Text Extraction & Question Parsing
app.post('/api/gemini/extract-pdf', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, sampleText, examMetadata, documentType, conversionMode } = req.body;

    if (!pdfBase64 && !sampleText) {
      return res.status(400).json({ error: 'Either pdfBase64 or sampleText is required' });
    }

    const isGenerationMode = conversionMode === 'generate_from_content';

    const systemInstruction = isGenerationMode
      ? `You are an expert civil service examination item writer and educational assessment specialist for Pakistan competitive tests (CSS, PMS, PPSC, FPSC).
Your task is to analyze the provided study material, textbook chapter, or notes, and automatically generate high-yield multiple-choice questions (MCQs) testing understanding of key facts, concepts, dates, and definitions.
- Produce questions in standard Pakistani competitive testing format.
- Support both English and Urdu (Nastaliq script) or bilingual questions as appropriate for the content.
- For each question provide:
  - questionNumber (integer)
  - questionText (clear, unambiguous question stem)
  - originalQuestionText (source concept or sentence from the text)
  - language ('English' or 'Urdu' or 'Bilingual')
  - options: 4 distinct options with label 'A', 'B', 'C', 'D' and realistic distractors.
  - correctOptionLabel: the authoritative correct answer ('A', 'B', 'C', or 'D').
  - sourcePage: page number (default 1)
  - extractionConfidence: 0.95
  - hasMissingOptions: false
  - subject: 'Pakistan Affairs' | 'Islamic Studies' | 'General Knowledge' | 'Everyday Science' | 'Current Affairs' | 'English' | 'Urdu' | 'Mathematics & Reasoning' | 'Computer Science'
  - detectedExplanation: clear explanation of why this answer is correct based on the provided text.
- Maintain academic rigor and high pedagogical quality.`
      : `You are an expert competitive exam document and OCR parser specializing in Pakistani recruitment papers (PPSC, FPSC, SPSC, KPPSC, BPSC, NTS).
Your task is to parse past examination papers and extract every multiple-choice question.
- Accurately process both digital text and scanned image-based OCR pages.
- Support both English and Urdu (Nastaliq script) and bilingual questions.
- For each question identify:
  - questionNumber (integer)
  - questionText (cleaned full question stem)
  - originalQuestionText (verbatim raw text from source)
  - language ('English' or 'Urdu' or 'Bilingual')
  - options: array of objects with label ('A', 'B', 'C', 'D' etc) and text. Flag if options are missing or incomplete.
  - correctOptionLabel: only extract if an answer key is clearly present on the paper or provided in a key section; otherwise leave null/undefined. NEVER invent an answer key.
  - sourcePage: page number (default 1)
  - extractionConfidence: float between 0.0 and 1.0 (lower if text was blurry or scanned)
  - hasMissingOptions: boolean (true if question has fewer than 4 options or missing distractors)
  - subject: 'Pakistan Affairs' | 'Islamic Studies' | 'General Knowledge' | 'Everyday Science' | 'Current Affairs' | 'English' | 'Urdu' | 'Mathematics & Reasoning' | 'Computer Science'
  - detectedExplanation: brief explanation or context if supplied on paper.
- Preserve original numbering and source references.`;

    let contentsParts: any[] = [];
    const isScanned = documentType === 'scanned';

    if (pdfBase64 && pdfBase64.startsWith('data:application/pdf;base64,') && pdfBase64.length > 500) {
      contentsParts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64.replace(/^data:application\/pdf;base64,/, ''),
        },
      });
      contentsParts.push({
        text: `Extract and structure all past paper questions from this ${isScanned ? 'scanned OCR' : 'digital'} PDF for ${examMetadata?.examiningBody || 'PPSC'} - ${examMetadata?.examName || 'Competitive Exam'} (${examMetadata?.year || '2026'}). Also provide a rawTextPreview of the first 200 words.`,
      });
    } else {
      const textToParse = sampleText || `
PUNJAB PUBLIC SERVICE COMMISSION (PPSC)
TEHSILDAR / NAIB TEHSILDAR COMPETITIVE EXAMINATION

Q1. The Indus Basin Treaty 1960 allocated the waters of which three eastern rivers exclusively to India?
(A) Indus, Jhelum, Chenab
(B) Ravi, Beas, Sutlej
(C) Kabul, Swat, Kurram
(D) Chenab, Ravi, Jhelum
[Official Key: B]

Q2. Who was the Viceroy of India during the 1905 Partition of Bengal?
(A) Lord Curzon
(B) Lord Mountbatten
(C) Lord Minto
(D) Lord Wavell
[Official Key: A]

Q3. اردو کی پہلی نثری داستان "سب رس" کے مصنف کا نام کیا ہے؟
(A) ملا وجہی
(B) میر امن دہلوی
(C) رجب علی بیگ سرور
(D) مرزا غالب
[Official Key: A]

Q4. What is the escape velocity of an object from Earth's gravitational field?
(A) 9.8 km/s
(B) 11.2 km/s
(C) 15.6 km/s
(D) 7.9 km/s
[Official Key: B]

Q5. Question digitized from low-contrast scanned page with unverified answer key:
(A) Statutory provision
(B) Executive order
(C) Departmental circular
      `;

      contentsParts.push({
        text: `Extract and structure all past paper MCQs from the following ${isScanned ? 'scanned OCR' : 'digital'} test text:\n\n${textToParse}`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: contentsParts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedExamTitle: { type: Type.STRING },
            totalPages: { type: Type.INTEGER },
            rawTextPreview: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.INTEGER },
                  questionText: { type: Type.STRING },
                  originalQuestionText: { type: Type.STRING },
                  language: { type: Type.STRING, enum: ['English', 'Urdu', 'Bilingual'] },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E'] },
                        text: { type: Type.STRING },
                      },
                      required: ['label', 'text'],
                    },
                  },
                  correctOptionLabel: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E'] },
                  sourcePage: { type: Type.INTEGER },
                  extractionConfidence: { type: Type.NUMBER },
                  hasMissingOptions: { type: Type.BOOLEAN },
                  subject: { type: Type.STRING },
                  detectedExplanation: { type: Type.STRING },
                },
                required: ['questionNumber', 'questionText', 'language', 'options', 'extractionConfidence', 'subject'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');
    return res.json(parsedJson);
  } catch (error: any) {
    console.error('Error in /api/gemini/extract-pdf:', error);
    return res.status(500).json({
      error: 'Failed to process document with Gemini AI',
      details: error.message,
    });
  }
});

// Endpoint: AI Question Explanation
app.post('/api/gemini/explain-question', async (req: Request, res: Response) => {
  try {
    const { questionText, options, correctOptionLabel, subject, language } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: 'questionText is required' });
    }

    const prompt = `As a Pakistani civil service exam instructor (PPSC/FPSC/PMS/CSS), provide an authoritative, pedagogical explanation for why the selected answer is correct.
Question: ${questionText}
Options: ${JSON.stringify(options)}
Correct Option: ${correctOptionLabel || 'Not specified'}
Subject: ${subject || 'General Knowledge'}
Language: ${language || 'English'}

Include:
1. Direct explanation of the correct fact/reasoning.
2. Context (e.g. historical treaty, constitutional article, scientific law, or grammatical rule).
3. Why other options are incorrect or common distractor traps.
Keep it concise, clear, and focused under 150 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({
      explanation: response.text,
      isAiGenerated: true,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/explain-question:', error);
    return res.status(500).json({
      error: 'Failed to generate explanation',
      details: error.message,
    });
  }
});

// Mount Vite middleware in development or serve static build in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ExamPilot Pakistan Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
