const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const EXTRACTION_PROMPT = `You are an invoice data extraction assistant. Analyze this invoice image carefully and read ALL visible text.

Return ONLY a valid JSON object. No markdown, no code blocks, no explanation — just the raw JSON:

{
  "supplier_name": "company or supplier name from the invoice",
  "date": "YYYY-MM-DD",
  "receipt_number": "invoice or receipt number",
  "ice": "ICE number if present, otherwise null",
  "if_tax": "IF (Identifiant Fiscal) number if present, otherwise null",
  "items": [
    { "name": "product or service description", "quantity": 1, "unit_price": 0.00 }
  ],
  "tva_rate": 0.20,
  "total_ht": 0.00,
  "total_ttc": 0.00
}

Rules:
- Return ONLY the JSON object, nothing else
- date format: YYYY-MM-DD (use 1st of month if only month/year visible)
- tva_rate: 0.20 for 20% TVA, 0.10 for 10% TVA, default 0.20
- All monetary values are plain numbers in MAD (no currency symbols)
- Extract ALL line items visible on the invoice
- The invoice may be in French, Arabic, or both languages
- Use null for any field not found on the invoice`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      const formData = await request.formData();
      const imageFile = formData.get('image');

      if (!imageFile) {
        return jsonResponse({ error: 'No image field in form data' }, 400);
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return jsonResponse({ error: 'Image file is empty' }, 400);
      }

      const imageArray = Array.from(new Uint8Array(arrayBuffer));

      // Mistral Small 3.1 — Vision capable, no license agreement required
      const aiResponse = await env.AI.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${arrayBufferToBase64(arrayBuffer)}` } },
              { type: 'text', text: EXTRACTION_PROMPT },
            ],
          },
        ],
        max_tokens: 2048,
      });

      // Parse response — different models return different shapes
      let rawText = '';
      if (typeof aiResponse.response === 'string') {
        // Llama / older CF models
        rawText = aiResponse.response;
      } else if (aiResponse.choices?.[0]?.message?.content) {
        // OpenAI-compatible format (Mistral, newer models)
        rawText = aiResponse.choices[0].message.content;
      } else if (Array.isArray(aiResponse.response) && aiResponse.response.length > 0) {
        rawText = String(aiResponse.response[0]);
      } else {
        // Last resort — stringify the whole response for debugging
        return jsonResponse({ error: 'Unexpected model response shape', raw: JSON.stringify(aiResponse) }, 422);
      }
      rawText = rawText.trim();

      // Strip markdown code fences
      rawText = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return jsonResponse({ error: 'Model did not return valid JSON', raw: rawText }, 422);
      }

      const extracted = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(extracted.items)) extracted.items = [];
      if (typeof extracted.tva_rate !== 'number') extracted.tva_rate = 0.20;

      return jsonResponse({ success: true, data: extracted });

    } catch (err) {
      if (err instanceof SyntaxError) {
        return jsonResponse({ error: 'Failed to parse model output', detail: err.message }, 422);
      }
      return jsonResponse({ error: err.message || 'Internal server error' }, 500);
    }
  },
};

// Helper: convert ArrayBuffer to base64 string (CF Workers compatible)
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
