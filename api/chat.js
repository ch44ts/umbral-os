export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, context } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Preparar prompt para Haiku con contexto del programa
    const systemPrompt = `Eres un asistente inteligente para Umbral OS, un gestor de consultores de proyectos.

CONTEXTO ACTUAL:
- Consultores: ${context.consultants.map(c => `${c.name} (${c.company})`).join(', ') || 'Ninguno'}
- Tareas pendientes: ${context.tasks.length}
- Consultor seleccionado: ${context.selectedConsultant?.name || 'Ninguno'}
- Vista actual: ${context.currentView}
- Semana: ${context.currentWeek.start} a ${context.currentWeek.end}

INSTRUCCIONES IMPORTANTES:
1. Entiende naturalmente cualquier indicación del usuario
2. Si el usuario quiere agregar, eliminar o modificar datos SIGNIFICATIVOS, SIEMPRE proporciona una acción con confirmación
3. Las acciones deben incluir: tipo (add_task, add_index, delete_index, etc), título, descripción clara
4. Para cambios simples, responde directamente sin pedir confirmación
5. Sé conciso pero útil
6. Responde en español

TIPOS DE ACCIONES DISPONIBLES:
- add_task: Agregar tarea al calendario
- add_index: Agregar plano al index
- delete_index: Eliminar plano del index
- update_info: Actualizar info del consultor

Responde SIEMPRE en JSON con este formato:
{
  "response": "Tu respuesta al usuario",
  "action": {
    "type": "tipo_de_accion",
    "title": "Título de la acción",
    "description": "Descripción clara de qué se hará",
    "data": { /* datos específicos */ }
  }
}

Si no hay acción, omite el campo "action".`;

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
        response: 'Error al procesar. Intenta de nuevo.',
        error: error.error?.message 
      });
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parsear respuesta JSON de Haiku
    let result = { response: content };
    
    try {
      const parsed = JSON.parse(content);
      result = parsed;
    } catch (e) {
      // Si no es JSON válido, mantener como respuesta de texto
      result = { response: content };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      response: 'Error al conectar con el servidor.',
      error: error.message 
    });
  }
}
