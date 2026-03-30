export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ response: 'Method not allowed' });
  }

  const { message, context } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ response: '❌ API key no configurada en Vercel' });
  }

  try {
    const systemPrompt = `Eres un asistente inteligente para Umbral OS.

CONTEXTO:
- Consultores: ${context.consultants.map(c => c.name).join(', ') || 'Ninguno'}
- Eventos: ${context.tasks}
- Consultor seleccionado: ${context.selectedConsultant}
- Vista: ${context.currentView}

Responde en español, de forma concisa y amigable.`;

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      return res.status(apiResponse.status).json({ response: '❌ Error de API: ' + error.error?.message });
    }

    const data = await apiResponse.json();
    const content = data.content[0].text;

    return res.status(200).json({ response: content });
  } catch (error) {
    return res.status(500).json({ response: '❌ Error: ' + error.message });
  }
}
