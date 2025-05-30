import { getSystemStatus } from './server/hybrid-image-generator.js';

async function testHybridSystem() {
  console.log('🔍 Проверяем статус гибридной системы изображений...\n');
  
  try {
    const status = await getSystemStatus();
    
    console.log('=== STABLE DIFFUSION WEBUI ===');
    console.log('Статус:', status.stableDiffusion.status);
    console.log('Сообщение:', status.stableDiffusion.message);
    
    if (status.stableDiffusion.instructions) {
      console.log('Инструкции:');
      status.stableDiffusion.instructions.forEach(instruction => {
        console.log(' ', instruction);
      });
    }
    
    console.log('\n=== POLLINATIONS.AI ===');
    console.log('Статус:', status.pollinations.status);
    console.log('Сообщение:', status.pollinations.message);
    
    console.log('\n=== ЛОКАЛЬНЫЙ РЕДАКТОР ===');
    console.log('Статус:', status.localEditor.status);
    console.log('Сообщение:', status.localEditor.message);
    
  } catch (error) {
    console.log('❌ Ошибка проверки статуса:', error.message);
  }
}

testHybridSystem();