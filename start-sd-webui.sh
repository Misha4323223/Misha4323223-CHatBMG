#!/bin/bash

echo "🚀 Запуск Stable Diffusion WebUI с API..."

cd stable-diffusion-webui

# Устанавливаем переменные окружения для оптимизации
export COMMANDLINE_ARGS="--api --listen --port 7860 --xformers --enable-insecure-extension-access --no-gradio-queue --skip-torch-cuda-test --precision full --no-half --use-cpu all --no-download-sd-model"

echo "📋 Аргументы командной строки: $COMMANDLINE_ARGS"

# Запускаем WebUI
python launch.py --api --listen --port 7860 --skip-torch-cuda-test --use-cpu all --no-download-sd-model --no-half --precision full