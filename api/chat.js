export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ response: 'Method not allowed' });
  }

  const { message, context } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ response: 'API key not configured' });
  }

  try {
    const systemPrompt = `Eres un asistente para Umbral OS.
Consultores: ${context.consultants.map(c => c.name).join(', ') || 'Ninguno'}
Eventos: ${context.tasks}
Seleccionado: ${context.selectedConsultant}

Responde en español, breve y amigable.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ response: 'API Error: ' + error.error?.message });
    }

    const data = await response.json();
    return res.status(200).json({ response: data.content[0].text });
  } catch (error) {
    return res.status(500).json({ response: 'Error: ' + error.message });
  }
}
