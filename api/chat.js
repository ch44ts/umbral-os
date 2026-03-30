export default async function handler(req, res) {
  // Permitir CORS
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
  const apiKey = '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';

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API key not configured',
      response: 'Error: La API key no está disponible.'
    });
  }

  try {
    // Preparar prompt para Haiku
    const systemPrompt = `Eres un asistente inteligente para Umbral OS, un gestor de consultores de proyectos.

CONTEXTO ACTUAL:
- Consultores: ${context.consultants?.map(c => \`\${c.name} (\${c.company})\`)?.join(', ') || 'Ninguno'}
- Tareas pendientes: \${context.tasks?.length || 0}
- Consultor seleccionado: \${context.selectedConsultant?.name || 'Ninguno'}
- Vista actual: \${context.currentView || 'calendario'}

INSTRUCCIONES:
1. Responde en español de forma natural
2. Si el usuario quiere agregar/eliminar datos SIGNIFICATIVOS, proporciona una acción JSON
3. Para cambios simples, responde directamente
4. Sé conciso y útil

RESPONDE SIEMPRE EN JSON:
{
  "response": "Tu respuesta al usuario",
  "action": null
}

SI hay acción a confirmar:
{
  "response": "Descripción de lo que haré",
  "action": {
    "type": "add_task|add_index|delete_index",
    "title": "Título de la acción",
    "description": "Descripción clara",
    "data": { }
  }
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
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
        response: 'Error al conectar con Anthropic.',
        error: error.error?.message,
        action: null
      });
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Intentar parsear como JSON
    let result = { response: content, action: null };
    
    try {
      const parsed = JSON.parse(content);
      result = {
        response: parsed.response || content,
        action: parsed.action || null
      };
    } catch (e) {
      // Si no es JSON válido, mantener como respuesta de texto
      result = { response: content, action: null };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      response: 'Error del servidor. Intenta de nuevo.',
      error: error.message,
      action: null
    });
  }
}
