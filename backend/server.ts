import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { AGRICULTURAL_IMAGES, findMatchingAgriImages, isImageRequest, type AgriImage } from "../shared/agriculturalImages";
import { getMarketHubForLocation, getAllMarketHubs } from "../shared/marketData";

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));

  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", prompt } = req.body;
      if (!imageBase64 || !prompt) {
        return res.status(400).json({ error: "Image and analysis prompt are required" });
      }

      const ai = getAI();
      if (!ai) {
        return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: imageBase64, mimeType } }
          ]
        },
        config: { responseMimeType: "application/json", maxOutputTokens: 1200 }
      });

      if (!response.text) {
        return res.status(502).json({ error: "The AI returned an empty analysis" });
      }

      return res.json({ data: JSON.parse(response.text) });
    } catch (error: any) {
      console.error("Image analysis error:", error);
      return res.status(500).json({ error: error.message || "Failed to analyze image" });
    }
  });

  // AI Chat endpoint with automated visual identification and image generation
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages = [], query, language = "English", location = "Harare, Zimbabwe" } = req.body;
      const userText = query || (messages.length > 0 ? messages[messages.length - 1].content : "");

      if (!userText) {
        return res.status(400).json({ error: "Query or message is required" });
      }

      const needsImage = isImageRequest(userText);
      let matchedImages: AgriImage[] = [];

      if (needsImage) {
        matchedImages = findMatchingAgriImages(userText, 2);
      }

      const ai = getAI();
      let replyText = "";
      let aiGeneratedImage: { url: string; title: string; description: string } | null = null;

      const systemPrompt = `You are AgriSmart AI, an expert Southern African agricultural advisor specializing in crops, pests, plant pathology, soil health, drip irrigation, livestock, and agronomy for smallholder and commercial farmers.
Current Language: ${language}
Farmer Location: ${location}

Formatting Rules:
- Keep advice practical, actionable, and cost-effective.
- If the user asks about or needs to visualize any pest, disease, weed, deficiency, farming technique, or crop:
  1. Clearly describe the visual physical characteristics and symptoms so the farmer knows exactly what to look for in their fields.
  2. Provide step-by-step organic/cultural management practices and chemical control if necessary.
  3. Mention that visual image reference cards have been attached below for easy identification.
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
            model: "gemini-3.6-flash",
            contents: contents as any,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7,
            }
          });

          replyText = response.text || "";
        } catch (genError) {
          console.error("Gemini Chat generation error:", genError);
        }
      }

      // Fallback response if Gemini generation failed or key wasn't available
      if (!replyText) {
        if (needsImage && matchedImages.length > 0) {
          const topMatch = matchedImages[0];
          replyText = `Here is visual information on **${topMatch.title}**:\n\n${topMatch.description}\n\n**Key Symptoms & Tips:**\n${topMatch.symptomsOrTips?.map(s => `- ${s}`).join('\n') || '- Inspect plants regularly for early signs.'}\n\nCheck the visual photo reference below.`;
        } else {
          replyText = `Thank you for your question. For agricultural advice in ${location}, please inspect your crops for early symptoms, ensure balanced irrigation, and consult local extension officers.`;
        }
      }

      // If user explicitly asked for an image and no database image matched, or if they requested custom AI generation
      const isExplicitGenRequest = /generate (an |a )?image|draw|create (a |an )?picture|paint/i.test(userText);
      if (isExplicitGenRequest && ai && matchedImages.length === 0) {
        try {
          const imageRes = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-image",
            contents: {
              parts: [
                {
                  text: `High quality, clear photorealistic agricultural guide image for African farming: ${userText}`
                }
              ]
            }
          });

          for (const part of imageRes.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData?.data) {
              aiGeneratedImage = {
                url: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
                title: `AI Visual: ${userText.slice(0, 40)}`,
                description: `Generated agricultural reference visual based on your query.`
              };
              break;
            }
          }
        } catch (imgError) {
          console.warn("AI Image generation unavailable, using curated reference:", imgError);
        }
      }

      // Format final images array
      const responseImages = [];
      if (aiGeneratedImage) {
        responseImages.push({
          id: 'ai-gen-' + Date.now(),
          title: aiGeneratedImage.title,
          category: 'technique' as const,
          description: aiGeneratedImage.description,
          url: aiGeneratedImage.url,
          tags: ['ai-generated'],
          isAiGenerated: true
        });
      }

      for (const img of matchedImages) {
        responseImages.push(img);
      }

      return res.json({
        reply: replyText,
        images: responseImages,
        needsImage
      });
    } catch (err: any) {
      console.error("Chat endpoint error:", err);
      return res.status(500).json({ error: "Failed to process chat request", details: err.message });
    }
  });

  // Dedicated Image Generation Endpoint
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const ai = getAI();
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-image",
            contents: {
              parts: [
                {
                  text: `Clear, detailed, photorealistic agricultural photograph showing: ${prompt}. African farming context, natural lighting, highly educational.`
                }
              ]
            }
          });

          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData?.data) {
              return res.json({
                imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
                isAiGenerated: true,
                prompt
              });
            }
          }
        } catch (e: any) {
          console.warn("Gemini image generation fallback triggered:", e.message);
        }
      }

      // Fallback to closest curated high-res image
      const matches = findMatchingAgriImages(prompt, 1);
      if (matches.length > 0) {
        return res.json({
          imageUrl: matches[0].url,
          title: matches[0].title,
          description: matches[0].description,
          isAiGenerated: false,
          fallback: true
        });
      }

      // Generic agricultural fallback
      return res.json({
        imageUrl: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1200&q=80",
        title: "Agricultural Reference Visual",
        description: "Standard crop reference image.",
        isAiGenerated: false,
        fallback: true
      });
    } catch (error: any) {
      console.error("Generate image endpoint error:", error);
      return res.status(500).json({ error: "Failed to generate image" });
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

  let communityPosts: CommunityPost[] = [
    {
      id: "post-1",
      author: "Tendai Moyo",
      region: "Mazowe, Mashonaland Central",
      category: "Tip",
      crop: "Maize",
      title: "Pfumvudza Mulching Tip for High Temperatures",
      content: "After yesterday's 31°C heat, our Pfumvudza basins retained excellent moisture because of 10cm dry grass mulch. Make sure you don't use green weeds with seeds as mulch!",
      likes: 24,
      replies: [
        {
          id: "rep-1",
          author: "Farai Chitepo",
          region: "Goromonzi",
          content: "Great advice Tendai! Grass mulch has cut our watering requirement in half.",
          createdAt: Date.now() - 3600000 * 5
        }
      ],
      createdAt: Date.now() - 3600000 * 24
    },
    {
      id: "post-2",
      author: "Nomsa Dube",
      region: "Lupane, Matabeleland North",
      category: "Question",
      crop: "Sorghum",
      title: "Early signs of Stem Borer vs Fall Armyworm?",
      content: "Noticing small pin-holes in the upper leaves of SV-2 Sorghum. Is this stem borer or early armyworm? What bio-pesticide works best without harming honeybees?",
      likes: 18,
      replies: [
        {
          id: "rep-2",
          author: "Dr. Sibanda (Agronomist)",
          region: "Bulawayo",
          content: "Stem borer leaves regular window panes in straight lines. Mix fine dry wood ash with chili powder in the whorl early morning.",
          createdAt: Date.now() - 3600000 * 12
        }
      ],
      createdAt: Date.now() - 3600000 * 36
    },
    {
      id: "post-3",
      author: "Kiprono Bett",
      region: "Eldoret, Uasin Gishu",
      category: "Market Alert",
      crop: "Irish Potatoes",
      title: "High wholesale demand for Dutch Robjin variety",
      content: "Buyers in Eldoret town market paying KSh 3,800 per 90kg bag today for clean graded potatoes. High demand expected through end of the week.",
      likes: 31,
      replies: [],
      createdAt: Date.now() - 3600000 * 48
    }
  ];

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

      // Map Hourly Forecast (Next 24 hours)
      const currentHourIndex = new Date().getUTCHours();
      const nextHours = (hourly.time || []).slice(0, 24).map((timeStr: string, idx: number) => {
        const timePart = timeStr.split("T")[1] || "12:00";
        const code = Number(hourly.weather_code?.[idx] ?? 1);
        const wmo = parseWmoCode(code);
        return {
          time: timePart,
          temp: Math.round(hourly.temperature_2m?.[idx] ?? currentTemp),
          humidity: Math.round(hourly.relative_humidity_2m?.[idx] ?? humidity),
          rainChance: Math.round(hourly.precipitation_probability?.[idx] ?? 0),
          precipitation: Number(hourly.precipitation?.[idx] ?? 0),
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
            model: "gemini-3.6-flash",
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
