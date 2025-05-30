import { sdClient } from './server/sd-webui-client.js';

async function monitorSDWebUI() {
    console.log('🔍 Мониторинг статуса Stable Diffusion WebUI...\n');
    
    let attempts = 0;
    const maxAttempts = 60; // 5 минут проверки
    
    const checkStatus = async () => {
        attempts++;
        const isAvailable = await sdClient.checkAvailability();
        
        if (isAvailable) {
            console.log('✅ SD WebUI запущен и готов к работе!');
            console.log('🌐 API доступен на http://127.0.0.1:7860');
            
            // Получим информацию о доступных моделях
            const modelsInfo = await sdClient.getModels();
            if (modelsInfo.success) {
                console.log(`📊 Доступно моделей: ${modelsInfo.models.length}`);
            }
            
            clearInterval(monitor);
            return;
        }
        
        console.log(`⏳ Попытка ${attempts}/${maxAttempts} - SD WebUI еще загружается...`);
        
        if (attempts >= maxAttempts) {
            console.log('❌ SD WebUI не запустился за отведенное время');
            console.log('💡 Возможные причины:');
            console.log('   - Загрузка зависимостей занимает больше времени');
            console.log('   - Недостаточно ресурсов для запуска');
            console.log('   - Ошибка в процессе установки');
            clearInterval(monitor);
        }
    };
    
    // Проверяем каждые 5 секунд
    const monitor = setInterval(checkStatus, 5000);
    
    // Первая проверка сразу
    await checkStatus();
}

// Также проверим, запущен ли процесс SD WebUI
import { exec } from 'child_process';

function checkSDProcess() {
    exec('ps aux | grep launch.py | grep -v grep', (error, stdout, stderr) => {
        if (stdout.trim()) {
            console.log('🔧 Процесс SD WebUI обнаружен:');
            console.log(stdout.trim());
        } else {
            console.log('❌ Процесс SD WebUI не найден');
            console.log('💡 Запустите SD WebUI командой:');
            console.log('   cd stable-diffusion-webui && python launch.py --api --listen --port 7860');
        }
    });
}

console.log('🚀 Проверяем статус Stable Diffusion WebUI...\n');
checkSDProcess();
setTimeout(() => monitorSDWebUI(), 2000);