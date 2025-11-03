const express = require('express');
const router = express.Router();

// Импортируем хранилище лидов из leads.cjs
const leadsModule = require('./leads.cjs');

// Обновить статус отправки лида
router.post('/update-sent', (req, res) => {
  try {
    const { leadId, sent } = req.body;
    
    console.log(`🔍 Обновляем статус лида: leadId=${leadId}, sent=${sent}`);
    
    // Получаем доступ к массиву лидов
    const storedLeads = leadsModule.getStoredLeads();
    console.log(`📊 Всего лидов в хранилище: ${storedLeads.length}`);
    
    if (leadId === undefined || sent === undefined) {
      return res.status(400).json({
        success: false,
        error: 'leadId и sent обязательны'
      });
    }
    
    // Ищем лид по индексу или ID
    let leadIndex = -1;
    if (typeof leadId === 'number') {
      leadIndex = leadId;
    } else {
      // Ищем по ID если это строка
      leadIndex = storedLeads.findIndex(lead => lead.id === leadId);
    }
    
    console.log(`🔍 Найден индекс лида: ${leadIndex}`);
    
    if (leadIndex >= 0 && leadIndex < storedLeads.length) {
      const oldSent = storedLeads[leadIndex].sent;
      storedLeads[leadIndex].sent = sent;
      
      console.log(`✅ Статус лида обновлен: ${oldSent} -> ${sent}`);
      console.log(`📋 Обновленный лид:`, {
        name: storedLeads[leadIndex].name,
        sent: storedLeads[leadIndex].sent
      });
      
      res.json({
        success: true,
        message: 'Статус лида обновлен',
        leadIndex: leadIndex,
        oldSent: oldSent,
        newSent: sent
      });
    } else {
      console.log(`❌ Лид не найден: leadId=${leadId}, leadIndex=${leadIndex}`);
      res.status(404).json({
        success: false,
        error: 'Лид не найден',
        leadId: leadId,
        leadIndex: leadIndex,
        totalLeads: storedLeads.length
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при обновлении статуса лида:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: error.message
    });
  }
});

module.exports = router;