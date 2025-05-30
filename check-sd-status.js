import fetch from 'node-fetch';

async function checkSDStatus() {
  try {
    console.log('Проверяем статус Stable Diffusion WebUI...');
    
    const response = await fetch('http://127.0.0.1:7860/sdapi/v1/options', {
      method: 'GET',
      timeout: 3000
    });
    
    if (response.ok) {
      console.log('✅ SD WebUI запущен и готов к работе!');
      console.log('🌐 Доступен по адресу: http://127.0.0.1:7860');
      
      // Проверим доступные модели
      try {
        const modelsResponse = await fetch('http://127.0.0.1:7860/sdapi/v1/sd-models');
        const models = await modelsResponse.json();
        console.log(`📊 Загружено моделей: ${models.length}`);
      } catch (e) {
        console.log('📊 Информация о моделях недоступна');
      }
      
    } else {
      console.log('❌ SD WebUI отвечает с ошибкой:', response.status);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ SD WebUI не запущен');
      console.log('💡 Для запуска выполните:');
      console.log('   cd stable-diffusion-webui');
      console.log('   python launch.py --api --listen --port 7860 --skip-torch-cuda-test --use-cpu all');
    } else {
      console.log('❌ Ошибка подключения:', error.message);
    }
  }
}

checkSDStatus();