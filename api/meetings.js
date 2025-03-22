// pages/api/meetings.js
import { v4 as uuidv4 } from 'uuid';

// Para um projeto real, você usaria um banco de dados como MongoDB ou PostgreSQL
// Este é um exemplo simples usando um objeto para armazenar as reuniões em memória
let meetingsDB = {};

export default async function handler(req, res) {
  // GET - Recuperar reuniões de um usuário
  if (req.method === 'GET') {
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(400).json({ message: 'Telefone do usuário não fornecido' });
    }
    
    const userMeetings = meetingsDB[phone] || [];
    return res.status(200).json({ meetings: userMeetings });
  }
  
  // POST - Criar uma nova reunião
  if (req.method === 'POST') {
    const { userPhone, meeting } = req.body;
    
    if (!userPhone || !meeting) {
      return res.status(400).json({ message: 'Dados incompletos para criar reunião' });
    }
    
    // Gerar ID para a reunião
    const newMeeting = {
      ...meeting,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    
    // Inicializar array de reuniões para o usuário se não existir
    if (!meetingsDB[userPhone]) {
      meetingsDB[userPhone] = [];
    }
    
    // Adicionar a nova reunião
    meetingsDB[userPhone].push(newMeeting);
    
    // Agendar o envio de lembrete para 24 horas antes da reunião
    const meetingDate = new Date(`${meeting.date}T${meeting.time}`);
    const reminderTime = new Date(meetingDate.getTime() - 24 * 60 * 60 * 1000); // 24 horas antes
    
    // Verificar se a data do lembrete já não passou
    if (reminderTime > new Date()) {
      // Em um ambiente de produção, você usaria um job scheduler como Bull ou Agenda
      setTimeout(() => {
        sendReminderMessage(userPhone, meeting.contactName, meetingDate);
      }, reminderTime.getTime() - Date.now());
    }
    
    // Também agendar um lembrete para 1 hora antes
    const shortReminderTime = new Date(meetingDate.getTime() - 60 * 60 * 1000); // 1 hora antes
    
    if (shortReminderTime > new Date()) {
      setTimeout(() => {
        sendReminderMessage(userPhone, meeting.contactName, meetingDate, true);
      }, shortReminderTime.getTime() - Date.now());
    }
    
    return res.status(201).json({ 
      message: 'Reunião criada com sucesso', 
      meeting: newMeeting 
    });
  }
  
  // Método não suportado
  return res.status(405).json({ message: 'Método não permitido' });
}

// Função para enviar mensagem de lembrete via Twilio
async function sendReminderMessage(userPhone, contactName, meetingDate, isShortReminder = false) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID; 
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error('Variáveis de ambiente do Twilio não configuradas');
    return;
  }
  
  // Formatar a data e hora da reunião para exibição
  const formattedDate = meetingDate.toLocaleDateString('pt-BR');
  const formattedTime = meetingDate.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Texto da mensagem
  let messageText;
  if (isShortReminder) {
    messageText = `⏰ LEMBRETE: Sua reunião com ${contactName} começa em 1 hora! (${formattedTime}) Prepare-se!`;
  } else {
    messageText = `📅 Lembrete do Sailor: Você tem uma reunião agendada com ${contactName} amanhã às ${formattedTime}. Não se esqueça de se preparar!`;
  }
  
  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    
    const message = await client.messages.create({
      body: messageText,
      from: `whatsapp:+${twilioPhoneNumber.replace(/\D/g, '')}`,
      to: `whatsapp:+${userPhone.replace(/\D/g, '')}`,
    });
    
    console.log('Lembrete enviado com sucesso:', message.sid);
  } catch (error) {
    console.error('Erro ao enviar lembrete:', error);
  }
}
