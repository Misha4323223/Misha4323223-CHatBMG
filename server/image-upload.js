/**
 * Модуль для загрузки и хранения изображений
 * Поддерживает загрузку из URL, base64 и файлов
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const multer = require('multer');
const crypto = require('crypto');

// Настраиваем хранилище для загруженных файлов
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Создаем директорию, если её нет
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Создаем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + extension);
  }
});

// Настраиваем multer для загрузки файлов
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Ограничение размера файла (5 МБ)
  },
  fileFilter: function(req, file, cb) {
    // Проверяем тип файла
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Поддерживаются только изображения форматов JPEG, PNG, GIF и WebP'));
    }
  }
});

/**
 * Сохраняет изображение из base64 строки
 * @param {string} base64String - Строка base64 изображения
 * @returns {Promise<string>} - Путь к сохраненному файлу
 */
async function saveBase64Image(base64String) {
  try {
    // Удаляем префикс data:image/...;base64,
    let data = base64String;
    if (base64String.includes('base64,')) {
      data = base64String.split('base64,')[1];
    }
    
    // Декодируем base64 строку
    const buffer = Buffer.from(data, 'base64');
    
    // Создаем уникальное имя файла
    const filename = 'image-' + Date.now() + '-' + crypto.randomBytes(8).toString('hex') + '.jpg';
    
    // Путь для сохранения
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filepath = path.join(uploadDir, filename);
    
    // Записываем файл
    await fs.promises.writeFile(filepath, buffer);
    
    return '/uploads/' + filename;
  } catch (error) {
    console.error('Ошибка при сохранении base64 изображения:', error);
    throw error;
  }
}

/**
 * Скачивает изображение по URL
 * @param {string} url - URL изображения
 * @returns {Promise<string>} - Путь к сохраненному файлу
 */
async function downloadAndSaveImage(url) {
  try {
    // Проверяем, если URL начинается с /uploads, значит изображение уже загружено
    if (url.startsWith('/uploads/')) {
      return url;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Не удалось загрузить изображение, статус: ${response.status}`);
    }
    
    // Получаем буфер изображения
    const buffer = await response.buffer();
    
    // Создаем уникальное имя файла
    const filename = 'image-' + Date.now() + '-' + crypto.randomBytes(8).toString('hex') + '.jpg';
    
    // Путь для сохранения
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filepath = path.join(uploadDir, filename);
    
    // Записываем файл
    await fs.promises.writeFile(filepath, buffer);
    
    return '/uploads/' + filename;
  } catch (error) {
    console.error('Ошибка при загрузке изображения по URL:', error);
    throw error;
  }
}

// Маршрут для загрузки файла
router.post('/file', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Файл не был загружен'
      });
    }
    
    // Возвращаем путь к загруженному файлу
    const filePath = '/uploads/' + req.file.filename;
    
    res.json({
      success: true,
      imageUrl: filePath,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка при загрузке файла'
    });
  }
});

// Маршрут для загрузки изображения из base64
router.post('/base64', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Изображение не предоставлено'
      });
    }
    
    // Сохраняем изображение
    const filePath = await saveBase64Image(image);
    
    res.json({
      success: true,
      imageUrl: filePath
    });
  } catch (error) {
    console.error('Ошибка при загрузке base64 изображения:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка при загрузке изображения'
    });
  }
});

// Маршрут для загрузки изображения по URL
router.post('/url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL изображения не предоставлен'
      });
    }
    
    // Загружаем и сохраняем изображение
    const filePath = await downloadAndSaveImage(url);
    
    res.json({
      success: true,
      imageUrl: filePath,
      sourceUrl: url
    });
  } catch (error) {
    console.error('Ошибка при загрузке изображения по URL:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка при загрузке изображения'
    });
  }
});

module.exports = router;
module.exports.saveBase64Image = saveBase64Image;
module.exports.downloadAndSaveImage = downloadAndSaveImage;