import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { getMarketHubForLocation, getAllMarketHubs } from "../shared/marketData";
import { initializeDatabase, registerUser, loginUser, verifyToken, getUserById, updateUserProfile, requestPasswordReset, resetPasswordWithCode, getDatabase } from "./auth.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const DEFAULT_GEMINI_CHAT_MODEL = "gemini-3.6-flash";
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash";

const GEMINI_CHAT_MODEL = (process.env.GEMINI_MODEL || process.env.GEMINI_CHAT_MODEL || DEFAULT_GEMINI_CHAT_MODEL).replace(/^models\//, "");
const OPENROUTER_MODEL = (process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL).replace(/^models\//, "");

function resolveLocationContext(location?: string) {
  const value = (location || '').trim();
  if (!value || value === 'Harare, Zimbabwe' || value === 'Unknown' || value === 'General African farm context') {
    return 'general African farm context';
  }
  return value;
}

let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

function detectCropMention(text: string): string {
  const lower = text.toLowerCase();
  const crops = [
    'maize', 'corn', 'cassava', 'tomato', 'potato', 'banana', 'cabbage', 'beans',
    'rice', 'wheat', 'soybean', 'sorghum', 'pepper', 'onion', 'sweet potato',
    'groundnut', 'coffee', 'tea', 'vegetable', 'crop'
  ];

  const found = crops.find(crop => lower.includes(crop));
  return found || 'your crop';
}

function detectNutrientIssue(text: string): { nutrient: string; crop: string; diagnosis: string } | null {
  const lower = text.toLowerCase();
  const crop = detectCropMention(text);

  const patterns = [
    {
      nutrient: 'Nitrogen',
      keys: ['nitrogen deficiency', 'n deficiency', 'lack of nitrogen', 'yellow older leaves', 'yellow lower leaves', 'v shape yellow', 'pale green lower leaves'],
      diagnosis: `Nitrogen deficiency is likely in ${crop}. Older lower leaves turn pale green or yellow first. The plant grows slowly, looks thin, and may form small ears or fruit.`
    },
    {
      nutrient: 'Phosphorus',
      keys: ['phosphorus deficiency', 'purple leaves', 'purple stems', 'poor rooting', 'stunted roots', 'slow growth'],
      diagnosis: `Phosphorus deficiency is likely in ${crop}. Growth is stunted, roots stay weak, and the foliage may turn dark green or purple.`
    },
    {
      nutrient: 'Potassium',
      keys: ['potassium deficiency', 'k deficiency', 'burnt leaf margins', 'leaf edge scorch', 'yellow leaf edges', 'marginal chlorosis'],
      diagnosis: `Potassium deficiency is likely in ${crop}. Leaf edges scorch and turn brown while the plant remains weak and less able to handle stress.`
    },
    {
      nutrient: 'Iron',
      keys: ['iron deficiency', 'interveinal chlorosis', 'yellow young leaves', 'iron chlorosis', 'yellow leaf veins'],
      diagnosis: `Iron deficiency is likely in ${crop}. New leaves turn yellow while veins stay greener, which slows growth and reduces vigor.`
    },
    {
      nutrient: 'Calcium',
      keys: ['calcium deficiency', 'blossom end rot', 'black bottom tomato', 'fruit tip rot'],
      diagnosis: `Calcium deficiency is likely in ${crop}. The fruit tip or growing point becomes dark and sunken, especially when watering is irregular.`
    }
  ];

  const match = patterns.find(({ keys }) => keys.some(key => lower.includes(key)));
  if (!match) return null;

  return { nutrient: match.nutrient, crop, diagnosis: match.diagnosis };
}

function buildCropSpecificAdvice(text: string): string | null {
  const lower = text.toLowerCase();

  if (lower.includes('maize') || lower.includes('corn')) {
    if (/(yellow|chlorosis|pale green)/.test(lower) && /(lower|older|bottom)/.test(lower)) {
      return `This is most likely a nitrogen deficiency in maize. Older lower leaves yellow first, growth slows, and the plants look thin. For smallholders, apply split top-dressing with urea or composted manure and keep weeds down. For commercial farms, use soil testing, split N applications, and field scouting to prevent leaching.`;
    }
    if (/(purple|reddish|purple leaves)/.test(lower)) {
      return `This pattern fits phosphorus deficiency in maize. Early growth is slow, roots are weak, and lower leaves may show purple/red tones. Correct with basal phosphorus, compost, or rock phosphate and maintain root-zone moisture.`;
    }
    if (/(brown edge|leaf edge|scorch|burnt margin)/.test(lower)) {
      return `This matches potassium deficiency in maize. The leaf margins scorch and stems weaken. Correct with potash or a balanced K source, and avoid removing all crop residue.`;
    }
  }

  if (lower.includes('tomato')) {
    if (/(bottom|blossom|black|fruit tip|sunken)/.test(lower) && /(tomato|fruit)/.test(lower)) {
      return `This is likely blossom-end rot in tomatoes, usually caused by uneven watering and calcium uptake problems. Smallholders should irrigate consistently and mulch; commercial growers should improve drip irrigation and monitor EC and calcium balance.`;
    }
    if (/(yellow|ring|target|concentric)/.test(lower) && /(leaf|spot)/.test(lower)) {
      return `This fits early blight on tomato. Remove affected leaves, avoid wet foliage, and use a registered fungicide or copper spray. Large farms should rotate crops and use resistant varieties.`;
    }
  }

  if (lower.includes('potato') || lower.includes('irish potato')) {
    if (/(brown|black|greasy|water soaked)/.test(lower) && /(leaf|stem|tuber)/.test(lower)) {
      return `Late blight is a strong possibility in potato. Remove infected foliage quickly, improve air flow, and use a registered fungicide. Smallholders should avoid overhead irrigation, while commercial farms should use field scouting and resistant varieties.`;
    }
  }

  if (lower.includes('cassava')) {
    if (/(mosaic|yellow and green|yellow patches|leaf distortion)/.test(lower)) {
      return `Cassava mosaic disease is likely. Use clean planting material, remove infected plants, and plant resistant varieties. Smallholders benefit from clean stems and roguing; commercial farms should enforce seed certification and systematic field inspection.`;
    }
  }

  if (lower.includes('maize') || lower.includes('corn')) {
    if (/(streak|yellow streak|parallel streak|vein)/.test(lower)) {
      return `Maize streak virus is likely. It is spread by leafhoppers, so remove infected plants early and use resistant seed. Commercial farms should monitor vector pressure and use integrated pest management.`;
    }
  }

  return null;
}

function buildDiseaseSpecificAdvice(text: string): string | null {
  const lower = text.toLowerCase();

  if (/(powdery mildew|white powder|mildew)/.test(lower)) {
    return `Powdery mildew is likely. It spreads rapidly in humid, dense canopies. Smallholders should increase spacing and use neem or sulfur sprays; larger farms should use registered fungicides and monitor spray timing closely.`;
  }

  if (/(late blight|early blight|target spot|leaf spot|blight)/.test(lower)) {
    return `Blight is likely. Focus on removing infected leaves, reducing leaf wetness, and improving spacing. For local farmers, copper sprays and sanitation matter; for commercial farms, fungicide programs and resistant varieties are key.`;
  }

  if (/(wilt|wilting|bacterial wilt)/.test(lower)) {
    return `Wilt is likely, and it can be caused by bacterial, fungal, or water stress. Check if the plant stays green while wilting; that often points to bacterial wilt. Remove and destroy infected plants, avoid moving soil, and improve drainage. Commercial farms should isolate affected blocks and diagnose with field checks.`;
  }

  if (/(mosaic|virus)/.test(lower)) {
    return `This pattern points to a viral disease. Remove infected plants early, avoid spreading through tools, and use clean planting material. Commercial farms should use certified seed and regular field scouting.`;
  }

  return null;
}

function buildConversationalFallbackReply(userText: string, location: string, language: string) {
  const text = userText.trim();
  const normalized = text.toLowerCase();
  const locationContext = resolveLocationContext(location);
  const locationNote = locationContext === 'general African farm context' ? '' : ` in ${locationContext}`;

  if (!normalized || ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"].some(v => normalized === v || normalized.startsWith(v))) {
    return `Hello! I’m AgriSmart AI, your farm advisor. I can help with crop health, fertilizer planning, pest control, irrigation, soil management, planting dates, and market decisions${locationNote}. Ask me anything and I’ll give you practical guidance.`;
  }

  const cropGuess = detectCropMention(text);
  const nutrientIssue = detectNutrientIssue(text);
  const cropSpecificAdvice = buildCropSpecificAdvice(text);
  const diseaseSpecificAdvice = buildDiseaseSpecificAdvice(text);

  if (nutrientIssue) {
    return `${nutrientIssue.diagnosis}\n\nFor smallholders, start with compost, manure, green manure, and a split application of the right nutrient source. For larger farms, use soil testing, correct NPK rates, and place fertilizer near the root zone or through fertigation where appropriate.\n\nImmediate next steps: check the oldest leaves first, check soil pH and moisture, and avoid applying too much at once. If you share a clear photo or the crop stage, I can narrow the diagnosis to the exact deficiency and recommend the best field treatment.`;
  }

  if (cropSpecificAdvice) {
    return `${cropSpecificAdvice}\n\nThis is a field-ready guide for both local and commercial farming: smallholders should prioritize affordable, locally available fixes; large farms should add soil testing, scouting, and planned nutrient applications to avoid repeat losses.`;
  }

  if (diseaseSpecificAdvice) {
    return `${diseaseSpecificAdvice}\n\nFor local farmers, prioritize sanitation, pruning, spacing, and affordable local controls. For large farms, use a structured fungicide or disease-management program with field scouting, resistant varieties, and crop rotation.`;
  }

  if (/(powdery mildew|rust|leaf spot|blight|anthracnose|fusarium|bacterial wilt|downy mildew|late blight|early blight|mosaic|wilt|spot)/.test(normalized)) {
    const disease = /(powdery mildew|rust|leaf spot|blight|anthracnose|fusarium|bacterial wilt|downy mildew|late blight|early blight|mosaic|wilt|spot)/i.exec(text)?.[0] || 'crop disease';
    return `${disease.charAt(0).toUpperCase() + disease.slice(1)} is a common field problem in African farming.\n\nWhat to do: remove infected plant parts, avoid overhead watering, improve crop spacing, and use clean seed or resistant varieties. For smallholders, neem, copper sprays, and sanitation help a lot; for commercial farms, use registered fungicides and a field scouting schedule.\n\nIf the problem is spreading quickly, isolate the affected area and inspect the lower leaves first before deciding on treatment.`;
  }

  if (/(nutrient|deficiency|fertility|yellowing|chlorosis|wilting|poor growth)/.test(normalized)) {
    return `This pattern sounds like a crop nutrition or stress issue in ${cropGuess}.\n\nCheck the oldest leaves first, the soil moisture, and recent fertilizer timing. For smallholder farms, compost, manure, and split dressings are practical and affordable; for larger farms, soil testing and targeted NPK applications usually give better results.\n\nIf you tell me the crop, the exact symptom pattern, and whether it affects old or new leaves, I can match the deficiency more precisely and give the right correction.`;
  }

  const topic = text.split(/\s+/).slice(0, 8).join(' ');

  return `Thanks for asking about “${topic}”. I can help with that${locationNote}. For practical field advice, I would check the crop type, crop stage, leaf and root symptoms, recent rainfall, soil moisture, and whether the issue is caused by disease, nutrient stress, or pest damage.\n\nFor smallholder farmers, the focus is usually on affordable corrective actions, compost, and crop rotation; for larger farms, I would recommend soil testing, split applications, and scouting records.\n\nIf you share the crop name, the symptom, and whether it is on young or old leaves, I can give you a more accurate diagnosis and treatment plan.`;
}

let groqClient: { apiKey: string } | null = null;
function getGroq(): { apiKey: string } | null {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  if (!groqClient || groqClient.apiKey !== key) {
    groqClient = { apiKey: key };
  }
  return groqClient;
}

async function callGroq(messages: any[], model: string = "llama-3.1-8b-instant", maxTokens: number = 1200) {
  const groq = getGroq();
  if (!groq) return null;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groq.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callOpenRouterChat(systemPrompt: string, userText: string, messages: any[] = []) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;

  const normalizedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-6).map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: typeof m.content === "string" ? m.content : String(m.content ?? "")
    })),
    { role: "user", content: userText }
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://agrismart-ai.local",
      "X-Title": "AgriSmart AI"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: normalizedMessages,
      temperature: 0.7,
      max_tokens: 1200
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callGroqChat(systemPrompt: string, userText: string, messages: any[] = []) {
  const groq = getGroq();
  if (!groq) return null;

  const normalizedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-6).map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: typeof m.content === "string" ? m.content : String(m.content ?? "")
    })),
    { role: "user", content: userText }
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groq.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: normalizedMessages,
      max_tokens: 1200,
      temperature: 0.7
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callGroqVision(messages: any[], model: string = "openai/gpt-oss-20b", maxTokens: number = 1200) {
  const groq = getGroq();
  if (!groq) return null;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groq.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize database
  initializeDatabase();

  app.use(express.json({ limit: "10mb" }));

  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", prompt } = req.body;
      if (!imageBase64 || !prompt) {
        return res.status(400).json({ error: "Image and analysis prompt are required" });
      }

      const groqKey = process.env.GROQ_API_KEY?.trim();
      const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

      if (!groqKey && !openRouterKey) {
        return res.status(500).json({
          error: "No AI provider key is configured. Add GROQ_API_KEY or OPENROUTER_API_KEY to your .env.local file before uploading an image."
        });
      }

      if (openRouterKey) {
        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "X-OpenRouter-Title": "AgriSmart AI"
          },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [{
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
              ]
            }],
            response_format: { type: "json_object" },
            max_tokens: 1200
          })
        });
        const openRouterPayload = await openRouterResponse.json();
        if (!openRouterResponse.ok) {
          throw new Error(openRouterPayload.error?.message || "OpenRouter image analysis failed");
        }

        const content = openRouterPayload.choices?.[0]?.message?.content;
        if (!content) throw new Error("OpenRouter returned an empty analysis");
        return res.json({ data: JSON.parse(content) });
      }

      if (groqKey) {
        const groqResponse = await callGroqVision([
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` }
              }
            ]
          }
        ], process.env.GROQ_VISION_MODEL || "openai/gpt-oss-20b", 1200);

        if (groqResponse) {
          return res.json({ data: JSON.parse(groqResponse) });
        }

        return res.status(500).json({
          error: "Groq is configured, but the model available on this account does not support image analysis. Add OPENROUTER_API_KEY for image uploads or set GROQ_VISION_MODEL to a supported Groq vision model."
        });
      }

      return res.status(500).json({
        error: "Image analysis is unavailable because no valid AI provider key is configured. Add OPENROUTER_API_KEY to your .env.local file."
      });

      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "AgriSmart AI"
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
            ]
          }],
          response_format: { type: "json_object" },
          max_tokens: 1200
        })
      });
      const openRouterPayload = await openRouterResponse.json();
      if (!openRouterResponse.ok) {
        throw new Error(openRouterPayload.error?.message || "OpenRouter image analysis failed");
      }

      const content = openRouterPayload.choices?.[0]?.message?.content;
      if (!content) throw new Error("OpenRouter returned an empty analysis");
      return res.json({ data: JSON.parse(content) });
    } catch (error: any) {
      console.error("Image analysis error:", error);
      return res.status(500).json({ error: error.message || "Failed to analyze image" });
    }
  });



  // AI Chat endpoint for agricultural advice
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages = [], query, language = "English", location = "Harare, Zimbabwe" } = req.body;
      const userText = query || (messages.length > 0 ? messages[messages.length - 1].content : "");

      if (!userText) {
        return res.status(400).json({ error: "Query or message is required" });
      }

      const ai = getAI();
      let replyText = "";

      const locationContext = resolveLocationContext(location);
      const systemPrompt = `You are AgriSmart AI, an expert Southern African agricultural advisor specializing in crops, pests, plant pathology, soil health, drip irrigation, livestock, and agronomy for smallholder and commercial farmers.
Current Language: ${language}
Farmer Location: ${locationContext}

Instruction: If the user does not provide a specific location, answer using general African farm best-practice advice without requesting location first. Always answer the actual question asked, not only a location-based response.

Formatting Rules:
- Keep advice practical, actionable, and cost-effective.
- Answer the actual question directly even if no location is provided; never force a location before giving useful crop advice.
- If the user asks about disease, deficiency, pest, or crop health:
  1. Name the likely issue, the visible symptoms, and which plant part is affected.
  2. State the most likely cause and the field-level actions to take within the next 24–72 hours.
  3. Give both preventive and corrective measures, including organic and registered chemical options where relevant.
  4. If relevant, tell the farmer how to distinguish nutrient deficiency from disease or pest damage.
- If the user asks about a specific crop, tailor the answer to that crop and its common African growing challenges.
- Reply in ${language}.`;

      if (ai) {
        try {
          const contents = [
            ...messages.slice(-6).map((m: any) => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            })),
            {
              role: 'user',
              parts: [{ text: userText }]
            }
          ];

          const response = await ai.models.generateContent({
            model: GEMINI_CHAT_MODEL,
            contents: contents as any,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7,
            }
          });

          replyText = response.text || "";
        } catch (genError: any) {
          console.error("Gemini Chat generation error:", genError);
          const errorText = String(genError?.message || genError || "");
          if (errorText.includes("429") || errorText.includes("quota") || errorText.includes("RESOURCE_EXHAUSTED") || errorText.includes("gemini-2.5-flash") || errorText.includes("NOT_FOUND") || errorText.includes("404")) {
            console.warn("Falling back to supported AI providers for chat response.");
          }
        }
      }

      if (!replyText) {
        const preferredFallback = await callOpenRouterChat(systemPrompt, userText, messages) || await callGroqChat(systemPrompt, userText, messages);
        replyText = preferredFallback || "";
      }

      // Fallback response if all providers fail or no key is configured.
      if (!replyText) {
        replyText = buildConversationalFallbackReply(userText, location, language);
      }

      return res.json({
        reply: replyText
      });
    } catch (err: any) {
      console.error("Chat endpoint error:", err);
      return res.status(500).json({ error: "Failed to process chat request", details: err.message });
    }
  });

  // Community Forum State & Endpoints
  interface CommunityReply {
    id: string;
    author: string;
    region: string;
    content: string;
    createdAt: number;
  }

  interface CommunityPost {
    id: string;
    author: string;
    region: string;
    category: 'Question' | 'Tip' | 'Market Alert' | 'Pest Alert' | 'Success Story';
    crop?: string;
    title?: string;
    content: string;
    imageUrl?: string;
    likes: number;
    replies: CommunityReply[];
    createdAt: number;
  }

  let communityPosts: CommunityPost[] = [];

  app.get("/api/community", (_req, res) => {
    res.json(communityPosts);
  });

  app.post("/api/community", (req, res) => {
    try {
      const { author, region, category = "Question", crop, title, content, imageUrl } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Post content is required" });
      }

      const newPost: CommunityPost = {
        id: "post-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        author: (author && author.trim()) || "Farmer",
        region: (region && region.trim()) || "Local District",
        category: category || "Question",
        crop: crop || undefined,
        title: title || undefined,
        content: content.trim(),
        imageUrl: imageUrl || undefined,
        likes: 0,
        replies: [],
        createdAt: Date.now()
      };

      communityPosts = [newPost, ...communityPosts];
      return res.status(201).json(newPost);
    } catch (err: any) {
      console.error("Failed to create community post:", err);
      return res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.post("/api/community/:id/like", (req, res) => {
    const post = communityPosts.find(p => p.id === req.params.id);
    if (post) {
      post.likes += 1;
      return res.json({ success: true, likes: post.likes });
    }
    return res.status(404).json({ error: "Post not found" });
  });

  app.post("/api/community/:id/reply", (req, res) => {
    const { author, region, content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Reply content is required" });
    }

    const post = communityPosts.find(p => p.id === req.params.id);
    if (post) {
      const reply: CommunityReply = {
        id: "rep-" + Date.now(),
        author: (author && author.trim()) || "Farmer",
        region: (region && region.trim()) || "Local District",
        content: content.trim(),
        createdAt: Date.now()
      };
      post.replies.push(reply);
      return res.status(201).json(reply);
    }
    return res.status(404).json({ error: "Post not found" });
  });

  // Community chat uses SSE so connected farmers receive messages immediately
  // without adding another realtime dependency to the server.
  type ChatClient = { id: number; res: express.Response };
  const chatClients: ChatClient[] = [];
  const ensureChatMember = (user: any) => {
    getDatabase().prepare(`INSERT OR IGNORE INTO community_chat_members (user_id, joined_at) VALUES (?, ?)`)
      .run(user.id, Date.now());
    return user;
  };
  const getChatUser = (req: express.Request) => {
    const token = (req.body?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.token) as string | undefined;
    if (!token) return null;
    try {
      const decoded = verifyToken(token);
      if (!decoded) return null;
      const user = getUserById(decoded.userId);
      return user ? ensureChatMember(user) : null;
    } catch {
      return null;
    }
  };

  const getPrivateConversationMembers = (conversationId: number) => {
    return getDatabase().prepare(`SELECT user_id FROM community_chat_conversation_members WHERE conversation_id = ?`).all(conversationId).map((row: any) => row.user_id as number);
  };

  const getOrCreatePrivateConversation = (userId: number, otherUserId: number) => {
    const database = getDatabase();
    const existing = database.prepare(`
      SELECT c.id FROM community_chat_conversations c
      JOIN community_chat_conversation_members mine ON mine.conversation_id = c.id AND mine.user_id = ?
      JOIN community_chat_conversation_members other ON other.conversation_id = c.id AND other.user_id = ?
      WHERE c.kind = 'private'
      LIMIT 1
    `).get(userId, otherUserId) as { id: number } | undefined;
    if (existing) return existing.id;
    const result = database.prepare(`INSERT INTO community_chat_conversations (kind, created_at) VALUES ('private', ?)`).run(Date.now());
    const conversationId = Number(result.lastInsertRowid);
    database.prepare(`INSERT INTO community_chat_conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)`).run(conversationId, userId, conversationId, otherUserId);
    return conversationId;
  };

  app.get("/api/community-chat/members", (req, res) => {
    if (!getChatUser(req)) return res.status(401).json({ error: "Authentication required" });
    const members = getDatabase().prepare(`
      SELECT u.id, u.name, u.region, u.profile_image_url AS profileImageUrl, m.joined_at AS joinedAt
      FROM community_chat_members m JOIN users u ON u.id = m.user_id
      ORDER BY u.name COLLATE NOCASE ASC
    `).all().map((member: any) => ({ ...member, online: chatClients.some(client => client.id === member.id) }));
    res.json(members);
  });
  const broadcastChat = (event: string, payload: unknown, recipientIds?: number[]) => {
    const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    chatClients.forEach(({ id, res }) => {
      if (!recipientIds || recipientIds.includes(id)) res.write(data);
    });
  };
  const serializeChatMessage = (row: any) => ({
    id: String(row.id),
    conversationId: Number(row.conversation_id || 0),
    userId: row.user_id,
    author: row.author,
    authorProfileImageUrl: row.author_profile_image_url || undefined,
    authorRegion: row.author_region || undefined,
    content: row.content || '',
    isDeleted: Boolean(row.deleted_at),
    attachment: row.attachment_name ? {
      name: row.attachment_name,
      type: row.attachment_type,
      dataUrl: row.attachment_data
    } : undefined,
    replyToId: row.reply_to_id ? String(row.reply_to_id) : undefined,
    reactions: JSON.parse(row.reactions || '{}'),
    readBy: getDatabase().prepare(`
      SELECT u.id, u.name, u.profile_image_url AS profileImageUrl, r.read_at AS readAt
      FROM community_chat_message_reads r JOIN users u ON u.id = r.user_id
      WHERE r.message_id = ? ORDER BY r.read_at ASC
    `).all(row.id),
    createdAt: row.created_at
  });

  app.get("/api/community-chat/private/:userId", (req, res) => {
    const user = getChatUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const otherUserId = Number(req.params.userId);
    const otherUser = getUserById(otherUserId);
    if (!otherUser || otherUserId === user.id) return res.status(400).json({ error: "Invalid private chat member" });
    const conversationId = getOrCreatePrivateConversation(user.id, otherUserId);
    const rows = getDatabase().prepare(`
      SELECT m.*, u.profile_image_url AS author_profile_image_url, u.region AS author_region
      FROM community_chat_messages m JOIN users u ON u.id = m.user_id
      WHERE m.conversation_id = ? ORDER BY m.id ASC LIMIT 100
    `).all(conversationId);
    res.json({ conversationId, contact: { id: otherUser.id, name: otherUser.name, region: otherUser.region, profileImageUrl: otherUser.profileImageUrl }, messages: rows.map(serializeChatMessage) });
  });

  app.get("/api/community-chat", (req, res) => {
    const user = getChatUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const rows = getDatabase().prepare(`
      SELECT m.id, m.user_id, m.author, u.profile_image_url AS author_profile_image_url, u.region AS author_region, m.content, m.attachment_name, m.attachment_type, m.attachment_data, m.reply_to_id, m.reactions, m.deleted_at, m.conversation_id, m.created_at
      FROM community_chat_messages m
      JOIN users u ON u.id = m.user_id
      JOIN community_chat_members member ON member.user_id = ?
      WHERE m.conversation_id = 0 AND m.created_at >= member.joined_at
      ORDER BY m.id DESC LIMIT 100
    `).all(user.id).reverse();
    res.json(rows.map(serializeChatMessage));
  });

  app.get("/api/community-chat/stream", (req, res) => {
    const user = getChatUser(req);
    if (!user) return res.status(401).end();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write('event: ready\ndata: {}\n\n');
    const client = { id: user.id, res };
    chatClients.push(client);
    broadcastChat('presence', { userId: user.id, online: true });
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20000);
    req.on('close', () => {
      clearInterval(heartbeat);
      const index = chatClients.indexOf(client);
      if (index >= 0) chatClients.splice(index, 1);
      if (!chatClients.some(activeClient => activeClient.id === user.id)) {
        broadcastChat('presence', { userId: user.id, online: false });
      }
    });
  });

  app.post("/api/community-chat/typing", (req, res) => {
    const user = getChatUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const conversationId = Number(req.body?.conversationId) || 0;
    const isTyping = Boolean(req.body?.isTyping);
    const recipients = conversationId > 0 ? getPrivateConversationMembers(conversationId) : undefined;
    if (conversationId > 0 && !recipients?.includes(user.id)) return res.status(403).json({ error: "You are not a member of this private chat" });
    broadcastChat('typing', { conversationId, userId: user.id, name: user.name, isTyping }, recipients);
    res.json({ success: true });
  });

  app.post("/api/community-chat/messages/:id/read", (req, res) => {
    const user = getChatUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const database = getDatabase();
    const message = database.prepare(`SELECT id, user_id, conversation_id, created_at FROM community_chat_messages WHERE id = ?`).get(req.params.id) as { id: number; user_id: number; conversation_id: number; created_at: number } | undefined;
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.conversation_id > 0) {
      if (!getPrivateConversationMembers(message.conversation_id).includes(user.id)) return res.status(403).json({ error: "You are not a member of this private chat" });
    } else {
      const member = database.prepare(`SELECT joined_at FROM community_chat_members WHERE user_id = ?`).get(user.id) as { joined_at: number } | undefined;
      if (!member || message.created_at < member.joined_at) return res.status(403).json({ error: "Message is outside your group history" });
    }
    database.prepare(`INSERT OR REPLACE INTO community_chat_message_reads (message_id, user_id, read_at) VALUES (?, ?, ?)`).run(message.id, user.id, Date.now());
    const reader = { id: user.id, name: user.name, profileImageUrl: user.profileImageUrl, readAt: Date.now() };
    broadcastChat('read', { messageId: String(message.id), reader }, message.conversation_id > 0 ? getPrivateConversationMembers(message.conversation_id) : undefined);
    res.json({ success: true, reader });
  });

  app.post("/api/community-chat/messages", (req, res) => {
    const user = getChatUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const { content = '', attachment, replyToId, conversationId = 0 } = req.body || {};
    const cleanContent = String(content).trim();
    if (!cleanContent && !attachment?.dataUrl) return res.status(400).json({ error: "Message or attachment is required" });
    if (cleanContent.length > 4000) return res.status(400).json({ error: "Message is too long" });
    if (attachment?.dataUrl && (!attachment.name || !attachment.type || !String(attachment.dataUrl).startsWith('data:'))) {
      return res.status(400).json({ error: "Invalid attachment" });
    }
    if (attachment?.dataUrl && String(attachment.dataUrl).length > 8000000) {
      return res.status(413).json({ error: "Files must be smaller than 6 MB" });
    }
    const database = getDatabase();
    const numericConversationId = Number(conversationId) || 0;
    if (numericConversationId > 0 && !getPrivateConversationMembers(numericConversationId).includes(user.id)) {
      return res.status(403).json({ error: "You are not a member of this private chat" });
    }
    if (replyToId) {
      const repliedMessage = database.prepare(`SELECT deleted_at, conversation_id FROM community_chat_messages WHERE id = ?`).get(replyToId) as { deleted_at?: number; conversation_id: number } | undefined;
      if (!repliedMessage) return res.status(400).json({ error: "Reply target not found" });
      if (repliedMessage.deleted_at) return res.status(400).json({ error: "Deleted messages cannot be replied to" });
      if (Number(repliedMessage.conversation_id || 0) !== numericConversationId) return res.status(400).json({ error: "Reply target is outside this chat" });
    }
    const result = database.prepare(`
      INSERT INTO community_chat_messages
        (user_id, author, content, attachment_name, attachment_type, attachment_data, reply_to_id, conversation_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, user.name, cleanContent || null, attachment?.name || null, attachment?.type || null, attachment?.dataUrl || null, replyToId ? Number(replyToId) : null, numericConversationId, Date.now());
    const row = database.prepare(`
      SELECT m.*, u.profile_image_url AS author_profile_image_url, u.region AS author_region
      FROM community_chat_messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?
    `).get(result.lastInsertRowid);
    const message = serializeChatMessage(row);
    broadcastChat('message', message, numericConversationId > 0 ? getPrivateConversationMembers(numericConversationId) : undefined);
    res.status(201).json(message);
  });

  app.post("/api/community-chat/messages/:id/reactions", (req, res) => {
    const user = getChatUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const emoji = String(req.body?.emoji || '').trim();
    if (!emoji || emoji.length > 8) return res.status(400).json({ error: "Invalid reaction" });
    const database = getDatabase();
    const row = database.prepare(`SELECT reactions, deleted_at, conversation_id FROM community_chat_messages WHERE id = ?`).get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: "Message not found" });
    if (row.deleted_at) return res.status(400).json({ error: "Deleted messages cannot be reacted to" });
    const reactions = JSON.parse(row.reactions || '{}') as Record<string, number[]>;
    const users = reactions[emoji] || [];
    reactions[emoji] = users.includes(user.id) ? users.filter(id => id !== user.id) : [...users, user.id];
    database.prepare(`UPDATE community_chat_messages SET reactions = ? WHERE id = ?`).run(JSON.stringify(reactions), req.params.id);
    const payload = {
      messageId: String(req.params.id),
      reactions: Object.fromEntries(Object.entries(reactions).map(([key, ids]) => [key, ids.length])),
      actorId: user.id,
      actorName: user.name,
      emoji
    };
    broadcastChat('reaction', payload, Number(row.conversation_id || 0) > 0 ? getPrivateConversationMembers(Number(row.conversation_id)) : undefined);
    res.json(payload);
  });

  app.delete("/api/community-chat/messages/:id", (req, res) => {
    const user = getChatUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const database = getDatabase();
    const message = database.prepare(`SELECT id, user_id, conversation_id FROM community_chat_messages WHERE id = ?`).get(req.params.id) as { id: number; user_id: number; conversation_id: number } | undefined;
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.user_id !== user.id) return res.status(403).json({ error: "You can only delete your own messages" });
    database.prepare(`UPDATE community_chat_messages SET content = NULL, attachment_name = NULL, attachment_type = NULL, attachment_data = NULL, reactions = '{}', deleted_at = ? WHERE id = ?`).run(Date.now(), req.params.id);
    broadcastChat('delete', { messageId: String(req.params.id), deletedAt: Date.now() }, Number(message.conversation_id || 0) > 0 ? getPrivateConversationMembers(Number(message.conversation_id)) : undefined);
    res.json({ success: true, messageId: String(req.params.id) });
  });

  app.get("/api/market-hubs", (_req, res) => {
    res.json(getAllMarketHubs());
  });

  app.get("/api/market/:region", (req, res) => {
    const regionParam = decodeURIComponent(req.params.region || "");
    const countryParam = (req.query.country as string) || "";
    const hub = getMarketHubForLocation(regionParam, countryParam);
    
    // Return localized commodities along with hub metadata
    res.json({
      hub: {
        id: hub.id,
        name: hub.name,
        district: hub.district,
        country: hub.country,
        currency: hub.currency,
        currencySymbol: hub.currencySymbol,
        description: hub.description,
        tradingDays: hub.tradingDays
      },
      commodities: hub.commodities
    });
  });

  // Coordinates database for African and global agricultural hubs
  const REGION_COORDINATES: Record<string, { lat: number; lng: number; name: string; country: string }> = {
    // Zimbabwe
    "harare": { lat: -17.8292, lng: 31.0522, name: "Harare", country: "Zimbabwe" },
    "bulawayo": { lat: -20.1500, lng: 28.5833, name: "Bulawayo", country: "Zimbabwe" },
    "mutare": { lat: -18.9707, lng: 32.6509, name: "Mutare (Manicaland)", country: "Zimbabwe" },
    "manicaland": { lat: -18.9707, lng: 32.6509, name: "Manicaland (Mutare)", country: "Zimbabwe" },
    "chipinge": { lat: -20.1944, lng: 32.6228, name: "Chipinge", country: "Zimbabwe" },
    "nyanga": { lat: -18.2167, lng: 32.7500, name: "Nyanga", country: "Zimbabwe" },
    "gweru": { lat: -19.4500, lng: 29.8167, name: "Gweru (Midlands)", country: "Zimbabwe" },
    "midlands": { lat: -19.4500, lng: 29.8167, name: "Midlands (Gweru)", country: "Zimbabwe" },
    "kwekwe": { lat: -18.9281, lng: 29.8149, name: "Kwekwe", country: "Zimbabwe" },
    "gokwe": { lat: -18.2167, lng: 28.9333, name: "Gokwe", country: "Zimbabwe" },
    "masvingo": { lat: -20.0637, lng: 30.8277, name: "Masvingo", country: "Zimbabwe" },
    "chiredzi": { lat: -21.0500, lng: 31.6667, name: "Chiredzi", country: "Zimbabwe" },
    "gutu": { lat: -19.6500, lng: 31.1667, name: "Gutu", country: "Zimbabwe" },
    "bindura": { lat: -17.3000, lng: 31.3333, name: "Bindura (Mash Central)", country: "Zimbabwe" },
    "mashonaland central": { lat: -17.3000, lng: 31.3333, name: "Mashonaland Central", country: "Zimbabwe" },
    "mazowe": { lat: -17.5167, lng: 30.9667, name: "Mazowe", country: "Zimbabwe" },
    "marondera": { lat: -18.1853, lng: 31.5519, name: "Marondera (Mash East)", country: "Zimbabwe" },
    "mashonaland east": { lat: -18.1853, lng: 31.5519, name: "Mashonaland East", country: "Zimbabwe" },
    "murehwa": { lat: -17.6500, lng: 31.7833, name: "Murehwa", country: "Zimbabwe" },
    "mrewa": { lat: -17.6500, lng: 31.7833, name: "Murehwa", country: "Zimbabwe" },
    "chinhoyi": { lat: -17.3667, lng: 30.2000, name: "Chinhoyi (Mash West)", country: "Zimbabwe" },
    "mashonaland west": { lat: -17.3667, lng: 30.2000, name: "Mashonaland West", country: "Zimbabwe" },
    "karoi": { lat: -16.8167, lng: 29.6833, name: "Karoi", country: "Zimbabwe" },
    "kadoma": { lat: -18.3333, lng: 29.9167, name: "Kadoma", country: "Zimbabwe" },
    "lupane": { lat: -18.9315, lng: 27.8070, name: "Lupane (Mat North)", country: "Zimbabwe" },
    "matabeleland north": { lat: -18.9315, lng: 27.8070, name: "Matabeleland North", country: "Zimbabwe" },
    "hwange": { lat: -18.3647, lng: 23.5983, name: "Hwange", country: "Zimbabwe" },
    "gwanda": { lat: -20.9333, lng: 29.0000, name: "Gwanda (Mat South)", country: "Zimbabwe" },
    "matabeleland south": { lat: -20.9333, lng: 29.0000, name: "Matabeleland South", country: "Zimbabwe" },
    "beitbridge": { lat: -22.2167, lng: 29.9833, name: "Beitbridge", country: "Zimbabwe" },
    // Kenya
    "nairobi": { lat: -1.2921, lng: 36.8219, name: "Nairobi", country: "Kenya" },
    "nakuru": { lat: -0.3031, lng: 36.0800, name: "Nakuru (Rift Valley)", country: "Kenya" },
    "eldoret": { lat: 0.5143, lng: 35.2698, name: "Eldoret (Uasin Gishu)", country: "Kenya" },
    "kitale": { lat: 1.0157, lng: 35.0062, name: "Kitale (Trans Nzoia)", country: "Kenya" },
    "kisumu": { lat: -0.0917, lng: 34.7680, name: "Kisumu (Nyanza)", country: "Kenya" },
    "mombasa": { lat: -4.0435, lng: 39.6682, name: "Mombasa", country: "Kenya" },
    "machakos": { lat: -1.5177, lng: 37.2634, name: "Machakos", country: "Kenya" },
    "meru": { lat: 0.0463, lng: 37.6559, name: "Meru", country: "Kenya" },
    "nyeri": { lat: -0.4201, lng: 36.9476, name: "Nyeri", country: "Kenya" },
    "kericho": { lat: -0.3677, lng: 35.2831, name: "Kericho", country: "Kenya" },
    // South Africa
    "johannesburg": { lat: -26.2041, lng: 28.0473, name: "Johannesburg (Gauteng)", country: "South Africa" },
    "gauteng": { lat: -26.2041, lng: 28.0473, name: "Gauteng", country: "South Africa" },
    "pretoria": { lat: -25.7479, lng: 28.2293, name: "Pretoria", country: "South Africa" },
    "cape town": { lat: -33.9249, lng: 18.4241, name: "Cape Town (Western Cape)", country: "South Africa" },
    "western cape": { lat: -33.9249, lng: 18.4241, name: "Western Cape", country: "South Africa" },
    "durban": { lat: -29.8587, lng: 31.0218, name: "Durban (KwaZulu-Natal)", country: "South Africa" },
    "kwazulu-natal": { lat: -29.8587, lng: 31.0218, name: "KwaZulu-Natal", country: "South Africa" },
    "polokwane": { lat: -23.9045, lng: 29.4688, name: "Polokwane (Limpopo)", country: "South Africa" },
    "limpopo": { lat: -23.9045, lng: 29.4688, name: "Limpopo", country: "South Africa" },
    "nelspruit": { lat: -25.4753, lng: 30.9694, name: "Nelspruit (Mpumalanga)", country: "South Africa" },
    "mpumalanga": { lat: -25.4753, lng: 30.9694, name: "Mpumalanga", country: "South Africa" },
    "bloemfontein": { lat: -29.0852, lng: 26.1596, name: "Bloemfontein (Free State)", country: "South Africa" },
    "free state": { lat: -29.0852, lng: 26.1596, name: "Free State", country: "South Africa" },
    // Nigeria
    "lagos": { lat: 6.5244, lng: 3.3792, name: "Lagos", country: "Nigeria" },
    "ibadan": { lat: 7.3775, lng: 3.9470, name: "Ibadan (Oyo)", country: "Nigeria" },
    "abuja": { lat: 9.0765, lng: 7.3986, name: "Abuja (FCT)", country: "Nigeria" },
    "kano": { lat: 12.0022, lng: 8.5920, name: "Kano", country: "Nigeria" },
    "kaduna": { lat: 10.5105, lng: 7.4165, name: "Kaduna", country: "Nigeria" },
    // Tanzania
    "dar es salaam": { lat: -6.7924, lng: 39.2083, name: "Dar es Salaam", country: "Tanzania" },
    "arusha": { lat: -3.3869, lng: 36.6830, name: "Arusha", country: "Tanzania" },
    "mwanza": { lat: -2.5164, lng: 32.9175, name: "Mwanza", country: "Tanzania" },
    "dodoma": { lat: -6.1630, lng: 35.7516, name: "Dodoma", country: "Tanzania" },
    "mbeya": { lat: -8.9000, lng: 33.4500, name: "Mbeya", country: "Tanzania" },
    // Zambia
    "lusaka": { lat: -15.3875, lng: 28.3228, name: "Lusaka", country: "Zambia" },
    "kabwe": { lat: -14.4469, lng: 28.4464, name: "Kabwe", country: "Zambia" },
    "ndola": { lat: -12.9587, lng: 28.6366, name: "Ndola", country: "Zambia" },
    "kitwe": { lat: -12.8024, lng: 28.2132, name: "Kitwe", country: "Zambia" },
    "livingstone": { lat: -17.8419, lng: 25.8544, name: "Livingstone", country: "Zambia" },
    // Malawi
    "lilongwe": { lat: -13.9626, lng: 33.7741, name: "Lilongwe", country: "Malawi" },
    "blantyre": { lat: -15.7861, lng: 35.0058, name: "Blantyre", country: "Malawi" },
    "mzuzu": { lat: -11.4581, lng: 34.0151, name: "Mzuzu", country: "Malawi" },
    // Uganda
    "kampala": { lat: 0.3476, lng: 32.5825, name: "Kampala", country: "Uganda" },
    "jinja": { lat: 0.4244, lng: 33.2041, name: "Jinja", country: "Uganda" },
    "gulu": { lat: 2.7747, lng: 32.2990, name: "Gulu", country: "Uganda" },
    // Ghana
    "accra": { lat: 5.6037, lng: -0.1870, name: "Accra", country: "Ghana" },
    "kumasi": { lat: 6.6885, lng: -1.6244, name: "Kumasi", country: "Ghana" },
    "tamale": { lat: 9.4008, lng: -0.8393, name: "Tamale", country: "Ghana" },
    // Ethiopia
    "addis ababa": { lat: 9.0320, lng: 38.7423, name: "Addis Ababa", country: "Ethiopia" }
  };

  function parseWmoCode(code: number): { condition: string; icon: string; isRain: boolean; isSevere: boolean } {
    switch (code) {
      case 0: return { condition: "Clear Sky", icon: "Sun", isRain: false, isSevere: false };
      case 1: return { condition: "Mainly Clear", icon: "Sun", isRain: false, isSevere: false };
      case 2: return { condition: "Partly Cloudy", icon: "CloudSun", isRain: false, isSevere: false };
      case 3: return { condition: "Overcast", icon: "Cloud", isRain: false, isSevere: false };
      case 45:
      case 48: return { condition: "Foggy", icon: "CloudFog", isRain: false, isSevere: false };
      case 51: return { condition: "Light Drizzle", icon: "CloudDrizzle", isRain: true, isSevere: false };
      case 53: return { condition: "Moderate Drizzle", icon: "CloudDrizzle", isRain: true, isSevere: false };
      case 55: return { condition: "Dense Drizzle", icon: "CloudDrizzle", isRain: true, isSevere: false };
      case 56:
      case 57: return { condition: "Freezing Drizzle", icon: "CloudSnow", isRain: true, isSevere: true };
      case 61: return { condition: "Light Rain", icon: "CloudRain", isRain: true, isSevere: false };
      case 63: return { condition: "Moderate Rain", icon: "CloudRain", isRain: true, isSevere: false };
      case 65: return { condition: "Heavy Rain", icon: "CloudRain", isRain: true, isSevere: true };
      case 66:
      case 67: return { condition: "Freezing Rain", icon: "CloudSnow", isRain: true, isSevere: true };
      case 71:
      case 73:
      case 75: return { condition: "Snowfall", icon: "CloudSnow", isRain: true, isSevere: true };
      case 77: return { condition: "Snow Grains", icon: "CloudSnow", isRain: true, isSevere: false };
      case 80: return { condition: "Light Showers", icon: "CloudSunRain", isRain: true, isSevere: false };
      case 81: return { condition: "Moderate Showers", icon: "CloudRain", isRain: true, isSevere: false };
      case 82: return { condition: "Violent Showers", icon: "CloudLightning", isRain: true, isSevere: true };
      case 85:
      case 86: return { condition: "Snow Showers", icon: "CloudSnow", isRain: true, isSevere: true };
      case 95: return { condition: "Thunderstorm", icon: "CloudLightning", isRain: true, isSevere: true };
      case 96:
      case 99: return { condition: "Thunderstorm with Hail", icon: "CloudLightning", isRain: true, isSevere: true };
      default: return { condition: "Partly Cloudy", icon: "CloudSun", isRain: false, isSevere: false };
    }
  }

  function generateAgriAdvice(temp: number, humidity: number, windSpeed: number, rainChance: number, precipitation: number, locName: string): string {
    if (rainChance >= 60 || precipitation >= 3) {
      return `Rain expected in ${locName} (${rainChance}% chance, ${precipitation.toFixed(1)}mm). Hold chemical spraying to prevent runoff; great window for basin moisture capture.`;
    }
    if (temp >= 31 && humidity <= 40) {
      return `High heat and evaporation in ${locName} (${temp}°C, ${humidity}% humidity). Irrigate young crops early morning or late evening, and maintain thick mulch.`;
    }
    if (humidity >= 80 && temp >= 20 && temp <= 30) {
      return `High humidity (${humidity}%) in ${locName} increases blight and fungal pressure. Scout tomato and potato foliage; ensure plant spacing allows airflow.`;
    }
    if (windSpeed >= 20) {
      return `Gusty winds (${windSpeed} km/h) in ${locName}. Avoid knapsack pesticide spraying to prevent drift; check nursery shade netting.`;
    }
    if (temp <= 8) {
      return `Cold temperature (${temp}°C) in ${locName}. Possible night frost in low valleys. Shield sensitive seedlings with mulch or row covers.`;
    }
    return `Favorable farming conditions in ${locName} (${temp}°C, ${humidity}% humidity). Excellent window for weeding, basal fertilizer application, and field scouting.`;
  }

  async function resolveCoordinates(locationParam: string, queryLat?: any, queryLng?: any, queryCountry?: any): Promise<{ lat: number; lng: number; displayName: string }> {
    // If coordinates are explicitly supplied via query
    if (queryLat && queryLng && !isNaN(Number(queryLat)) && !isNaN(Number(queryLng))) {
      const latNum = Number(queryLat);
      const lngNum = Number(queryLng);
      const locClean = decodeURIComponent(locationParam || "").trim();
      const countryClean = queryCountry ? decodeURIComponent(String(queryCountry)).trim() : "";
      const name = locClean && locClean !== "undefined" && !locClean.startsWith("GPS") 
        ? `${locClean}${countryClean ? `, ${countryClean}` : ""}` 
        : `GPS (${latNum.toFixed(2)}°, ${lngNum.toFixed(2)}°)`;
      return { lat: latNum, lng: lngNum, displayName: name };
    }

    const rawLoc = decodeURIComponent(locationParam || "Harare").trim();
    const cleanKey = rawLoc.toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/province|region|central|east|west|north|south/g, "")
      .trim();

    // Check direct static coordinate dictionary
    for (const [key, val] of Object.entries(REGION_COORDINATES)) {
      if (cleanKey.includes(key) || key.includes(cleanKey)) {
        return { lat: val.lat, lng: val.lng, displayName: `${val.name}, ${val.country}` };
      }
    }

    // Try dynamic geocoding via Open-Meteo Geocoding API
    try {
      const geocodeRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(rawLoc)}&count=1&language=en&format=json`
      );
      if (geocodeRes.ok) {
        const geoData: any = await geocodeRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const top = geoData.results[0];
          const disp = `${top.name}${top.admin1 ? `, ${top.admin1}` : ""}, ${top.country || ""}`.replace(/,\s*$/, "");
          return { lat: top.latitude, lng: top.longitude, displayName: disp };
        }
      }
    } catch (err) {
      console.warn("Open-Meteo geocoding fallback triggered:", err);
    }

    // Default to Harare, Zimbabwe
    return { lat: -17.8292, lng: 31.0522, displayName: rawLoc || "Harare, Zimbabwe" };
  }

  // Live Real-Time Weather Fetcher using Open-Meteo
  async function fetchLiveWeatherData(lat: number, lng: number, displayName: string) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;
      
      const res = await fetch(url, { headers: { 'User-Agent': 'AgriSmart-AI-Weather/1.0' } });
      if (!res.ok) {
        throw new Error(`Open-Meteo API returned HTTP ${res.status}`);
      }

      const data: any = await res.json();
      const current = data.current || {};
      const daily = data.daily || {};
      const hourly = data.hourly || {};

      const currentTemp = Math.round(current.temperature_2m ?? 24);
      const feelsLike = Math.round(current.apparent_temperature ?? currentTemp);
      const humidity = Math.round(current.relative_humidity_2m ?? 55);
      const windSpeed = Math.round(current.wind_speed_10m ?? 12);
      const windDirection = Math.round(current.wind_direction_10m ?? 0);
      const precipitation = Number(current.precipitation ?? 0);
      const weatherCode = Number(current.weather_code ?? 1);
      const isDay = Boolean(current.is_day ?? 1);

      const parsedCurrent = parseWmoCode(weatherCode);
      const rainChance = Math.round(daily.precipitation_probability_max?.[0] ?? (parsedCurrent.isRain ? 75 : 10));
      const uvIndex = Math.round(daily.uv_index_max?.[0] ?? 6);

      const advice = generateAgriAdvice(currentTemp, humidity, windSpeed, rainChance, precipitation, displayName.split(",")[0]);

      // Map 7-Day Forecast
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const forecastDays = (daily.time || []).map((dateStr: string, idx: number) => {
        const d = new Date(dateStr + "T12:00:00Z");
        const dayLabel = idx === 0 ? "Today" : dayNames[d.getUTCDay()];
        const code = Number(daily.weather_code?.[idx] ?? 1);
        const wmo = parseWmoCode(code);
        return {
          day: dayLabel,
          date: dateStr,
          temp: Math.round(daily.temperature_2m_max?.[idx] ?? 25),
          tempMin: Math.round(daily.temperature_2m_min?.[idx] ?? 15),
          cond: wmo.condition,
          icon: wmo.icon,
          rainChance: Math.round(daily.precipitation_probability_max?.[idx] ?? 0),
          precipitation: Number(daily.precipitation_sum?.[idx] ?? 0),
          uv: Math.round(daily.uv_index_max?.[idx] ?? 5)
        };
      });

      // Map Hourly Forecast (Next 24 hours) from the provider's local timezone.
      const currentTime = String(current.time || "");
      const firstCurrentHour = (hourly.time || []).findIndex((timeStr: string) => timeStr >= currentTime);
      const currentHourIndex = firstCurrentHour >= 0 ? firstCurrentHour : 0;
      const nextHours = (hourly.time || []).slice(currentHourIndex, currentHourIndex + 24).map((timeStr: string, idx: number) => {
        const sourceIndex = currentHourIndex + idx;
        const timePart = timeStr.split("T")[1] || "12:00";
        const code = Number(hourly.weather_code?.[sourceIndex] ?? 1);
        const wmo = parseWmoCode(code);
        return {
          time: timePart,
          temp: Math.round(hourly.temperature_2m?.[sourceIndex] ?? currentTemp),
          humidity: Math.round(hourly.relative_humidity_2m?.[sourceIndex] ?? humidity),
          rainChance: Math.round(hourly.precipitation_probability?.[sourceIndex] ?? 0),
          precipitation: Number(hourly.precipitation?.[sourceIndex] ?? 0),
          cond: wmo.condition,
          icon: wmo.icon
        };
      });

      // Convert wind degrees to compass
      const compassDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
      const compass = compassDirections[Math.round(windDirection / 22.5) % 16];

      return {
        location: displayName,
        coordinates: { lat, lng },
        temp: currentTemp,
        feelsLike,
        condition: parsedCurrent.condition,
        icon: parsedCurrent.icon,
        wmoCode: weatherCode,
        isSevere: parsedCurrent.isSevere || windSpeed > 35 || precipitation > 25,
        humidity,
        windSpeed,
        windDirection: compass,
        rainChance,
        precipitation,
        uvIndex,
        isDay,
        sunrise: daily.sunrise?.[0]?.split("T")[1] || "06:00",
        sunset: daily.sunset?.[0]?.split("T")[1] || "18:00",
        advice,
        forecast: forecastDays.length > 0 ? forecastDays : [
          { day: "Today", temp: currentTemp, tempMin: currentTemp - 8, cond: parsedCurrent.condition, rainChance },
          { day: "Tomorrow", temp: currentTemp + 1, tempMin: currentTemp - 7, cond: "Partly Cloudy", rainChance: 15 },
          { day: "Next Day", temp: currentTemp - 1, tempMin: currentTemp - 9, cond: "Sunny", rainChance: 5 }
        ],
        hourly: nextHours,
        isLive: true,
        dataSource: "Open-Meteo Meteorological Service",
        timestamp: Date.now()
      };
    } catch (e: any) {
      console.warn("Open-Meteo weather fetch error, using resilient deterministic model:", e.message);
      
      // Resilient fallback with dynamic realistic variations
      let hash = 0;
      for (let i = 0; i < displayName.length; i++) {
        hash = (hash << 5) - hash + displayName.charCodeAt(i);
        hash |= 0;
      }
      const absHash = Math.abs(hash);
      const baseTemp = 22 + (absHash % 8);
      const conditions = ["Clear Sky", "Partly Cloudy", "Mainly Clear", "Scattered Clouds", "Light Rain", "Sunny"];
      const condition = conditions[absHash % conditions.length];
      const humidity = 45 + (absHash % 35);
      const windSpeed = 10 + (absHash % 12);
      const rainChance = condition.includes("Rain") ? 70 : (absHash % 30);
      const advice = generateAgriAdvice(baseTemp, humidity, windSpeed, rainChance, rainChance > 50 ? 4.5 : 0, displayName.split(",")[0]);

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const forecast = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() + i * 86400000).toISOString().split('T')[0];
        return {
        day: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[new Date(`${date}T12:00:00Z`).getUTCDay()],
        date,
        temp: baseTemp + ((i % 3) - 1) * 2,
        tempMin: baseTemp - 8,
        cond: conditions[(absHash + i) % conditions.length],
        icon: "CloudSun",
        rainChance: (rainChance + i * 10) % 80,
        precipitation: 0,
        uv: 7
        };
      });

      return {
        location: displayName,
        coordinates: { lat, lng },
        temp: baseTemp,
        feelsLike: baseTemp,
        condition,
        icon: "CloudSun",
        wmoCode: 2,
        isSevere: false,
        humidity,
        windSpeed,
        windDirection: "SE",
        rainChance,
        precipitation: rainChance > 50 ? 4.5 : 0,
        uvIndex: 7,
        isDay: true,
        sunrise: "06:12",
        sunset: "18:05",
        advice,
        forecast,
        hourly: [],
        isLive: false,
        dataSource: "AgriSmart Offline Meteorological Estimator",
        timestamp: Date.now()
      };
    }
  }

  // Real-Time Location-Aware Weather API Endpoint
  app.get("/api/weather/:location", async (req, res) => {
    try {
      const locationParam = req.params.location || "Harare";
      const { lat, lng, country } = req.query;

      const { lat: resolvedLat, lng: resolvedLng, displayName } = await resolveCoordinates(
        locationParam,
        lat,
        lng,
        country
      );

      const weatherData = await fetchLiveWeatherData(resolvedLat, resolvedLng, displayName);
      return res.json(weatherData);
    } catch (err: any) {
      console.error("Weather endpoint fatal error:", err);
      return res.status(500).json({ error: "Failed to fetch real weather details", details: err.message });
    }
  });

  // SMS Simulation Endpoint with AI Reasoning & Live Real-Time Grounding
  app.post("/api/sms-simulation", async (req, res) => {
    try {
      const { query = "", language = "English", location = "Harare, Zimbabwe" } = req.body;
      const cleanMsg = query.trim();
      const upper = cleanMsg.toUpperCase();

      if (!cleanMsg) {
        return res.json({ reply: "AgriSmart SMS: Please enter your question or text HELP for instructions." });
      }

      // 1. Specialized Direct Commands: WEATHER
      if (upper.startsWith("WEATHER") || upper.includes("WEATHER")) {
        const parts = cleanMsg.split(/\s+/);
        const locTarget = parts.length > 1 && parts[1].toUpperCase() !== "WEATHER" 
          ? parts.slice(1).join(" ") 
          : location.split(",")[0];

        const { lat, lng, displayName } = await resolveCoordinates(locTarget);
        const weather = await fetchLiveWeatherData(lat, lng, displayName);

        const reply = `AgriSmart Weather [${displayName.split(",")[0]}]: ${weather.temp}°C, ${weather.condition}. Humidity ${weather.humidity}%, Wind ${weather.windSpeed}km/h, Rain Chance ${weather.rainChance}% (${weather.precipitation}mm). ${weather.advice.slice(0, 95)}...`;
        return res.json({ reply, isLiveWeather: true });
      }

      // 2. Specialized Direct Commands: PRICE
      if (upper.startsWith("PRICE") || upper.includes("PRICE") || upper.includes("MARKET")) {
        const parts = cleanMsg.split(/\s+/);
        const cropTarget = parts.length > 1 && parts[1].toUpperCase() !== "PRICE" ? parts[1].toUpperCase() : "MAIZE";

        const hub = getMarketHubForLocation(location);
        const matchedComm = hub.commodities.find(c => c.crop.toUpperCase().includes(cropTarget)) || hub.commodities[0];

        const reply = `AgriSmart Market [${hub.name}, ${hub.country}]: ${matchedComm.crop} is ${matchedComm.price}/${matchedComm.unit} (${matchedComm.trend === 'up' ? '▲+' : matchedComm.trend === 'down' ? '▼-' : '■'}${matchedComm.changePercent}). Status: ${matchedComm.supplyStatus}.`;
        return res.json({ reply, isMarketPrice: true });
      }

      // 3. HELP Command
      if (upper === "HELP" || upper === "INFO" || upper === "?") {
        return res.json({
          reply: "AgriSmart SMS Help: Text 'WEATHER [City]' for live forecast, 'PRICE [Crop]' for wholesale spot rates, or ask any crop problem (e.g. 'Maize leaves turning yellow?'). Dial *143# for USSD."
        });
      }

      // 4. Natural Language Agricultural Query using Gemini with SMS Constraints
      const ai = getAI();
      if (ai) {
        try {
          const smsPrompt = `You are AgriSmart SMS, an agricultural advisor for smallholder African farmers communicating over low-bandwidth basic SMS (160-260 characters max).
