import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Helper to prevent requests from hanging if Gemini API experiences transient spikes
function callWithTimeout<T>(promise: Promise<T>, timeoutMs = 6000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Gemini API request timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper: Rule-based fallback classification
function ruleBasedCategorize(description: string) {
  const lower = description.toLowerCase();
  let category = 'Other Infrastructure';
  let urgency = 'medium';

  if (
    lower.includes('road') ||
    lower.includes('pothole') ||
    lower.includes('asphalt') ||
    lower.includes('crack') ||
    lower.includes('tarmac') ||
    lower.includes('highway')
  ) {
    category = 'Roads and Potholes';
    urgency = lower.includes('deep') || lower.includes('danger') ? 'high' : 'medium';
  } else if (
    lower.includes('light') ||
    lower.includes('lamp') ||
    lower.includes('dark') ||
    lower.includes('wire') ||
    lower.includes('pole') ||
    lower.includes('bulb')
  ) {
    category = 'Streetlights';
  } else if (
    lower.includes('waste') ||
    lower.includes('garbage') ||
    lower.includes('trash') ||
    lower.includes('bin') ||
    lower.includes('litter') ||
    lower.includes('dump')
  ) {
    category = 'Waste Management';
  } else if (
    lower.includes('pavement') ||
    lower.includes('sidewalk') ||
    lower.includes('curb') ||
    lower.includes('walkway') ||
    lower.includes('tile') ||
    lower.includes('paver')
  ) {
    category = 'Pavements';
  } else if (
    lower.includes('park') ||
    lower.includes('bench') ||
    lower.includes('sign') ||
    lower.includes('bathroom') ||
    lower.includes('facility') ||
    lower.includes('playground') ||
    lower.includes('shade')
  ) {
    category = 'Public Facilities';
  }

  let suggestedTitle = `${category} Issue in RAK`;
  if (category === 'Roads and Potholes') {
    suggestedTitle = 'Damaged Road Surface & Pothole Hazard';
  } else if (category === 'Streetlights') {
    suggestedTitle = 'Faulty Streetlight Fixture / Dark Area';
  } else if (category === 'Waste Management') {
    suggestedTitle = 'Overflowing Waste Bins & Debris';
  } else if (category === 'Pavements') {
    suggestedTitle = 'Broken Walkway Pavers / Curb Hazard';
  } else if (category === 'Public Facilities') {
    suggestedTitle = 'Damaged Public Amenity / Park Facility';
  }

  return {
    category,
    suggestedTitle,
    shortSummary: description.slice(0, 150),
    urgency,
    reasoning: `Classified under ${category} based on civic infrastructure heuristics.`,
  };
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!ai,
    environment: isProduction ? 'production' : 'development',
  });
});

// AI 1: Intelligent Issue Categorization & Title Generation
app.post('/api/ai/categorize', async (req: Request, res: Response) => {
  const { description } = req.body;
  if (!description || typeof description !== 'string' || description.trim().length < 5) {
    return res.status(400).json({ error: 'Description must be at least 5 characters long.' });
  }

  if (!ai) {
    return res.json(ruleBasedCategorize(description));
  }

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are an AI civic assistant for FixMyRAK in Ras Al Khaimah, UAE.
Analyze the citizen's report description and classify it into one of these exact categories:
- Roads and Potholes
- Streetlights
- Waste Management
- Pavements
- Public Facilities
- Other Infrastructure

Citizen Description:
"${description.trim()}"

Provide the output strictly in the requested JSON format.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'The selected category from the allowed list',
              },
              suggestedTitle: {
                type: Type.STRING,
                description: 'A concise, professional title (3 to 8 words) for the report',
              },
              shortSummary: {
                type: Type.STRING,
                description: 'A clear 1-2 sentence neutral summary of the issue',
              },
              urgency: {
                type: Type.STRING,
                description: 'Estimated urgency: low, medium, high, or critical',
              },
              reasoning: {
                type: Type.STRING,
                description: 'Brief explanation of why this category was assigned',
              },
            },
            required: ['category', 'suggestedTitle', 'shortSummary', 'urgency', 'reasoning'],
          },
        },
      }),
      6000
    );

    const parsed = JSON.parse(response.text || '{}');
    const validCategories = [
      'Roads and Potholes',
      'Streetlights',
      'Waste Management',
      'Pavements',
      'Public Facilities',
      'Other Infrastructure',
    ];
    if (!validCategories.includes(parsed.category)) {
      parsed.category = 'Other Infrastructure';
    }

    return res.json(parsed);
  } catch (error) {
    console.warn('Gemini categorize notice (using resilient fallback):', error instanceof Error ? error.message : error);
    // Graceful fallback prevents UX disruption during temporary model high-demand (503)
    return res.json(ruleBasedCategorize(description));
  }
});

// AI 2: Report Description Improvement
app.post('/api/ai/enhance', async (req: Request, res: Response) => {
  const { description, location } = req.body;
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'Description is required' });
  }

  const defaultKeyPoints = [
    'Location: ' + (location || 'Ras Al Khaimah, UAE'),
    'Reported Condition: ' + description.slice(0, 100),
  ];

  if (!ai) {
    return res.json({
      enhancedDescription: description.trim(),
      keyPoints: defaultKeyPoints,
    });
  }

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are a civic communication specialist for FixMyRAK.
Improve this citizen's public infrastructure report for clarity, precision, and readability.
RULES:
1. Preserve 100% of the original meaning and facts.
2. DO NOT hallucinate, assume, or invent details not mentioned by the user.
3. Fix grammar, spelling, and sentence structure.
4. Keep the tone constructive, objective, and clear.
${location ? `Reference location context: ${location}` : ''}

