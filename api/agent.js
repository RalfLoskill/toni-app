export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { agentType } = req.body || {};
  const responses = {
    explanation_agent: 'Ich helfe dir bei der aktuellen Lernreise. Öffne eine Aufgabe, dann kann ich gezielt unterstützen.',
    project_agent: 'Projektstatus: Die Pflanzenbewässerung steht bei 60 %. Aktuell ist der Sensor-Blocker wichtig.',
    collab_agent: 'Vorschlag: Lena übernimmt Sensorik, Julia Dokumentation, Max bearbeitet die nächste Pflichtaufgabe der Lernreise.',
    reflection_agent: 'Reflexion: Was hast du heute verstanden? Was war schwierig? Welche Aufgabe möchtest du als nächstes abschließen?',
    goal_agent: 'Ich prüfe deine Lernreise: Erledige zuerst die offenen Pflichtaufgaben der aktuellen Station.'
  };
  return res.status(200).json({ message: responses[agentType] || 'TONI ist bereit.', ui_updates: {} });
}
