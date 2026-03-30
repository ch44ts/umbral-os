export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, context } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      response: '❌ Error: API key no configurada. Agrega ANTHROPIC_API_KEY en Vercel Settings → Environment Variables.'
    });
  }

  try {
    // Prompt para Haiku
    const systemPrompt = `Eres un asistente inteligente para Umbral OS, un gestor de consultores y calendario de proyectos.

CONTEXTO ACTUAL:
- Consultores: ${context.consultants.map(c => c.name).join(', ') || 'Ninguno'}
- Eventos en calendario: ${context.tasks}
- Consultor seleccionado: ${context.selectedConsultant}
- Vista actual: ${context.currentView}
- Semana: ${context.currentWeek.start} a ${context.currentWeek.end}

INSTRUCCIONES:
1. Responde en español de forma natural y conversacional
2. Sé conciso pero útil
3. Si el usuario pide agregar eventos, cambiar colores o hacer cambios significativos, hazlo directamente
4. Responde preguntas sobre consultores, tareas, horarios, etc
5. Puedes hacer consultas sobre el estado del calendario

Responde de forma amigable y directa.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', error);
      return res.status(response.status).json({ 
        response: '❌ Error de API: ' + (error.error?.message || 'Error desconocido')
      });
    }

    const data = await response.json();
    const content = data.content[0].text;

    return res.status(200).json({
      response: content
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      response: '❌ Error del servidor: ' + error.message
    });
  }
}