Language: ${language}.
Farmer Location: ${location}.
Farmer Question: "${cleanMsg}".

Constraints:
- Response MUST be under 240 characters total.
- Format as: "AgriSmart: [Diagnosis/Direct Answer]. [Action Step 1]. [Action Step 2]."
- Plain text only, no emojis or markdown asterisks.
- Highly actionable, practical, low-cost organic/cultural methods.`;

          const response = await ai.models.generateContent({
            model: GEMINI_CHAT_MODEL,
            contents: [{ role: "user", parts: [{ text: smsPrompt }] }],
            config: { temperature: 0.3 }
          });

          if (response.text) {
            return res.json({ reply: response.text.trim() });
          }
        } catch (aiErr) {
          console.warn("SMS Gemini generation fallback:", aiErr);
        }
      }

      // 5. Contextual Expert Rule Fallback for Offline/Low-latency SMS
      let fallbackReply = `AgriSmart: For ${cleanMsg.slice(0, 25)}, inspect crop root zone, maintain adequate soil moisture, and scout weekly for pest egg clusters. Dial *143# for options.`;
      
      if (upper.includes("ARMYWORM") || upper.includes("CATERPILLAR")) {
        fallbackReply = "AgriSmart: Fall Armyworm detected. Apply fine wood ash or sand in the maize whorl, or spray Neem extract / Emamectin Benzoate late afternoon.";
      } else if (upper.includes("BLIGHT") || upper.includes("TOMATO")) {
        fallbackReply = "AgriSmart: Early/Late Blight on Tomatoes. Remove infected lower leaves immediately, mulch soil, and apply Copper Oxychloride spray every 7 days.";
      } else if (upper.includes("YELLOW") || upper.includes("NITROGEN") || upper.includes("FERTILIZER")) {
        fallbackReply = "AgriSmart: Yellowing leaves indicate Nitrogen deficiency or waterlogging. Apply Ammonium Nitrate top-dressing (50kg/ha) or well-rotted cattle manure tea.";
      } else if (upper.includes("PFUMVUDZA") || upper.includes("BASIN")) {
        fallbackReply = "AgriSmart Pfumvudza: Dig basins 15cm deep x 15cm wide x 20cm long. Spacing 60cm within row x 75cm between rows. Apply organic compost mulch before rains.";
      }

      return res.json({ reply: fallbackReply });
    } catch (err: any) {
      console.error("SMS simulation endpoint error:", err);
      return res.status(500).json({ error: "Failed to process SMS", reply: "AgriSmart: Network busy. Please try again shortly." });
    }
  });

  // Interactive USSD Engine (*143#) with Multi-tier Navigation & Live Meteorological Grounding
  const ussdSessions: Record<string, { menu: string; data?: any; lang?: string }> = {};

  app.post("/api/ussd", async (req, res) => {
    try {
      const { sessionId = "default", text = "*143#" } = req.body;
      const input = text.trim();
      let session = ussdSessions[sessionId] || { menu: "root", lang: "English" };

      // Root initialization
      if (input === "*143#" || input === "0" && session.menu === "root") {
        session = { menu: "root", lang: session.lang };
        ussdSessions[sessionId] = session;
        return res.send(
          "CON AgriSmart Farm Advisor\n" +
          "1. Live Weather & Rain Alert\n" +
          "2. Wholesale Market Prices\n" +
          "3. Pest & Disease Doctor\n" +
          "4. Soil & Planting Calendar\n" +
          "5. Emergency Hazard Alert\n" +
          "6. Change Language"
        );
      }

      // Handle Back Navigation (0)
      if (input === "0") {
        session = { menu: "root", lang: session.lang };
        ussdSessions[sessionId] = session;
        return res.send(
          "CON AgriSmart Main Menu:\n" +
          "1. Live Weather & Rain Alert\n" +
          "2. Wholesale Market Prices\n" +
          "3. Pest & Disease Doctor\n" +
          "4. Soil & Planting Calendar\n" +
          "5. Emergency Hazard Alert\n" +
          "6. Change Language"
        );
      }

      // ROOT SELECTIONS
      if (session.menu === "root") {
        if (input === "1") {
          session.menu = "weather_region";
          ussdSessions[sessionId] = session;
          return res.send(
            "CON Select Region for Live Weather:\n" +
            "1. Harare\n" +
            "2. Bulawayo\n" +
            "3. Mutare (Manicaland)\n" +
            "4. Gweru (Midlands)\n" +
            "5. Masvingo\n" +
            "6. Mashonaland West (Chinhoyi)\n" +
            "7. Kenya (Nairobi)\n" +
            "0. Back"
          );
        }

        if (input === "2") {
          session.menu = "market_crop";
          ussdSessions[sessionId] = session;
          return res.send(
            "CON Select Commodity Price:\n" +
            "1. White Maize (Ton)\n" +
            "2. Fresh Tomatoes (Crate)\n" +
            "3. Soybeans (Ton)\n" +
            "4. Wheat Grain (Ton)\n" +
            "5. Onions (10kg pocket)\n" +
            "0. Back"
          );
        }

        if (input === "3") {
          session.menu = "pest_doctor";
          ussdSessions[sessionId] = session;
          return res.send(
            "CON Pest & Disease Doctor:\n" +
            "1. Fall Armyworm on Maize\n" +
            "2. Tomato Early/Late Blight\n" +
            "3. Aphids & Whiteflies\n" +
            "4. Maize Streak Virus\n" +
            "0. Back"
          );
        }

        if (input === "4") {
          session.menu = "planting_soil";
          ussdSessions[sessionId] = session;
          return res.send(
            "CON Soil & Planting Guide:\n" +
            "1. Pfumvudza Basin Specifications\n" +
            "2. Basal & Top-dress Fertilizer Timing\n" +
            "3. 3-Year Crop Rotation Cycle\n" +
            "0. Back"
          );
        }

        if (input === "5") {
          session = { menu: "root", lang: session.lang };
          ussdSessions[sessionId] = session;
          return res.send(
            "END AgriSmart Emergency Weather Alert:\n" +
            "Active Hazard: Sudden thunderstorm & high wind risk in high-altitude zones. Ensure nursery drainage is open and shield seedlings with mulch."
          );
        }

        if (input === "6") {
          session.menu = "lang_select";
          ussdSessions[sessionId] = session;
          return res.send(
            "CON Select Language / Chinja Mutauro:\n" +
            "1. English\n" +
            "2. Shona (ChiShona)\n" +
            "3. Ndebele (isiNdebele)\n" +
            "4. Swahili (Kiswahili)\n" +
            "0. Back"
          );
        }

        return res.send("CON Invalid option.\n1. Weather\n2. Market Prices\n3. Pest Doctor\n4. Soil Guide\n0. Main Menu");
      }

      // SUBMENU: WEATHER BY REGION
      if (session.menu === "weather_region") {
        const regionMap: Record<string, string> = {
          "1": "Harare",
          "2": "Bulawayo",
          "3": "Mutare",
          "4": "Gweru",
          "5": "Masvingo",
          "6": "Chinhoyi",
          "7": "Nairobi"
        };
        const selectedLoc = regionMap[input] || "Harare";
        const coords = await resolveCoordinates(selectedLoc);
        const w = await fetchLiveWeatherData(coords.lat, coords.lng, coords.displayName);

        session = { menu: "root", lang: session.lang };
        ussdSessions[sessionId] = session;
        return res.send(
          `END Live Weather for ${selectedLoc}:\n` +
          `Temp: ${w.temp}°C (${w.condition})\n` +
          `Humidity: ${w.humidity}% | Wind: ${w.windSpeed}km/h\n` +
          `Rain Probability: ${w.rainChance}% (${w.precipitation}mm)\n` +
          `Advice: ${w.advice.slice(0, 110)}`
        );
      }

      // SUBMENU: MARKET COMMODITY
      if (session.menu === "market_crop") {
        const cropMap: Record<string, { name: string; price: string; trend: string; note: string }> = {
          "1": { name: "White Maize", price: "$360.00 / Ton", trend: "UP (+3.2%)", note: "High demand from commercial millers." },
          "2": { name: "Fresh Tomatoes", price: "$14.50 / Wooden Crate", trend: "DOWN (-2.0%)", note: "Peak supply at Mbare Musika wholesale." },
          "3": { name: "Soybeans", price: "$535.00 / Ton", trend: "UP (+1.8%)", note: "Crushers actively buying at premium spot rate." },
          "4": { name: "Wheat Grain", price: "$440.00 / Ton", trend: "STABLE", note: "Standard bakery grade contracting active." },
          "5": { name: "Onions", price: "$6.80 / 10kg Pocket", trend: "UP (+4.5%)", note: "Strong regional cross-border demand." }
        };
        const match = cropMap[input] || cropMap["1"];

        session = { menu: "root", lang: session.lang };
        ussdSessions[sessionId] = session;
        return res.send(
          `END Spot Market Price:\n` +
          `Commodity: ${match.name}\n` +
          `Price: ${match.price}\n` +
          `Trend: ${match.trend}\n` +
          `Market Note: ${match.note}`
        );
      }

      // SUBMENU: PEST DOCTOR
      if (session.menu === "pest_doctor") {
        const pestSolutions: Record<string, string> = {
          "1": "END Fall Armyworm Control:\n- Organic: Apply fine wood ash or dry river sand directly inside leaf whorls.\n- Chemical: Spray Emamectin Benzoate (10g/15L) in late afternoon.\n- Check plants every 3 days.",
          "2": "END Tomato Blight Control:\n- Prune diseased lower leaves and bury outside garden.\n- Mulch around stems to stop soil splash.\n- Spray Copper Oxychloride (50g/15L) every 7 days.",
          "3": "END Aphid & Whitefly Control:\n- Spray soapy water solution (1 tbsp dish soap in 5L water) or neem oil spray.\n- Encourage ladybird beetles.\n- Spray Acetamiprid if severe.",
          "4": "END Maize Streak Virus:\n- Control vector (leafhoppers) with systemic seed dressing.\n- Remove and destroy severely stunted yellow-streaked seedlings early."
        };
        const reply = pestSolutions[input] || pestSolutions["1"];
        session = { menu: "root", lang: session.lang };
        ussdSessions[sessionId] = session;
        return res.send(reply);
      }

      // SUBMENU: PLANTING & SOIL
      if (session.menu === "planting_soil") {
        const guideMap: Record<string, string> = {
          "1": "END Pfumvudza Specifications:\n- Basin: 15cm deep x 15cm wide x 20cm long.\n- Spacing: 60cm within row x 75cm inter-row.\n- Add 1 handful compost per basin and cover with crop residue mulch.",
          "2": "END Fertilizer Timing:\n- Basal: Apply Compound D (8g/basin) at planting.\n- Top-dress: Apply Ammonium Nitrate (5g/plant) at knee-high (4-5 weeks after germination).",
          "3": "END Strategic 3-Year Rotation:\n- Year 1: Heavy Feeder (Maize/Sorghum)\n- Year 2: Legume Nitrogen Fixer (Soybeans/Groundnuts)\n- Year 3: Root Crop/Tuber (Cassava/Potatoes)"
        };
        const reply = guideMap[input] || guideMap["1"];
        session = { menu: "root", lang: session.lang };
        ussdSessions[sessionId] = session;
        return res.send(reply);
      }

      // SUBMENU: LANGUAGE SELECTION
      if (session.menu === "lang_select") {
        const langs: Record<string, string> = { "1": "English", "2": "Shona", "3": "Ndebele", "4": "Swahili" };
        const chosen = langs[input] || "English";
        session = { menu: "root", lang: chosen };
        ussdSessions[sessionId] = session;
        return res.send(`END Language updated to ${chosen}. Dial *143# to start with localized menu.`);
      }

      // Catch-all
      session = { menu: "root", lang: session.lang };
      ussdSessions[sessionId] = session;
      return res.send("END Session ended. Dial *143# to start again.");
    } catch (err: any) {
      console.error("USSD endpoint error:", err);
      return res.send("END Network error. Dial *143# to retry.");
    }
  });

  // ==================== AUTHENTICATION ENDPOINTS ====================

  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const {
        email,
        password,
        name,
        language,
        country,
        region,
        address,
        phoneCountryCode,
        phoneNumber,
        cellPhoneNumber,
        recoveryQuestion,
        recoveryAnswer
      } = req.body;

      if (!email || !password || !name || !address || !phoneNumber || !req.body.profileImageUrl) {
        return res.status(400).json({ error: "Email, password, name, profile photo, address, and WhatsApp number are required" });
      }

      const result = await registerUser(
        email,
        password,
        name,
        language,
        country,
        region,
        phoneCountryCode,
        phoneNumber,
        recoveryQuestion,
        recoveryAnswer,
        req.body.profileImageUrl,
        address,
        cellPhoneNumber
      );
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, user: result.user });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Password reset request endpoint
  app.post("/api/auth/request-reset", async (req, res) => {
    try {
      const payload = req.body || {};
      const result = await requestPasswordReset(payload);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Password reset request failed" });
    }
  });

  // Password reset confirm endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const payload = req.body || {};
      const result = await resetPasswordWithCode(payload);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const result = await loginUser(email, password);
      if (!result.success) {
        return res.status(401).json({ error: result.error });
      }

      res.json({ success: true, user: result.user, token: result.token });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Verify token endpoint
  app.post("/api/auth/verify", (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const user = getUserById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Token verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Update user profile endpoint
  app.put("/api/auth/profile", (req, res) => {
    try {
      const { token, ...profileData } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const success = updateUserProfile(decoded.userId, profileData);
      if (!success) {
        return res.status(500).json({ error: "Failed to update profile" });
      }

      const user = getUserById(decoded.userId);
      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Profile update failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.join(process.cwd(), "frontend/vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "frontend", "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
