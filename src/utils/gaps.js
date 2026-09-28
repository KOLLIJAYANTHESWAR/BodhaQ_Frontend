import { getQuizHistory, setLearningGaps } from './storage.js';

export const recalculateLearningGaps = () => {
  const history = getQuizHistory();
  
  const aggregated = {};
  
  history.forEach(quiz => {
    if (!quiz.topicStats) return;
    
    Object.entries(quiz.topicStats).forEach(([topic, stats]) => {
      if (!aggregated[topic]) {
        aggregated[topic] = {
          topic,
          total: 0,
          correct: 0,
          quizCount: 0,
          sourceType: quiz.sourceType,
          sourceId: quiz.sourceId
        };
      }
      aggregated[topic].total += stats.total;
      aggregated[topic].correct += stats.correct;
      // We count how many quizzes this topic appeared in
      aggregated[topic].quizCount += 1;
    });
  });
  
  const gaps = Object.values(aggregated).map(item => {
    const accuracy = item.total > 0 ? (item.correct / item.total) * 100 : 0;
    
    // Assign status rules: < 60 Needs Practice, 60-79 Improving, >= 80 Learned
    let status = 'needs-practice';
    if (accuracy >= 80) status = 'learned';
    else if (accuracy >= 60) status = 'improving';
    
    return {
      topic: item.topic,
      accuracy,
      status,
      learningState: status,
      source_type: item.sourceType,
      source_id: item.sourceId,
      quiz_count: item.quizCount
    };
  });
  
  // Save to local storage
  setLearningGaps(gaps);
  
  return gaps;
};
