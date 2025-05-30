/**
 * Тест редактора объектов на изображениях
 */

import { addObjectToImage, changeObjectColor, removeObjectByMask, generateVariation, analyzeObjectEdit } from './server/object-manipulation-editor.js';

async function testObjectEditor() {
    console.log('🧪 Тестирование редактора объектов...');
    
    // Тестовое изображение
    const testImageUrl = 'https://image.pollinations.ai/prompt/beautiful%20landscape%20with%20trees?width=1024&height=1024&nologo=true&enhance=true&seed=123';
    
    console.log('📸 Используем тестовое изображение:', testImageUrl);
    
    // Тест анализа запросов
    const testRequests = [
        'добавь собаку на изображение',
        'удали дерево',
        'измени цвет на красный',
        'сделай более яркое изображение'
    ];
    
    console.log('\n🔍 Тестирование анализа запросов:');
    for (const request of testRequests) {
        const analysis = analyzeObjectEdit(request);
        console.log(`"${request}" → ${analysis.operation} (${analysis.object || analysis.change})`);
    }
    
    // Тест добавления объекта
    console.log('\n➕ Тестирование добавления объекта...');
    try {
        const addResult = await addObjectToImage(testImageUrl, 'красивая бабочка', 'center');
        console.log('Результат добавления:', addResult.success ? '✅ Успех' : '❌ Ошибка');
        if (addResult.success) {
            console.log('Файл сохранен:', addResult.imageUrl);
        }
    } catch (error) {
        console.log('❌ Ошибка добавления:', error.message);
    }
    
    // Тест изменения цвета
    console.log('\n🎨 Тестирование изменения цвета...');
    try {
        const colorResult = await changeObjectColor(testImageUrl, 'сделай более теплым');
        console.log('Результат изменения цвета:', colorResult.success ? '✅ Успех' : '❌ Ошибка');
        if (colorResult.success) {
            console.log('Файл сохранен:', colorResult.imageUrl);
        }
    } catch (error) {
        console.log('❌ Ошибка изменения цвета:', error.message);
    }
}

// Запуск теста
testObjectEditor().catch(console.error);