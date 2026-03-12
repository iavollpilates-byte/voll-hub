export const DIMENSION_ORDER = ['Presença Digital', 'Posicionamento', 'Comunicação', 'Networking', 'Mentalidade']

export const QUESTION_DIMENSIONS = {
  1: 'Presença Digital',
  2: 'Posicionamento',
  3: 'Networking',
  4: 'Presença Digital',
  5: 'Comunicação',
  6: 'Posicionamento',
  7: 'Mentalidade',
  8: 'Networking',
  9: 'Comunicação',
  10: 'Mentalidade',
}

export function getLevel(totalScore) {
  if (totalScore <= 20) return { id: 'invisivel', label: 'Invisível', color: '#DC2626', icon: '👤' }
  if (totalScore <= 45) return { id: 'iniciante', label: 'Iniciante', color: '#F59E0B', icon: '🌱' }
  if (totalScore <= 70) return { id: 'em_construcao', label: 'Em Construção', color: '#3B82F6', icon: '🔨' }
  if (totalScore <= 90) return { id: 'posicionado', label: 'Posicionado', color: '#10B981', icon: '🎯' }
  return { id: 'estrategico', label: 'Estratégico', color: '#D97706', icon: '🏆' }
}

export const IMPACT_PHRASES = {
  invisivel: 'Hoje, o mercado não sabe que você existe. A boa notícia: você acabou de dar o primeiro passo ao reconhecer isso.',
  iniciante: 'Você já percebeu que técnica sozinha não basta, mas ainda não começou a agir. O conhecimento sem execução é só potencial desperdiçado.',
  em_construcao: 'Você já está se movimentando. Agora precisa de consistência e foco. A maioria dos seus colegas ainda não chegou aqui.',
  posicionado: 'Você está à frente de 80% dos profissionais da sua geração. Continue. A diferença entre bom e excelente está nos detalhes.',
  estrategico: 'Você já entendeu o jogo. Agora seu desafio é escalar e ajudar outros a chegarem onde você está.',
}

const RECOMMENDATIONS_BY_DIMENSION = {
  'Presença Digital': 'Sua prioridade nº 1: arrume seu Instagram esta semana. Bio profissional, foto que transmita credibilidade e seu primeiro conteúdo sobre a área.',
  'Posicionamento': 'Você precisa responder 3 perguntas: O que eu faço? Pra quem? O que me diferencia? Escreva as respostas em um papel e cole onde você veja todo dia.',
  'Networking': 'Comece esta semana: siga 10 profissionais que você admira, comente 3 conteúdos com contribuições reais e mande 1 mensagem para um professor.',
  'Comunicação': 'Grave um vídeo de 60 segundos explicando algo da sua área. Não precisa publicar. Assista, identifique o que melhorar e grave de novo na semana seguinte.',
  'Mentalidade': 'Leia um livro que não seja técnico nos próximos 30 dias. Sugestões: A Lógica do Consumo (Lindstrom), O Poder do Hábito (Duhigg) ou Comece Pelo Porquê (Sinek).',
}

const GENERIC_RECOMMENDATION = 'Imprima o Plano de Ação de 12 Meses e comece pelo Mês 1 hoje. Não espere se formar. Quem começa antes, erra mais cedo e acerta mais rápido.'

export function computeResult(questions, responses) {
  const dimensionScores = {}
  DIMENSION_ORDER.forEach((d) => { dimensionScores[d] = 0 })
  const responsesByQ = {}
  responses.forEach((r) => { responsesByQ[r.questionId] = r })
  questions.forEach((q) => {
    const dim = q.dimension
    const r = responsesByQ[q.id]
    if (r != null && dim) dimensionScores[dim] = (dimensionScores[dim] || 0) + (r.points || 0)
  })
  const totalScore = Object.values(dimensionScores).reduce((a, b) => a + b, 0)
  const level = getLevel(totalScore)
  const sortedDims = DIMENSION_ORDER.map((d) => ({ name: d, score: dimensionScores[d] || 0 })).sort((a, b) => a.score - b.score)
  const recs = []
  const added = new Set()
  sortedDims.slice(0, 2).forEach(({ name, score }) => {
    if (score < 10 && RECOMMENDATIONS_BY_DIMENSION[name] && !added.has(name)) {
      recs.push(RECOMMENDATIONS_BY_DIMENSION[name])
      added.add(name)
    }
  })
  recs.push(GENERIC_RECOMMENDATION)
  return {
    totalScore,
    level: level.label,
    levelId: level.id,
    color: level.color,
    icon: level.icon,
    dimensionScores,
    recommendations: recs.slice(0, 3),
    impactPhrase: IMPACT_PHRASES[level.id] || '',
  }
}