Original Description:
"${description.trim()}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              enhancedDescription: {
                type: Type.STRING,
                description: 'Clear, well-structured, factual description',
              },
              keyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 to 4 bullet points highlighting the core facts',
              },
            },
            required: ['enhancedDescription', 'keyPoints'],
          },
        },
      }),
      6000
    );

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error) {
    console.warn('Gemini enhance notice (using factual fallback):', error instanceof Error ? error.message : error);
    return res.json({
      enhancedDescription: description.trim(),
      keyPoints: defaultKeyPoints,
    });
  }
});

// AI 3: Duplicate Report Assistance
app.post('/api/ai/check-duplicates', async (req: Request, res: Response) => {
  const { title, description, category, location, existingReports } = req.body;
  if (!existingReports || !Array.isArray(existingReports) || existingReports.length === 0) {
    return res.json({ potentialDuplicates: [] });
  }

  // Filter candidates by category or location
  const candidates = existingReports
    .filter((r) => r.category === category || (location && r.location && r.location.toLowerCase().includes(location.toLowerCase())))
    .slice(0, 8);

  if (candidates.length === 0) {
    return res.json({ potentialDuplicates: [] });
  }

  const fallbackDuplicates = candidates
    .filter((c) => {
      const words = (title || '').toLowerCase().split(' ').filter((w: string) => w.length > 3);
      return words.some((w: string) => (c.title || '').toLowerCase().includes(w));
    })
    .map((c) => ({
      reportId: c.id,
      similarityScore: 0.65,
      matchReason: `Similar defect reported in ${c.location || 'Ras Al Khaimah'} under ${c.category}.`,
    }));

  if (!ai) {
    return res.json({ potentialDuplicates: fallbackDuplicates });
  }

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are an AI duplicate detector for municipal community infrastructure reports in Ras Al Khaimah.
Compare this new report proposal against the existing candidates:

New Report:
- Title: ${title}
- Category: ${category}
- Location: ${location}
- Description: ${description}

Existing Candidate Reports:
${JSON.stringify(candidates, null, 2)}

Identify any existing reports that describe the exact same physical issue or location defect.
Return an array of potential duplicates with a similarity score (0.0 to 1.0) and a brief reason.
Only include items with similarityScore >= 0.5. If none match, return an empty array.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              potentialDuplicates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    reportId: { type: Type.STRING },
                    similarityScore: { type: Type.NUMBER },
                    matchReason: { type: Type.STRING },
                  },
                  required: ['reportId', 'similarityScore', 'matchReason'],
                },
              },
            },
            required: ['potentialDuplicates'],
          },
        },
      }),
      6000
    );

    const parsed = JSON.parse(response.text || '{"potentialDuplicates":[]}');
    return res.json(parsed);
  } catch (error) {
    console.warn('Gemini duplicate check notice (using heuristic fallback):', error instanceof Error ? error.message : error);
    return res.json({ potentialDuplicates: fallbackDuplicates });
  }
});

// AI 4: Admin Report Summarization & Triage
app.post('/api/ai/summarize', async (req: Request, res: Response) => {
  const { title, description, category, location, status, createdAt } = req.body;
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'Description is required' });
  }

  const fallbackSummary = {
    executiveSummary: `Report "${title}" regarding ${category} at ${location}.`,
    mainIssue: description.slice(0, 150),
    locationContext: location || 'Ras Al Khaimah',
    urgencyLevel: 'Normal',
    suggestedAction: 'Dispatch community inspection team to assess road or facility condition.',
  };

  if (!ai) {
    return res.json(fallbackSummary);
  }

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are an administrative triage AI for the FixMyRAK platform.
Generate a concise, professional executive briefing for a municipal coordinator review:

Report Title: ${title}
Category: ${category}
Location: ${location}
Status: ${status}
Submitted: ${createdAt}
Description:
"${description}"

Note: AI must never declare that an issue is resolved or make binding municipal decisions. Provide factual analysis for administrators.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING, description: '1-2 sentence high-level summary' },
              mainIssue: { type: Type.STRING, description: 'Specific physical defect or safety risk' },
              locationContext: { type: Type.STRING, description: 'Location analysis in Ras Al Khaimah' },
              urgencyLevel: { type: Type.STRING, description: 'Low, Medium, High, or Urgent Safety Risk' },
              suggestedAction: { type: Type.STRING, description: 'Recommended next inspection or routing step' },
            },
            required: ['executiveSummary', 'mainIssue', 'locationContext', 'urgencyLevel', 'suggestedAction'],
          },
        },
      }),
      6000
    );

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error) {
    console.warn('Gemini summarize notice (using fallback summary):', error instanceof Error ? error.message : error);
    return res.json(fallbackSummary);
  }
});

// Setup Vite middleware in development or serve static in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FixMyRAK server running on http://0.0.0.0:${PORT} [${isProduction ? 'prod' : 'dev'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
