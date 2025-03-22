// pages/api/meetings/update-status.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }
  
  const { meetingId, status } = req.body;
  
  if (!meetingId || !status) {
    return res.status(400).json({ message: 'ID da reunião e status são obrigatórios' });
  }
  
  // Validar status
  if (!['scheduled', 'completed', 'missed'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido' });
  }
  
  // Em um projeto real você atualizaria isso no banco de dados
  let meetingUpdated = false;
  
  // Percorrer todas as reuniões de todos os usuários
  for (const userPhone in meetingsDB) {
    const userMeetings = meetingsDB[userPhone];
    const meetingIndex = userMeetings.findIndex(m => m.id === meetingId);
    
    if (meetingIndex !== -1) {
      // Atualizar o status da reunião
      meetingsDB[userPhone][meetingIndex].status = status;
      meetingUpdated = true;
      
      // Se a reunião foi concluída ou perdida, enviar mensagem de acompanhamento
      if (status === 'completed' || status === 'missed') {
        const meeting = meetingsDB[userPhone][meetingIndex];
        sendFollowUpMessage(userPhone, meeting, status);
      }
      
      // Se a reunião foi perdida, reagendá-la automaticamente
      if (status === 'missed') {
        rescheduleAndNotify(userPhone, meetingsDB[userPhone][meetingIndex]);
      }
      
      break;
    }
  }
  
  if (!meetingUpdated) {
    return res.status(404).json({ message: 'Reunião não encontrada' });
  }
  
  return res.status(200).json({ message: 'Status da reunião atualizado com sucesso' });
}

// Função para enviar mensagem de acompanhamento
async function sendFollowUpMessage(userPhone, meeting, status) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID; 
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error('Variáveis de ambiente do Twilio não configuradas');
    return;
  }
  
  // Texto da mensagem
  let messageText;
  if (status === 'completed') {
    messageText = `✅ Parabéns! Você concluiu sua reunião com ${meeting.contactName}. Como foi o resultado? Não se esqueça de registrar os próximos passos!`;
  } else if (status === 'missed') {
    messageText = `❗ Notamos que você não realizou a reunião com ${meeting.contactName}. Reagendamos automaticamente para o próximo dia útil. Precisamos ajudar?`;
  }
  
  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    
    const message = await client.messages.create({
      body: messageText,
      from: `whatsapp:+${twilioPhoneNumber.replace(/\D/g, '')}`,
      to: `whatsapp:+${userPhone.replace(/\D/g, '')}`,
    });
    
    console.log('Mensagem de acompanhamento enviada com sucesso:', message.sid);
  } catch (error) {
    console.error('Erro ao enviar mensagem de acompanhamento:', error);
  }
}

// Função para reagendar reuniões perdidas
function rescheduleAndNotify(userPhone, missedMeeting) {
  // Clonar o objeto da reunião
  const newMeeting = { ...missedMeeting };
  
  // Gerar novo ID
  const { v4: uuidv4 } = require('uuid');
  newMeeting.id = uuidv4();
  
  // Calcular próximo dia útil (ignorando fins de semana)
  const originalDate = new Date(`${missedMeeting.date}T${missedMeeting.time}`);
  const nextDay = new Date(originalDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Avançar caso seja fim de semana
  if (nextDay.getDay() === 0) { // Domingo
    nextDay.setDate(nextDay.getDate() + 1);
  } else if (nextDay.getDay() === 6) { // Sábado
    nextDay.setDate(nextDay.getDate() + 2);
  }
  
  // Atualizar data da nova reunião
  newMeeting.date = nextDay.toISOString().split('T')[0];
  newMeeting.status = 'scheduled';
  newMeeting.rescheduled = true;
  newMeeting.originalMeetingId = missedMeeting.id;
  
  // Adicionar a nova reunião
  meetingsDB[userPhone].push(newMeeting);
  
  console.log(`Reunião reagendada automaticamente: ${missedMeeting.id} -> ${newMeeting.id}`);
}
